"""
AWS Bedrock service — Amazon Nova Pro AI reasoning.
"""
import json
import logging
from typing import Optional, List, Dict, Any

import boto3
from botocore.exceptions import ClientError, BotoCoreError

from config import settings

logger = logging.getLogger(__name__)


class BedrockService:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = boto3.client(
                "bedrock-runtime",
                region_name=settings.BEDROCK_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
        return self._client

    def invoke_nova(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        conversation_history: Optional[List[Dict]] = None,
    ) -> str:
        """
        Invoke Amazon Nova Pro via Bedrock using the converse API.
        """
        messages = []

        if conversation_history:
            # Need to convert History text to Nova format if it's not already
            for msg in conversation_history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if isinstance(content, str):
                    messages.append({"role": role, "content": [{"text": content}]})
                else:
                    messages.append(msg)

        messages.append({"role": "user", "content": [{"text": prompt}]})

        body = {
            "messages": messages,
            "inferenceConfig": {
                "maxTokens": max_tokens,
                "temperature": temperature,
            }
        }

        if system_prompt:
            body["system"] = [{"text": system_prompt}]

        try:
            response = self.client.converse(
                modelId=settings.BEDROCK_MODEL_ID,
                messages=body["messages"],
                system=body.get("system", []),
                inferenceConfig=body["inferenceConfig"],
            )
            result = response
            # For Nova, the output text is usually in output.message.content[0].text
            if "output" in result and "message" in result["output"]:
                return result["output"]["message"]["content"][0]["text"]
            # Fallback if structure varies
            return str(result)
        except (ClientError, BotoCoreError) as e:
            logger.error(f"Bedrock invocation failed: {e}")
            raise RuntimeError(f"AI service unavailable: {e}")

    def invoke_nova_structured(
        self,
        prompt: str,
        system_prompt: str,
        schema_description: str,
        max_tokens: int = 4096,
    ) -> Dict[str, Any]:
        """
        Invoke Amazon Nova Pro and parse a structured JSON response.
        """
        full_system = (
            f"{system_prompt}\n\n"
            f"You MUST respond with valid JSON only. Schema: {schema_description}\n"
            "Do not include any text outside the JSON object."
        )
        raw = self.invoke_nova(prompt, system_prompt=full_system, max_tokens=max_tokens)

        # Strip markdown code fences if present
        clean = raw.strip()
        if clean.startswith("```"):
            lines = clean.split("\n")
            clean = "\n".join(lines[1:-1]) if len(lines) > 2 else clean

        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            logger.warning("Nova Pro did not return valid JSON, wrapping in text field.")
            return {"text": raw, "raw": True}


bedrock_service = BedrockService()
