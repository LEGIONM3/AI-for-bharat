"""
Learning API routes — roadmaps, modules, progress.

Endpoints in this file:
  POST /api/learning/roadmap         — generate personalized roadmap
  GET  /api/learning/roadmaps        — list user roadmaps
  GET  /api/learning/roadmap/{id}    — single roadmap
  POST /api/learning/concept-complete — legacy concept completion
  GET  /api/learning/progress        — user progress summary
  POST /api/learning/module          — learning module (legacy)
  POST /api/learning/concept         — full concept module (5-step flow)
  POST /api/learning/concept-chat    — AI tutor Q&A
  POST /api/learning/concept-progress — save step progress + unlock next
  POST /api/learning/skill-gap       — evaluate skill mastery
  GET  /api/learning/available-levels/{topic} — unlock status per difficulty
"""
import logging
from fastapi import APIRouter, Depends, HTTPException

from models.schemas import (
    RoadmapRequest, ConceptCompleteRequest,
    LearningModuleRequest, SuccessResponse,
    ConceptRequest, ConceptChatRequest,
    ConceptProgressRequest, SkillGapRequest,
    PresetPlanRequest
)
import boto3
from config import settings
from utils.auth import get_current_user
from controllers.learning_controller import learning_controller

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/learning", tags=["Learning"])


