"""
Assessments API routes.

Fixes applied in this version:
  - evaluate_answer now scores 10 / 5 / 0 (not 0-100).
    The AI prompt was rewritten in ai_orchestrator.py to return
    only those three values, so percentage can never exceed 100%.
  - get_results correctly computes:
      max_score  = num_questions × 10
      total_score = sum(each 0|5|10)
      percentage  = (total_score / max_score) × 100  → [0, 100]
  - Three voice assessment endpoints:
      POST /assessment/voice/question-audio  → Polly TTS → S3 presigned URL
      POST /assessment/voice/transcribe-answer → LOCAL Whisper STT → transcript
      POST /assessment/voice/cleanup          → delete Polly audio from S3
  - AWS Transcribe REMOVED — not available in ap-south-1.
    Replaced with openai-whisper running locally on CPU.
  - submit_answer passes correct_answer to the evaluator for better scoring.
"""
import json
import logging
import os
import uuid
import boto3

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from config import settings
from database import get_dynamodb_resource
from models.schemas import (
    AssessmentStartRequest,
    AssessmentAnswerRequest,
)
from utils.auth import get_current_user
from utils.helpers import generate_id, utc_now_iso
from controllers.assessment_controller import assessment_controller

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/assessment", tags=["Assessments"])

# ─── helpers ────────────────────────────────────────────────────────────────

def get_assessments_table():
    return get_dynamodb_resource().Table(settings.DYNAMODB_ASSESSMENTS_TABLE)


def _s3_client():
    return boto3.client(
        "s3",
        region_name=os.environ.get("AWS_REGION", "ap-south-1"),
    )


def _polly_client():
    return boto3.client(
        "polly",
        region_name=os.environ.get("AWS_REGION", "ap-south-1"),
    )


def _transcribe_client():
    return boto3.client(
        "transcribe",
        region_name=os.environ.get("AWS_REGION", "ap-south-1"),
    )


def _temp_bucket() -> str:
    return os.environ.get("S3_TEMP_BUCKET_NAME", "bharat-ai-temp")


# ─── EXISTING ENDPOINTS ──────────────────────────────────────────────────────

