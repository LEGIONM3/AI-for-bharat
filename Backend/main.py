"""
Bharat AI Operational Hub — FastAPI Application Entry Point

Run with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""
import os
os.environ["GIT_PYTHON_REFRESH"] = "quiet"

import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from config import settings
from utils.logger import setup_logging

# Setup logging before any other imports
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("🚀 Bharat AI Operational Hub starting...")

    # 1. Create DynamoDB tables
    try:
        from database import create_tables_if_not_exist
        create_tables_if_not_exist()
        logger.info("✅ DynamoDB tables verified/created")
    except Exception as e:
        logger.warning(f"⚠️  DynamoDB initialization skipped (offline mode?): {e}")

    # 2. Ensure S3 buckets exist
    try:
        from services.aws.s3 import s3_service
        s3_service.ensure_bucket_exists(settings.S3_VOICE_BUCKET)
        s3_service.ensure_bucket_exists(settings.S3_REPO_BUCKET)
        logger.info("✅ S3 buckets verified/created")
    except Exception as e:
        logger.warning(f"⚠️  S3 initialization skipped: {e}")

    # Seed preset learning plans
    try:
        from data.seed_plans import seed_preset_plans
        count = seed_preset_plans()
        logger.info(f"✅ Preset plans seeded: {count} new plans")
    except Exception as e:
        logger.warning(f"⚠️  Plan seeding skipped: {e}")

    # 3. Verify Git is available (required for repo cloning)
    try:
        import subprocess
        git_exec = os.environ.get("GIT_PYTHON_GIT_EXECUTABLE", "git")
        result = subprocess.run(
            [git_exec, "--version"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            logger.info(f"✅ Git verified: {result.stdout.strip()}")
        else:
            logger.warning(
                "⚠️  git --version returned non-zero. "
                "Set GIT_PYTHON_GIT_EXECUTABLE in Backend/.env"
            )
    except FileNotFoundError:
        logger.warning(
            "⚠️  Git NOT found at startup. Repository cloning WILL fail. "
            f"Expected at: {os.environ.get('GIT_PYTHON_GIT_EXECUTABLE', 'git')}. "
            "Install Git from https://git-scm.com/download/win and restart."
        )
    except Exception as e:
        logger.warning(f"⚠️  Git check failed: {e}")

    # 4. Pre-load Whisper model (downloads ~150MB once, then cached locally)
    try:
        from services.whisper_transcriber import get_whisper_model
        get_whisper_model()
        logger.info("✅ Whisper model loaded OK")
    except Exception as e:
        logger.warning(f"⚠️  Whisper pre-load skipped: {e}")

    logger.info(f"✅ Backend ready on port {settings.APP_PORT}")
    logger.info(f"📖 API Docs: http://localhost:{settings.APP_PORT}/docs")

    yield

    logger.info("👋 Bharat AI Operational Hub shutting down...")


# ─── App Initialization ───────────────────────────────────────────────────────

app = FastAPI(
    title="Bharat AI Operational Hub",
    description="""
## Bharat AI Operational Hub API

A production-grade AI backend for the Bharat AI Developer Intelligence Platform.

### Features
- 🔐 JWT Authentication with bcrypt password hashing
- 📦 GitHub Repository Analysis with RAG pipeline
- 🤖 Claude Sonnet (via Amazon Bedrock) for AI reasoning
- 🗄️ Amazon DynamoDB for metadata storage
- 📂 Amazon S3 for voice recordings
- 🎙️ Amazon Transcribe for speech-to-text
- 🔊 Amazon Polly for text-to-speech
- 🧠 FAISS vector store with all-MiniLM-L6-v2 embeddings
- 📚 Learning roadmaps and assessments
- 🏃 Sandboxed Python code execution
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ─── Middleware ───────────────────────────────────────────────────────────────

app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.middleware("http")
async def timeout_middleware(request: Request, call_next):
    """
    Per-request timeout — prevents one slow request
    from blocking others.
    Long operations (repo analysis): 300 seconds
    Normal operations: 30 seconds
    """
    path = request.url.path
    
    # Repo analysis can take longer
    if "/repos/upload" in path:
        timeout = 30  # Upload itself is fast
    elif "/repos/chat" in path:
        timeout = 60  # RAG + AI response
    elif "/voice/transcribe-answer" in path:
        timeout = 120  # Whisper transcription: local CPU, up to 60s
    elif "/contribution/analyze" in path:
        timeout = 60  # AI analysis
    else:
        timeout = 30  # Default
    
    try:
        return await asyncio.wait_for(
            call_next(request), 
            timeout=timeout
        )
    except asyncio.TimeoutError:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=504,
            content={
                "error": "Request timed out",
                "detail": (
                    "The server is busy. "
                    "Please try again in a moment."
                )
            }
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


# ─── Exception Handlers ───────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Validation failed",
            "detail": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc) if settings.APP_ENV == "development" else "An unexpected error occurred",
        },
    )


# ─── Root Endpoints ───────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "name": "Bharat AI Operational Hub",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """System health check endpoint."""
    checks = {}

    # Check DynamoDB
    try:
        from database import get_dynamodb_client
        client = get_dynamodb_client()
        client.list_tables(Limit=1)
        checks["dynamodb"] = "healthy"
    except Exception as e:
        checks["dynamodb"] = f"unhealthy: {str(e)}"

    # Check FAISS
    try:
        import faiss
        checks["faiss"] = "healthy"
    except ImportError:
        checks["faiss"] = "not installed"

    # Check embeddings (lazy — just verify the package is importable)
    try:
        import sentence_transformers  # noqa: F401
        checks["embedding_model"] = "healthy"
    except ImportError:
        checks["embedding_model"] = "not installed"

    # Check Whisper
    try:
        from services.whisper_transcriber import test_whisper
        result = test_whisper()
        checks["whisper"] = (
            "healthy"
            if result["status"] == "ok"
            else f"unhealthy: {result.get('error')}"
        )
    except Exception as e:
        checks["whisper"] = f"not installed: {e}"

    overall = "healthy" if all(
        v == "healthy" for v in checks.values()
    ) else "degraded"

    return {
        "status": overall,
        "environment": settings.APP_ENV,
        "checks": checks,
        "version": "1.0.0",
    }


# ─── Router Registration ──────────────────────────────────────────────────────

from api.auth.routes import router as auth_router
from api.dashboard.routes import router as dashboard_router
from api.repos.routes import router as repos_router
from api.learning.routes import router as learning_router
from api.assessments.routes import router as assessments_router
from api.playground.routes import router as playground_router
from api.voice.routes import router as voice_router
from api.profile.routes import router as profile_router
from api.tools.routes import router as tools_router
from api.notifications.routes import router as notifications_router
from api.contribution.routes import router as contribution_router

API_PREFIX = "/api"

app.include_router(auth_router,        prefix=API_PREFIX)
app.include_router(dashboard_router,   prefix=API_PREFIX)
app.include_router(repos_router,       prefix=API_PREFIX)
app.include_router(learning_router,    prefix=API_PREFIX)
app.include_router(assessments_router, prefix=API_PREFIX)
app.include_router(playground_router,  prefix=API_PREFIX)
app.include_router(voice_router,       prefix=API_PREFIX)
app.include_router(profile_router,     prefix=API_PREFIX)
app.include_router(tools_router,       prefix=API_PREFIX)
app.include_router(notifications_router, prefix=API_PREFIX)
app.include_router(contribution_router,  prefix=API_PREFIX)


# ─── Dev Entry Point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.APP_PORT,
        reload=settings.APP_ENV == "development",
        log_level=settings.LOG_LEVEL.lower(),
    )