@router.post("/roadmap")
async def generate_roadmap(
    body: RoadmapRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a personalized learning roadmap.

    Returns roadmap fields at the TOP LEVEL (not wrapped in { success, roadmap })
    so the frontend can read data.roadmap_id and data.phases directly.
    """
    user_id = current_user["sub"]
    try:
        roadmap = learning_controller.generate_roadmap(
            goal=body.goal,
            stack=body.stack,
            timeline=body.timeline,
            current_level=body.current_level or "beginner",
            user_id=user_id,
        )
        # Return flat — frontend reads data.roadmap_id and data.phases
        if isinstance(roadmap, dict):
            return roadmap
        # If service returns a list of phases directly, wrap minimally
        return {"roadmap_id": None, "phases": roadmap}
    except Exception as e:
        logger.error(f"Roadmap generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/roadmaps")
async def get_roadmaps(current_user: dict = Depends(get_current_user)):
    """Get all roadmaps for the current user."""
    user_id = current_user["sub"]
    roadmaps = learning_controller.get_user_roadmaps(user_id)
    return roadmaps


@router.get("/roadmap/{roadmap_id}")
async def get_roadmap(
    roadmap_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a specific roadmap by ID."""
    roadmap = learning_controller.get_roadmap(roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return roadmap


@router.post("/concept-complete")
async def complete_concept(
    body: ConceptCompleteRequest,
    current_user: dict = Depends(get_current_user),
):
    """Mark a learning concept as completed. Requires both roadmap_id and concept_id."""
    user_id = current_user["sub"]
    success = learning_controller.complete_concept(
        body.roadmap_id, body.concept_id, user_id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Roadmap or concept not found")
    return {"success": True, "message": "Concept marked as completed"}


@router.get("/progress")
async def get_progress(current_user: dict = Depends(get_current_user)):
    """Get the user's overall learning progress."""
    user_id = current_user["sub"]
    try:
        roadmaps = learning_controller.get_user_roadmaps(user_id)
        total_roadmaps = len(roadmaps)
        completed_roadmaps = sum(1 for r in roadmaps if r.get("status") == "completed")
        total_concepts = 0
        completed_concepts = 0
        for r in roadmaps:
            for phase in r.get("phases", []):
                concepts = phase.get("concepts", [])
                total_concepts += len(concepts)
                completed_concepts += sum(1 for c in concepts if c.get("completed"))
        return {
            "total_roadmaps": total_roadmaps,
            "completed_roadmaps": completed_roadmaps,
            "total_concepts": total_concepts,
            "completed_concepts": completed_concepts,
            "overall_progress": int((completed_concepts / total_concepts) * 100) if total_concepts > 0 else 0
        }
    except Exception as e:
        logger.error(f"Progress fetch failed: {e}")
        return {"total_roadmaps": 0, "completed_concepts": 0}


@router.post("/module")
async def generate_module(
    body: LearningModuleRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a learning module on a specific topic.

    Accepts BOTH formats:
      Backend-native:  { "topic": "React Hooks", "difficulty": "intermediate" }
      Frontend-legacy: { "lesson_id": "react-hooks", "context": "general" }

    Returns module fields at the TOP LEVEL (not wrapped in { success, module })
    so the frontend can read data.title, data.content directly.
    """
    try:
        topic = body.effective_topic()
        module = learning_controller.generate_module(
            topic=topic,
            difficulty=body.difficulty or "intermediate",
            repo_id=body.repo_id,
        )
        # Return flat — frontend reads data.title, data.content, etc. directly
        if isinstance(module, dict):
            return module
        return {"title": topic, "content": str(module)}
    except Exception as e:
        logger.error(f"Module generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/concept")
async def get_concept(
    body: ConceptRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Get or generate a full concept module for the 5-step learning flow.
    Cached in DynamoDB. Returns sections, code_examples, quiz_questions,
    viva_questions, integrity_test_questions, and skill_areas.
    """
    try:
        module = learning_controller.get_concept_module(
            topic=body.topic,
            roadmap_id=body.roadmap_id,
            concept_id=body.concept_id,
            difficulty=body.difficulty or "beginner"
        )
        return module
    except Exception as e:
        logger.error(f"Concept module generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/concept-chat")
async def concept_chat(
    body: ConceptChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    AI tutor Q&A for a specific concept.
    Uses the concept topic and content as context.
    Returns: { "response": "answer text" }
    """
    try:
        response = learning_controller.concept_chat(
            topic=body.topic,
            concept_content=body.concept_content or "",
            question=body.question
        )
        return response
    except Exception as e:
        logger.error(f"Concept chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/concept-progress")
async def concept_progress(
    body: ConceptProgressRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Save concept progress, calculate roadmap % and unlock next concept.
    Returns: { success, next_concept_id, roadmap_progress, phase_complete, roadmap_complete }
    """
    try:
        result = learning_controller.save_concept_progress(
            roadmap_id=body.roadmap_id,
            concept_id=body.concept_id,
            phase_id=body.phase_id,
            step=body.step,
            score=body.score,
            completed=body.completed,
            user_id=current_user["sub"]
        )
        return result
    except Exception as e:
        logger.error(f"Concept progress failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/skill-gap")
async def skill_gap(
    body: SkillGapRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Evaluate skill mastery from quiz + viva scores.
    Returns skill_gaps[], overall_score, strategic_directives, passed.
    """
    try:
        result = learning_controller.evaluate_skill_gap(
            topic=body.topic,
            skill_areas=body.skill_areas,
            quiz_score=body.quiz_score,
            viva_score=body.viva_score,
            quiz_answers=body.quiz_answers,
            viva_answers=body.viva_answers
        )
        return result
    except Exception as e:
        logger.error(f"Skill gap calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/available-levels/{topic}")
async def available_levels(
    topic: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Check which difficulty levels are unlocked for a topic.
    Returns: { topic, completed_levels, available_levels, next_level, locked_levels }
    """
    try:
        result = learning_controller.get_available_levels(
            topic=topic,
            user_id=current_user["sub"]
        )
        return result
    except Exception as e:
        logger.error(f"Failed to fetch available levels: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preset-plans")
async def get_preset_plans(topic: str = None, difficulty: str = None):
    plans = learning_controller.get_preset_plans(topic, difficulty)
    return {"plans": plans}

@router.post("/request-plan")
async def request_plan(body: PresetPlanRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    roadmap = learning_controller.request_preset_plan(body.plan_id, user_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Preset plan not found")
    return {"roadmap_id": roadmap["id"], "status": "active", "quiz_status": "complete", "message": "Plan ready!"}

@router.get("/quiz-status/{roadmap_id}")
async def get_quiz_status(roadmap_id: str):
    return learning_controller.get_quiz_status(roadmap_id)
