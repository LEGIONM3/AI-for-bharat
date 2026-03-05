"""
Agent Tool Endpoints — exposed as Nova Pro agent tool actions.
Each endpoint acts as a tool for the Nova Pro-powered agent.
"""
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from utils.auth import get_current_user
from services.evaluation import evaluation_service
from services.learning import learning_service
from services.aws import invoke_model, invoke_model_structured
from services.rag.pipeline import rag_pipeline
from services.vector_store import vector_store_manager
from utils.helpers import truncate_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tools", tags=["Agent Tools"])


# ─── Request Models ───────────────────────────────────────────────────────────

class RepoToolRequest(BaseModel):
    repo_id: str
    query: Optional[str] = None

class QuestionToolRequest(BaseModel):
    repo_id: str
    topic: Optional[str] = None
    num_questions: Optional[int] = 5

class EvaluateToolRequest(BaseModel):
    question: str
    answer: str
    repo_id: Optional[str] = None
    context: Optional[str] = None

class SkillGapRequest(BaseModel):
    repo_id: str
    user_id: str

class LearningModuleRequest(BaseModel):
    topic: str
    difficulty: Optional[str] = "intermediate"
    repo_id: Optional[str] = None

class QuizRequest(BaseModel):
    topic: str
    difficulty: Optional[str] = "intermediate"
    num_questions: Optional[int] = 5
    repo_id: Optional[str] = None

class ContributionRequest(BaseModel):
    repo_id: str
    user_id: str


# ─── Tool Endpoints ───────────────────────────────────────────────────────────

@router.post("/repo_intelligence")
async def repo_intelligence(body: RepoToolRequest, current_user: dict = Depends(get_current_user)):
    """Tool: Generate repository architecture analysis."""
    from database import get_dynamodb_resource
    from config import settings

    db = get_dynamodb_resource()
    table = db.Table(settings.DYNAMODB_REPO_INTELLIGENCE_TABLE)
    resp = table.get_item(Key={"repo_id": body.repo_id})
    intel = resp.get("Item")
    if intel:
        return {"tool": "repo_intelligence", "result": intel}

    # Generate on demand
    context = rag_pipeline.get_relevant_context(body.repo_id, "architecture overview", top_k=8)
    result = invoke_model_structured(
        prompt=f"Analyze this repository architecture:\n{truncate_text(context, 4000)}",
        system_prompt="You are a software architect. Analyze and return structured intelligence.",
        schema_description='{"overview":"...","architecture_summary":"...","complexity_score":0.0,"recommendations":[]}',
    )
    return {"tool": "repo_intelligence", "result": result}


@router.post("/generate_architecture_diagram")
async def generate_architecture_diagram(body: RepoToolRequest, current_user: dict = Depends(get_current_user)):
    """Tool: Produce Mermaid architecture diagram from repo code."""
    context = rag_pipeline.get_relevant_context(body.repo_id, "module structure components services", top_k=10)
    result = invoke_model(
        prompt=f"""Generate a Mermaid architecture diagram for this codebase.
        
CODE STRUCTURE:
{truncate_text(context, 4000)}

Return ONLY a valid Mermaid diagram starting with 'graph TD' or 'graph LR'.
Group related components. Show data flow between major modules.""",
        system_prompt="You are a software architect. Return only valid Mermaid diagram syntax.",
    )
    return {"tool": "generate_architecture_diagram", "mermaid": result}


@router.post("/analyze_repo_complexity")
async def analyze_repo_complexity(body: RepoToolRequest, current_user: dict = Depends(get_current_user)):
    """Tool: Compute architecture complexity score."""
    context = rag_pipeline.get_relevant_context(body.repo_id, "complexity cyclomatic coupling cohesion", top_k=8)
    result = invoke_model_structured(
        prompt=f"Analyze the complexity of this codebase:\n{truncate_text(context, 4000)}",
        system_prompt="You are a software quality expert.",
        schema_description='{"complexity_score":0.0,"cyclomatic_complexity":"...","coupling":"low|medium|high","cohesion":"low|medium|high","assessment":"...","hotspots":[]}',
    )
    return {"tool": "analyze_repo_complexity", "result": result}


