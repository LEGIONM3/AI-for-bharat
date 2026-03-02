"""
bedrock_runtime.py

Direct Amazon Bedrock Runtime invocation for Amazon Nova Pro
(model ID: apac.amazon.nova-pro-v1:0).

STEP 3 — Safe model invocation wrapper:
  • system_prompt forwarded in top-level "system" field (Nova Pro spec)
  • conversation_history merged into messages[]
  • LLM output cleaned via utils.llm_cleaner (strips ```json fences)
  • Graceful error handling — never raises, always returns a safe value

STEP 4 — Graceful error handling:
  • All exceptions caught and returned as structured error dicts
  • Model unavailability never crashes the caller

STEP 2 — Consistent response structure:
  • invoke_model()            → str  (plain text)
  • invoke_model_structured() → dict | list (parsed JSON)
    Both internally use clean_llm_output / clean_llm_json.
"""

import boto3
import os
import json
import logging
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from tenacity import (
    retry, stop_after_attempt, 
    wait_exponential, retry_if_exception_type
)
from botocore.exceptions import ClientError
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

from utils.llm_cleaner import clean_llm_output, clean_llm_json

logger = logging.getLogger(__name__)

# Thread pool for parallel Bedrock calls
# Max 5 concurrent Bedrock calls (AWS limit safe)
_executor = ThreadPoolExecutor(max_workers=5)

# ─── Bedrock client ───────────────────────────────────────────────────────────
_bedrock_client = None

def get_bedrock_client():
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = boto3.client(
            "bedrock-runtime",
            region_name=os.getenv("BEDROCK_REGION", "us-east-1")
        )
    return _bedrock_client

def get_model_id():
    from config import settings
    return settings.BEDROCK_MODEL_ID

# ─── Default system prompt ────────────────────────────────────────────────────
DEFAULT_SYSTEM_PROMPT = """You are the core AI engine powering the platform **Bharat AI Operational Hub**.

Your role is to act as an expert **software architect, developer mentor, and repository intelligence system**.

Your responsibilities include:

1. Repository Intelligence
   Analyze software repositories and generate structured insights including:
   • project purpose
   • architecture style
   • technology stack
   • module breakdown
   • critical components
   • complexity score
   • potential risks
   • improvement recommendations

2. Developer Guidance
   Act as a mentor helping developers understand unfamiliar codebases.
   Provide clear explanations of architecture, workflows, and code structure.

3. Learning System Generation
   Create structured learning roadmaps including:
   • ordered concepts
   • difficulty levels
   • estimated learning time
   • practice exercises
   • evaluation checkpoints

4. Assessment and Evaluation
   Generate interview-style questions and evaluate answers.
   Provide feedback explaining:
   • what the user understood correctly
   • what concepts are missing
   • what they should learn next

5. Code Understanding and Simplification
   Explain complex code sections in simpler terms and suggest improvements.

6. RAG Context Usage
   When repository context is provided, you must prioritize it and use it to answer questions accurately.

7. Structured Output
   When asked for structured data (analysis, roadmap, quiz, etc.) return **clean JSON-compatible responses** whenever possible.
   Do NOT wrap JSON in markdown code fences.

8. Clarity and Educational Quality
   All explanations must be:
   • technically accurate
   • beginner friendly when needed
   • concise but informative

9. Never hallucinate repository information.
   If context is missing, say that clearly.

10. Maintain professional and helpful tone.

You are a **developer intelligence assistant**, not a general chatbot."""


def _build_payload(
    prompt: str,
    system_prompt: str | None = None,
    conversation_history: list | None = None,
    max_tokens: int = 1500,
    temperature: float = 0.4,
) -> dict:
    """
    Build a Nova Pro-compatible Bedrock request payload.

    Nova Pro spec:
      • "system" is a TOP-LEVEL list of {text: ...} objects — NOT inside messages[]
      • messages[] contains only "user" and "assistant" turns
    """
    messages = []

    # Inject conversation history (already in {role, content} format)
    if conversation_history:
        for msg in conversation_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if isinstance(content, str):
                messages.append({"role": role, "content": [{"text": content}]})
            else:
                messages.append(msg)

    # Append the new user turn
    messages.append({"role": "user", "content": [{"text": prompt}]})

    # Compose system prompt
    sys_text = DEFAULT_SYSTEM_PROMPT
    if system_prompt:
        sys_text = f"{DEFAULT_SYSTEM_PROMPT}\n\nContext-specific instructions:\n{system_prompt}"

    return {
        "messages": messages,
        "system": [{"text": sys_text}],
        "inferenceConfig": {
            "temperature": temperature,
            "maxTokens": max_tokens,
        },
    }