@router.post("/start")
async def start_assessment(
    body: AssessmentStartRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Start a new assessment session and return questions.
    Returns { assessment_id, topic, questions[], total_questions }.
    """
    user_id = current_user["sub"]
    assessment_id = generate_id("assess_")
    mode = (body.mode or "text").lower()

    questions = assessment_controller.generate_quiz(
        topic=body.topic,
        difficulty=body.difficulty or "intermediate",
        num_questions=body.num_questions or 5,
        mode=mode,
        repo_id=body.repo_id,
    )

    if not questions:
        raise HTTPException(
            status_code=502,
            detail="Assessment generation failed: Bedrock returned empty output."
        )

    assessment = {
        "id": assessment_id,
        "assessment_id": assessment_id,
        "user_id": user_id,
        "topic": body.topic,
        "repo_id": body.repo_id,
        "difficulty": body.difficulty or "intermediate",
        "mode": mode,                          # stored for evaluation
        "questions": questions,
        "answers": [],
        "score": None,
        "understanding_level": None,
        "status": "in_progress",
        "created_at": utc_now_iso(),
    }

    try:
        get_assessments_table().put_item(Item=assessment)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create assessment: {e}")

    return {
        "assessment_id": assessment_id,
        "topic": body.topic,
        "mode": mode,
        "questions": questions,
        "total_questions": len(questions),
    }


@router.post("/answer")
async def submit_answer(
    body: AssessmentAnswerRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Submit an answer for AI evaluation.

    Returns evaluation at TOP LEVEL (not nested):
    { score: 0|5|10, feedback, is_correct, detailed_feedback, skill_gaps }
    """
    table = get_assessments_table()

    try:
        resp = table.get_item(Key={"assessment_id": body.assessment_id})
        assessment = resp.get("Item")
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")

        question_text = ""
        correct_answer = ""
        for q in assessment.get("questions", []):
            if q.get("id") == body.question_id:
                question_text = q.get("question", "")
                correct_answer = q.get("correct_answer", "")
                break

        # Use mode from request body; fall back to stored assessment mode
        mode = (body.mode or assessment.get("mode", "text")).lower()

        evaluation = assessment_controller.evaluate_answer(
            question=question_text,
            answer=body.answer,
            correct_answer=correct_answer,
            mode=mode,
        )

        answer_record = {
            "question_id": body.question_id,
            "answer": body.answer,
            "mode": mode,
            "evaluation": evaluation,
            "submitted_at": utc_now_iso(),
        }

        answers = assessment.get("answers", [])
        answers.append(answer_record)

        table.update_item(
            Key={"assessment_id": body.assessment_id},
            UpdateExpression="SET answers = :answers",
            ExpressionAttributeValues={":answers": answers},
        )

        # Flat top-level response — frontend reads data.score directly
        return {
            "assessment_id": body.assessment_id,
            "question_id": body.question_id,
            "score": evaluation.get("score", 0),
            "feedback": evaluation.get("feedback", ""),
            "is_correct": evaluation.get("is_correct", False),
            "detailed_feedback": evaluation.get("detailed_feedback", ""),
            "correct_answer": evaluation.get("correct_answer", correct_answer),
            "skill_gaps": evaluation.get("skill_gaps", []),
            "strengths": evaluation.get("strengths", []),
            "understanding_level": evaluation.get("understanding_level", ""),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results/{assessment_id}")
async def get_results(
    assessment_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get complete results for an assessment.

    CORRECT score calculation:
      max_score   = num_questions × 10   (10 pts per question)
      total_score = sum of each answer's score (each is 0, 5, or 10)
      percentage  = (total_score / max_score) × 100   → always [0, 100]
      passed      = percentage >= 60
    """
    try:
        resp = get_assessments_table().get_item(Key={"assessment_id": assessment_id})
        assessment = resp.get("Item")
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")

        answers = assessment.get("answers", [])
        questions = assessment.get("questions", [])
        num_questions = len(questions)
        max_score = num_questions * 10  # 10 points per question

        # Sum raw scores (each guaranteed to be 0, 5, or 10 by the controller)
        scores = [
            int(a.get("evaluation", {}).get("score", 0))
            for a in answers
            if isinstance(a.get("evaluation"), dict)
        ]
        total_score = sum(scores)
        avg_score = round(total_score / num_questions, 1) if num_questions > 0 else 0
        percentage = round((total_score / max_score) * 100, 1) if max_score > 0 else 0
        # Hard-cap at 100 as a safety belt
        percentage = min(percentage, 100.0)
        passed = percentage >= 60

        # Persist computed results
        try:
            get_assessments_table().update_item(
                Key={"assessment_id": assessment_id},
                UpdateExpression="SET score = :score, #st = :status",
                ExpressionAttributeValues={
                    ":score": str(avg_score),
                    ":status": "completed",
                },
                ExpressionAttributeNames={"#st": "status"},
            )
        except Exception:
            pass  # non-fatal — results still returned

        return {
            "assessment_id": assessment_id,
            "topic": assessment.get("topic", ""),
            "difficulty": assessment.get("difficulty", ""),
            "status": "completed",
            "questions": questions,
            "answers": answers,
            "total_score": total_score,
            "max_score": max_score,
            "avg_score": avg_score,
            "percentage": percentage,
            "passed": passed,
            "created_at": assessment.get("created_at", ""),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── VOICE ASSESSMENT ENDPOINTS ─────────────────────────────────────────────

@router.post("/voice/question-audio")
async def generate_question_audio(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate TTS audio for a question using Amazon Polly.
    Saves MP3 to S3 and returns a 1-hour presigned URL.

    Body: { assessment_id, question_id, question_text }
    Returns: { audio_url, question_id }
    """
    assessment_id = body.get("assessment_id", "")
    question_id = body.get("question_id", "")
    question_text = body.get("question_text", "")

    if not question_text:
        raise HTTPException(status_code=400, detail="question_text is required")

    try:
        polly = _polly_client()
        response = polly.synthesize_speech(
            Text=question_text,
            OutputFormat="mp3",
            VoiceId="Joanna",
            Engine="neural",
        )
        audio_bytes = response["AudioStream"].read()

        s3 = _s3_client()
        bucket = _temp_bucket()
        key = f"assessment-audio/{assessment_id}/{question_id}.mp3"

        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=audio_bytes,
            ContentType="audio/mpeg",
            Metadata={"assessment_id": assessment_id},
        )

        presigned_url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=3600,
        )

        return {"audio_url": presigned_url, "question_id": question_id}

    except polly.exceptions.TextLengthExceededException:
        raise HTTPException(status_code=400, detail="Question text too long for TTS")
    except Exception as e:
        logger.error(f"Polly/S3 error generating question audio: {e}")
        raise HTTPException(status_code=500, detail=f"Audio generation failed: {e}")


@router.post("/voice/transcribe-answer")
async def transcribe_voice_answer(
    audio: UploadFile = File(...),
    assessment_id: str = Form(...),
    question_id: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Transcribe a recorded voice answer using local Whisper model.
    No AWS Transcribe subscription required.

    Returns: { transcript, question_id, assessment_id, audio_key: null }
    """
    try:
        audio_bytes = await audio.read()
        content_type = audio.content_type or "audio/webm"

        if len(audio_bytes) < 1000:
            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        "Audio too short. "
                        "Please record a longer answer."
                    )
                }
            )

        from services.whisper_transcriber import transcribe_async
        transcript = await transcribe_async(audio_bytes, content_type)

        return {
            "transcript": transcript,
            "question_id": question_id,
            "assessment_id": assessment_id,
            "audio_key": None,  # No S3 upload — Whisper works locally
        }

    except Exception as e:
        logger.error(f"Transcription endpoint error: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"Transcription failed: {str(e)}"}
        )


@router.post("/voice/cleanup")
async def cleanup_assessment_audio(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete Polly question audio files from S3.
    Answer audio is handled locally by Whisper — no S3 cleanup needed for answers.

    Body: { assessment_id }
    Returns: { success, assessment_id, files_deleted }
    """
    assessment_id = body.get("assessment_id", "")
    if not assessment_id:
        return JSONResponse(
            status_code=400,
            content={"error": "assessment_id required"}
        )

    try:
        s3 = _s3_client()
        bucket = _temp_bucket()
        # Only Polly question audio — no answer audio in S3 anymore
        prefix = f"assessment-audio/{assessment_id}/"

        response = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
        objects = response.get("Contents", [])

        if objects:
            s3.delete_objects(
                Bucket=bucket,
                Delete={
                    "Objects": [{"Key": obj["Key"]} for obj in objects]
                }
            )
            logger.info(
                f"Cleaned {len(objects)} Polly audio files "
                f"for assessment {assessment_id}"
            )

        return {
            "success": True,
            "assessment_id": assessment_id,
            "files_deleted": len(objects),
        }

    except Exception as e:
        logger.error(f"S3 cleanup error for {assessment_id}: {e}")
        return {
            "success": False,
            "assessment_id": assessment_id,
            "error": str(e),
        }