@router.post("/analyze_repo_risks")
async def analyze_repo_risks(body: RepoToolRequest, current_user: dict = Depends(get_current_user)):
    """Tool: Detect vulnerabilities and bad practices."""
    context = rag_pipeline.get_relevant_context(body.repo_id, "security vulnerability injection authentication", top_k=8)
    result = invoke_model_structured(
        prompt=f"Identify security risks and bad practices in this code:\n{truncate_text(context, 4000)}",
        system_prompt="You are a security engineer specializing in code vulnerability analysis.",
        schema_description='{"risk_level":"low|medium|high|critical","vulnerabilities":[],"bad_practices":[],"recommendations":[]}',
    )
    return {"tool": "analyze_repo_risks", "result": result}


@router.post("/repo_chat")
async def repo_chat_tool(body: RepoToolRequest, current_user: dict = Depends(get_current_user)):
    """Tool: RAG-based repository Q&A."""
    if not body.query:
        raise HTTPException(status_code=400, detail="query is required")
    context = rag_pipeline.get_relevant_context(body.repo_id, body.query, top_k=5)
    answer = invoke_model(
        prompt=f"CONTEXT:\n{context}\n\nQUESTION: {body.query}",
        system_prompt="You are an expert developer assistant. Answer based only on the provided code context.",
    )
    return {"tool": "repo_chat", "answer": answer, "context_used": True}


@router.post("/generate_viva_questions")
async def generate_viva_questions_tool(body: QuestionToolRequest, current_user: dict = Depends(get_current_user)):
    """Tool: Generate technical interview questions from repo."""
    questions = evaluation_service.generate_viva_questions(
        repo_id=body.repo_id,
        topic=body.topic,
        num_questions=body.num_questions or 5,
    )
    return {"tool": "generate_viva_questions", "questions": questions}


@router.post("/evaluate_answer")
async def evaluate_answer_tool(body: EvaluateToolRequest, current_user: dict = Depends(get_current_user)):
    """Tool: Evaluate developer answers."""
    evaluation = evaluation_service.evaluate_answer(
        question=body.question,
        answer=body.answer,
        context=body.context,
        repo_id=body.repo_id,
    )
    return {"tool": "evaluate_answer", "evaluation": evaluation}


@router.post("/detect_skill_gaps")
async def detect_skill_gaps_tool(body: SkillGapRequest, current_user: dict = Depends(get_current_user)):
    """Tool: Compare repo requirements vs developer knowledge."""
    gaps = evaluation_service.detect_skill_gaps(
        repo_id=body.repo_id,
        user_id=body.user_id,
    )
    return {"tool": "detect_skill_gaps", "skill_gaps": gaps}


@router.post("/generate_learning_module")
async def generate_learning_module_tool(body: LearningModuleRequest, current_user: dict = Depends(get_current_user)):
    """Tool: Generate lesson content."""
    module = learning_service.generate_learning_module(
        topic=body.topic,
        difficulty=body.difficulty or "intermediate",
        repo_id=body.repo_id,
    )
    return {"tool": "generate_learning_module", "module": module}


@router.post("/generate_quiz")
async def generate_quiz_tool(body: QuizRequest, current_user: dict = Depends(get_current_user)):
    """Tool: Generate assessment questions."""
    quiz = evaluation_service.generate_quiz(
        topic=body.topic,
        difficulty=body.difficulty or "intermediate",
        num_questions=body.num_questions or 5,
        repo_id=body.repo_id,
    )
    return {"tool": "generate_quiz", "quiz": quiz}


@router.post("/generate_contribution_recommendations")
async def generate_contribution_recommendations_tool(
    body: ContributionRequest,
    current_user: dict = Depends(get_current_user),
):
    """Tool: Suggest contribution opportunities."""
    recommendations = learning_service.generate_contribution_recommendations(
        repo_id=body.repo_id,
        user_id=body.user_id,
    )
    return {"tool": "generate_contribution_recommendations", "recommendations": recommendations}