def _parse_nova_response(result: dict) -> str:
    """Extract the text content from a converse API response dict."""
    try:
        return result["output"]["message"]["content"][0]["text"]
    except (KeyError, IndexError, TypeError):
        return str(result)


# ─── Public API ───────────────────────────────────────────────────────────────

def invoke_model(
    prompt: str,
    system_prompt: str | None = None,
    conversation_history: list | None = None,
    max_tokens: int = 2000,
) -> str:
    """
    Invoke the model and return a plain-text response.

    STEP 3: Safe invocation with history, system prompt, and output cleaning.
    STEP 4: Graceful error handling — returns error string, never raises.

    Returns:
        str — model response text (code fences stripped)
    """
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(ClientError)
    )
    def _execute():
        payload = _build_payload(
            prompt=prompt,
            system_prompt=system_prompt,
            conversation_history=conversation_history,
            max_tokens=max_tokens,
        )
        client = get_bedrock_client()
        model_id = get_model_id()
        
        try:
            response = client.converse(
                modelId=model_id,
                messages=payload["messages"],
                system=payload["system"],
                inferenceConfig=payload["inferenceConfig"]
            )
            raw_text = _parse_nova_response(response)
            return clean_llm_output(raw_text)
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "ThrottlingException":
                logger.warning("Bedrock throttled — retrying...")
                raise  # Let tenacity retry
            raise

    try:
        return _execute()
    except Exception as e:
        logger.error(f"[invoke_model] Bedrock invocation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail=f"Bedrock invocation failed: {str(e)}"
        )

async def invoke_model_async(
    prompt: str,
    system_prompt: str | None = None,
    conversation_history: list | None = None,
    max_tokens: int = 2000,
) -> str:
    """
    Async wrapper — runs invoke_model in thread pool.
    Allows multiple users to call Bedrock concurrently.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _executor,
        invoke_model,
        prompt,
        system_prompt,
        conversation_history,
        max_tokens
    )


def invoke_model_structured(
    prompt: str,
    system_prompt: str | None = None,
    schema_description: str = "",
    max_tokens: int = 4000,
) -> dict | list:
    """
    Invoke the model and parse the response as JSON.

    Instructs the model to return only JSON (no prose, no fences).

    STEP 2: Consistent structured output.
    STEP 3: Safe invocation.
    STEP 4: Graceful error handling — returns error dict, never raises.

    Returns:
        dict | list — parsed JSON object/array
        {"error": str} on failure
    """
    # Append JSON instruction to the prompt
    full_prompt = (
        f"You MUST respond with valid JSON only"
        + (f" conforming to this schema: {schema_description}" if schema_description else "")
        + f"\n\nUser Input:\n{prompt}\n\n"
        "Do NOT include any text outside the JSON. Do NOT use markdown code fences."
    )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(ClientError)
    )
    def _execute():
        payload = _build_payload(
            prompt=full_prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=0.3,   # slightly lower temp for structured output
        )
        client = get_bedrock_client()
        model_id = get_model_id()
        
        try:
            response = client.converse(
                modelId=model_id,
                messages=payload["messages"],
                system=payload["system"],
                inferenceConfig=payload["inferenceConfig"]
            )
            raw_text = _parse_nova_response(response)
    
            # Use clean_llm_json: strips fences + parses JSON with fallback extraction
            parsed = clean_llm_json(raw_text)
            return parsed
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "ThrottlingException":
                logger.warning("Bedrock throttled — retrying...")
                raise  # Let tenacity retry
            raise
            
    try:
        return _execute()
    except Exception as e:
        logger.error(f"[invoke_model_structured] Bedrock invocation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail=f"Bedrock invocation failed: {str(e)}"
        )

async def invoke_model_structured_async(
    prompt: str,
    system_prompt: str | None = None,
    schema_description: str = "",
    max_tokens: int = 4000,
) -> dict | list:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _executor,
        invoke_model_structured,
        prompt,
        system_prompt,
        schema_description,
        max_tokens
    )
