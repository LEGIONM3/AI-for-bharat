"""
Pydantic models for request/response validation.

Changelog (integration alignment):
  - AssessmentStartRequest: added repo_id (optional) so quiz can be repo-contextual.
  - LearningModuleRequest:  added lesson_id + context aliases accepted alongside topic.
  - ConceptCompleteRequest: unchanged (roadmap_id required — frontend must supply it).
  - RepoUploadRequest:      unchanged (JSON body; multipart handled in route layer).
  - Added RepoStatusResponse for the new GET /repos/status/{repo_id} endpoint.
  - Added SignupRequest alias (same fields as RegisterRequest).
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ─── Auth Models ─────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    language: Optional[str] = "en"


# Alias accepted at POST /api/auth/signup — same schema as RegisterRequest
class SignupRequest(RegisterRequest):
    pass


class LoginRequest(BaseModel):
    identifier: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    rank: Optional[str] = "Novice"


class ProfileUpdateRequest(BaseModel):
    username: Optional[str] = None
    language: Optional[str] = None
    email: Optional[EmailStr] = None


# ─── Repository Models ────────────────────────────────────────────────────────

class RepoUploadRequest(BaseModel):
    """JSON body for POST /api/repos/upload (multipart path handled separately)."""
    repo_url: str
    repo_name: Optional[str] = None


class RepoAnalyzeRequest(BaseModel):
    repo_id: str


class RepoChatRequest(BaseModel):
    repo_id: str
    message: str
    session_id: Optional[str] = None


class RepoIntelligenceResponse(BaseModel):
    repo_id: str
    overview: str
    architecture_summary: str
    complexity_score: float
    recommendations: List[str]
    contribution_opportunities: List[str]
    generated_at: str


class RepoStatusResponse(BaseModel):
    """Returned by GET /api/repos/status/{repo_id}."""
    repo_id: str
    status: str          # pending | cloning | analyzing | analyzed | error
    error_message: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ─── Learning Models ──────────────────────────────────────────────────────────

class PresetPlanRequest(BaseModel):
    plan_id: str


class RoadmapRequest(BaseModel):
    goal: str
    stack: List[str]
    timeline: str
    current_level: Optional[str] = "beginner"


class ConceptCompleteRequest(BaseModel):
    roadmap_id: str
    concept_id: str


class ConceptRequest(BaseModel):
    topic: str
    roadmap_id: str
    concept_id: str
    difficulty: Optional[str] = "intermediate"


class PhaseProgressRequest(BaseModel):
    phase_index: int
    completed: bool = True


class ConceptChatRequest(BaseModel):
    topic: str
    concept_content: Optional[str] = ""
    question: str
    roadmap_id: Optional[str] = None


class ConceptProgressRequest(BaseModel):
    roadmap_id: str
    concept_id: str
    phase_id: str
    step: str = "complete"
    score: Optional[float] = 0
    completed: bool = True


class SkillGapRequest(BaseModel):
    topic: str
    skill_areas: List[str]
    quiz_score: float = 0.0
    viva_score: float = 0.0
    quiz_answers: List[Any] = []
    viva_answers: List[Any] = []


class LearningModuleRequest(BaseModel):
    """
    POST /api/learning/module

    Accepts both the backend-native format { topic } AND the legacy frontend
    format { lesson_id, context }.  When lesson_id is provided and topic is
    absent, topic is derived from lesson_id so the backend validator passes.
    """
    topic: Optional[str] = None       # backend-native (required by service)
    lesson_id: Optional[str] = None   # frontend alias → mapped to topic
    context: Optional[str] = None     # frontend alias → ignored by backend
    difficulty: Optional[str] = "intermediate"
    repo_id: Optional[str] = None

    def effective_topic(self) -> str:
        """Return the topic to use, falling back to lesson_id."""
        return self.topic or self.lesson_id or "general"


# ─── Assessment Models ────────────────────────────────────────────────────────

class AssessmentStartRequest(BaseModel):
    """
    POST /api/assessment/start

    repo_id added so questions can be tailored to a specific repository.
    mode: "text" (MCQ) | "voice" (open-ended, spoken answers)
    """
    topic: str
    difficulty: Optional[str] = "intermediate"
    num_questions: Optional[int] = 5
    repo_id: Optional[str] = None
    mode: Optional[str] = "text"           # NEW — "text" | "voice"


class AssessmentAnswerRequest(BaseModel):
    assessment_id: str
    question_id: str
    answer: str
    mode: Optional[str] = "text"           # NEW — "text" | "voice" (affects eval leniency)


class VoiceAssessmentAnswerRequest(BaseModel):
    assessment_id: str
    question_id: str
    audio_s3_key: str


class EvaluateAnswerRequest(BaseModel):
    question: str
    answer: str
    context: Optional[str] = None
    repo_id: Optional[str] = None


# ─── Playground Models ────────────────────────────────────────────────────────

class PlaygroundRunRequest(BaseModel):
    code: str
    language: str = "python"


class PlaygroundAnalyzeRequest(BaseModel):
    code: str
    language: str = "python"
    repo_id: Optional[str] = None


# ─── Voice Models ─────────────────────────────────────────────────────────────

class SpeakRequest(BaseModel):
    text: str
    voice_id: Optional[str] = "Kajal"
    language_code: Optional[str] = "hi-IN"
    output_format: Optional[str] = "mp3"


# ─── Settings Models ──────────────────────────────────────────────────────────

class LanguageSettingRequest(BaseModel):
    language: str


class NotificationSettingRequest(BaseModel):
    email_notifications: Optional[bool] = True
    push_notifications: Optional[bool] = True
    weekly_digest: Optional[bool] = True


class SecuritySettingRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


# ─── Generic Response ─────────────────────────────────────────────────────────

class SuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None
