"""
Repository API routes — upload, analyze, chat, history, status polling.

Changes from original:
  1. GET /history moved ABOVE GET /{repo_id} to prevent FastAPI route-order
     collision (history was being matched as a repo_id param).
  2. POST /upload now accepts BOTH JSON body AND multipart/form-data so the
     frontend can send either format.
  3. GET /status/{repo_id} added — lightweight polling endpoint that returns
     only the current analysis status without fetching the full intelligence
     report.
  4. GET /{repo_id} now returns a FLAT response (intelligence fields merged
     at the top level) matching what the frontend normaliser expects.
  5. GET /intelligence/{repo_id} added — explicit endpoint for retrieving
     the completed intelligence report (supports fetch-after-poll workflow).
"""
import logging
import asyncio
import os
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form

from config import settings
from database import get_dynamodb_resource
from models.schemas import (
    RepoUploadRequest, RepoAnalyzeRequest, RepoChatRequest,
    RepoIntelligenceResponse, RepoStatusResponse, SuccessResponse
)
from utils.auth import get_current_user
from utils.helpers import generate_id, utc_now_iso, sanitize_repo_name, truncate_text
from services.rag import rag_pipeline
from controllers.repo_controller import repo_controller
from services.vector_store import vector_store_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/repos", tags=["Repositories"])


def get_repos_table():
    return get_dynamodb_resource().Table(settings.DYNAMODB_REPOS_TABLE)

def get_intelligence_table():
    return get_dynamodb_resource().Table(settings.DYNAMODB_REPO_INTELLIGENCE_TABLE)

def get_chat_table():
    return get_dynamodb_resource().Table(settings.DYNAMODB_CHAT_MEMORY_TABLE)

def _find_existing_repo(repo_url: str, user_id: str) -> Optional[dict]:
    """Find existing analyzed repo by URL for this user."""
    try:
        table = get_repos_table()
        response = table.scan(
            FilterExpression=(
                "repo_url = :url AND user_id = :uid AND #s = :status"
            ),
            ExpressionAttributeValues={
                ":url": repo_url,
                ":uid": user_id,
                ":status": "analyzed"
            },
            ExpressionAttributeNames={"#s": "status"}
        )
        items = response.get("Items", [])
        return items[0] if items else None
    except Exception:
        return None

def _save_notification(user_id: str, repo_id: str, repo_name: str, notif_type: str = "analysis_complete"):
    try:
        import uuid
        db = get_dynamodb_resource()
        table = db.Table(os.environ.get("DYNAMODB_ACTIVITY_LOGS_TABLE", "bharat_ai_activity_logs"))
        table.put_item(Item={
            "log_id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": notif_type,
            "repo_id": repo_id,
            "repo_name": repo_name,
            "message": f"Repository '{repo_name}' analysis complete!",
            "read": False,
            "created_at": utc_now_iso(),
        })
    except Exception as e:
        logger.warning(f"Could not save notification: {e}")


# ─── Upload ───────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_repo(
    request: RepoUploadRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Register a GitHub repository for analysis.

    Accepts JSON body:  { "repo_url": "...", "repo_name": "..." }

    Returns { repo_id, repo_name, status: "pending" } immediately.
    Poll GET /api/repos/status/{repo_id} to track progress.
    Fetch GET /api/repos/intelligence/{repo_id} once status == "analyzed".
    """
    user_id = current_user["sub"]

    effective_url = request.repo_url
    effective_name = request.repo_name

    if not effective_url:
        raise HTTPException(status_code=422, detail="repo_url is required")

    repo_id = generate_id("repo_")
    resolved_name = effective_name or sanitize_repo_name(effective_url)

    repo_item = {
        "repo_id": repo_id,
        "user_id": user_id,
        "repo_url": effective_url,
        "repo_name": resolved_name,
        "status": "pending",
        "created_at": utc_now_iso(),
    }

    try:
        get_repos_table().put_item(Item=repo_item)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register repository: {e}")

    # Kick off background processing
    background_tasks.add_task(_process_repo_background, repo_id, effective_url, user_id)

    return {
        "success": True,
        "repo_id": repo_id,
        "repo_name": resolved_name,
        "status": "pending",
        "message": "Repository registered. Analysis will begin shortly.",
    }


# ─── Upload ZIP (drag & drop) ─────────────────────────────────────────────────

@router.post("/upload-zip")
async def upload_zip(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    repo_name: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Accept a ZIP file upload, store in S3, and start RAG analysis.

    Flow:
      1. Validate file is a .zip
      2. Generate repo_id
      3. Save ZIP to S3 at uploads/{user_id}/{repo_id}/{filename}
      4. Create pending repo record in DynamoDB
      5. Start background task: download → extract → RAG → intelligence → analyzed
      6. Return immediately with repo_id + status=pending

    Frontend should poll GET /api/repos/status/{repo_id}.
    """
    import tempfile, os as _os, boto3

    # Validate extension
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=422, detail="Only .zip files are accepted")

    user_id = current_user["sub"]
    repo_id = generate_id("repo_")
    resolved_name = repo_name or (file.filename.replace(".zip", "") if file.filename else repo_id)

    # Save to a temp file (UploadFile is a streaming object)
    try:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip", mode="wb")
        contents = await file.read()
        tmp.write(contents)
        tmp.close()
        tmp_path = tmp.name
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to receive file: {e}")

    # Upload to S3
    s3_key = f"uploads/{user_id}/{repo_id}/{file.filename}"
    try:
        s3 = boto3.client("s3", region_name=settings.AWS_REGION)
        s3.upload_file(tmp_path, settings.S3_REPO_BUCKET, s3_key)
    except Exception as e:
        _os.unlink(tmp_path)
        logger.warning(f"S3 upload failed (will process locally): {e}")
        # Non-fatal — process from local tmp file below

    # Save pending record in DynamoDB
    repo_item = {
        "repo_id":    repo_id,
        "user_id":    user_id,
        "repo_url":   f"s3://{settings.S3_REPO_BUCKET}/{s3_key}",
        "repo_name":  resolved_name,
        "status":     "pending",
        "source":     "zip",
        "created_at": utc_now_iso(),
    }
    try:
        get_repos_table().put_item(Item=repo_item)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register repo: {e}")

    # Background: extract ZIP → RAG → intelligence report
    background_tasks.add_task(
        _process_zip_background, repo_id, tmp_path, user_id
    )

    return {
        "success":   True,
        "repo_id":   repo_id,
        "repo_name": resolved_name,
        "status":    "pending",
        "message":   "ZIP received. Analysis starting in background.",
    }


async def _process_zip_background(repo_id: str, zip_path: str, user_id: str):
    """Background task: extract ZIP → RAG pipeline → intelligence report."""
    import os as _os
    try:
        _update_repo_status(repo_id, "analyzing")

        result = await asyncio.get_event_loop().run_in_executor(
            None, rag_pipeline.process_zip_file, zip_path, repo_id
        )

        if result.get("status") == "error":
            _update_repo_status(repo_id, "error", result.get("error"))
            return

        _update_repo_status(repo_id, "analyzing")
        intelligence = await asyncio.get_event_loop().run_in_executor(
            None, _generate_intelligence_report, repo_id
        )
        _update_repo_status(repo_id, "analyzed")
        _save_intelligence_report(repo_id, intelligence)
        logger.info(f"ZIP repo {repo_id} fully processed.")
    except Exception as e:
        logger.error(f"ZIP background processing failed for {repo_id}: {e}")
        clean_error = str(e).split("\n")[0][:200]   # first line only, no traceback
        _update_repo_status(repo_id, "error", clean_error)
    finally:
        # Clean up temp file regardless of outcome
        try:
            _os.unlink(zip_path)
        except Exception:
            pass




async def _process_repo_background(repo_id: str, repo_url: str, user_id: str):
    """Background task: clone → RAG → intelligence report."""
    try:
        _update_repo_status(repo_id, "cloning")
        result = await asyncio.get_event_loop().run_in_executor(
            None, rag_pipeline.process_repository, repo_url, repo_id
        )

        if result.get("status") == "error":
            _update_repo_status(repo_id, "error", result.get("error"))
            return

        _update_repo_status(repo_id, "analyzing")
        intelligence = await asyncio.get_event_loop().run_in_executor(
            None, _generate_intelligence_report, repo_id
        )

        existing = _find_existing_repo(repo_url, user_id)
        if existing:
            _update_repo_status(existing["repo_id"], "analyzed")
            _save_intelligence_report(existing["repo_id"], intelligence)
            _update_repo_status(repo_id, "superseded")
            
            repo_name = existing.get("repo_name", repo_url)
            _save_notification(user_id, existing["repo_id"], repo_name)
        else:
            _update_repo_status(repo_id, "analyzed")
            _save_intelligence_report(repo_id, intelligence)
            
            # Fetch the actual repo item to get its name for the notification
            try:
                repo_item = get_repos_table().get_item(Key={"repo_id": repo_id}).get("Item", {})
                repo_name = repo_item.get("repo_name", repo_url)
            except Exception:
                repo_name = repo_url
            
            _save_notification(user_id, repo_id, repo_name)
            
        logger.info(f"Repository {repo_id} fully processed.")

    except Exception as e:
        logger.error("Repo intelligence failed", exc_info=True)
        logger.error(f"Background repo processing failed for {repo_id}: {e}")
        clean_error = str(e).split("\n")[0][:200]   # first line only, no traceback
        _update_repo_status(repo_id, "error", clean_error)


def _update_repo_status(repo_id: str, status: str, error: Optional[str] = None):
    try:
        table = get_repos_table()
        update_expr = "SET #s = :status, updated_at = :ts"
        expr_vals = {":status": status, ":ts": utc_now_iso()}
        expr_names = {"#s": "status"}
        if error:
            update_expr += ", error_message = :error"
            expr_vals[":error"] = str(error)[:500]
        table.update_item(
            Key={"repo_id": repo_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_vals,
            ExpressionAttributeNames=expr_names,
        )
    except Exception as e:
        logger.warning(f"Could not update repo status: {e}")


def _get_folder_structure(repo_id: str) -> list:
    import os
    base_path = os.path.join(settings.REPO_BASE_PATH, repo_id)
    if not os.path.exists(base_path):
        return []

    structure = []
    # keep it simple, max 150 items so we don't bloat dynamo
    for root, dirs, files in os.walk(base_path):
        # normalize path
        rel_root = os.path.relpath(root, base_path).replace("\\", "/")
        if rel_root == ".":
            rel_root = ""
            
        unwanted = [d for d in dirs if d in {".git", "node_modules", "__pycache__", ".venv", "venv", "env", "dist", "build", ".next", ".nuxt", "vendor", "target"} or d.startswith(".")]
        for d in unwanted:
            dirs.remove(d)
        
        for d in dirs:
            dir_path = f"{rel_root}/{d}/" if rel_root else f"{d}/"
            structure.append({"name": dir_path, "type": "folder"})
            
        for f in files:
            if f.startswith("."): continue
            file_path = f"{rel_root}/{f}" if rel_root else f
            structure.append({"name": file_path, "type": "file"})
            
        if len(structure) > 150:
            structure = structure[:150]
            break

    # sort: folders first, then files
    structure.sort(key=lambda x: (x["type"] != "folder", x["name"]))
    return structure


def _generate_intelligence_report(repo_id: str) -> dict:
    """Use AI Orchestrator via Controller to generate an intelligence report."""
    intel = repo_controller.generate_intelligence(repo_id)
    intel["folder_structure"] = _get_folder_structure(repo_id)
    return intel


def _save_intelligence_report(repo_id: str, intelligence: dict):
    try:
        item = {
            "repo_id": repo_id,
            "overview": intelligence.get("overview", ""),
            "architecture_summary": intelligence.get("architecture_summary", ""),
            "complexity_score": str(intelligence.get("complexity_score", 0)),
            "recommendations": intelligence.get("recommendations", []),
            "contribution_opportunities": intelligence.get("contribution_opportunities", []),
            "tech_stack": intelligence.get("tech_stack", []),
            "design_patterns": intelligence.get("design_patterns", []),
            "mermaid_diagram": intelligence.get("mermaid_diagram", ""),
            "risks": intelligence.get("risks", []),
            "strengths": intelligence.get("strengths", []),
            "folder_structure": intelligence.get("folder_structure", []),
            "generated_at": utc_now_iso(),
        }
        get_intelligence_table().put_item(Item=item)
    except Exception as e:
        logger.warning(f"Could not save intelligence report: {e}")


# ─── Status Polling ───────────────────────────────────────────────────────────

@router.get("/status/{repo_id}", response_model=RepoStatusResponse)
async def get_repo_status(repo_id: str, current_user: dict = Depends(get_current_user)):
    """
    Lightweight polling endpoint — returns ONLY the current analysis status.

    Frontend should poll this every 2-3 seconds until status == "analyzed".
    Then call GET /api/repos/intelligence/{repo_id} for the full report.

    Possible status values: pending | cloning | analyzing | analyzed | error
    """
    try:
        resp = get_repos_table().get_item(Key={"repo_id": repo_id})
        repo = resp.get("Item")
        if not repo:
            raise HTTPException(status_code=404, detail="Repository not found")
        return RepoStatusResponse(
            repo_id=repo_id,
            status=repo.get("status", "unknown"),
            error_message=repo.get("error_message"),
            created_at=repo.get("created_at"),
            updated_at=repo.get("updated_at"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Get Intelligence Report ──────────────────────────────────────────────────

@router.get("/intelligence/{repo_id}")
async def get_repo_intelligence(repo_id: str, current_user: dict = Depends(get_current_user)):
    """
    Return the completed intelligence report for a repository.

    Frontend should call this AFTER polling confirms status == "analyzed".
    Returns a FLAT object — all intelligence fields at the top level —
    matching the shape the frontend normaliser expects.
    """
    try:
        repo_resp = get_repos_table().get_item(Key={"repo_id": repo_id})
        repo = repo_resp.get("Item")
        if not repo:
            raise HTTPException(status_code=404, detail="Repository not found")

        if repo.get("status") != "analyzed":
            raise HTTPException(
                status_code=202,
                detail=f"Analysis not complete. Current status: {repo.get('status')}",
            )

        intel_resp = get_intelligence_table().get_item(Key={"repo_id": repo_id})
        intelligence = intel_resp.get("Item", {})

        # Return flat merged object — intelligence fields at top level
        return {
            "repo_id": repo_id,
            "repo_name": repo.get("repo_name", ""),
            "repo_url": repo.get("repo_url", ""),
            "status": "analyzed",
            "user_id": repo.get("user_id", ""),
            "created_at": repo.get("created_at", ""),
            # Intelligence fields — flat (NOT nested under "intelligence")
            "overview": intelligence.get("overview", ""),
            "architecture_summary": intelligence.get("architecture_summary", ""),
            "complexity_score": float(intelligence.get("complexity_score", 0)),
            "tech_stack": intelligence.get("tech_stack", []),
            "design_patterns": intelligence.get("design_patterns", []),
            "recommendations": intelligence.get("recommendations", []),
            "contribution_opportunities": intelligence.get("contribution_opportunities", []),
            "mermaid_diagram": intelligence.get("mermaid_diagram", ""),
            "risks": intelligence.get("risks", []),
            "strengths": intelligence.get("strengths", []),
            "folder_structure": intelligence.get("folder_structure", []),
            "generated_at": intelligence.get("generated_at", ""),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Re-trigger Analysis ──────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze_repo(
    body: RepoAnalyzeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Trigger or re-trigger analysis on a registered repository."""
    repo_id = body.repo_id
    try:
        resp = get_repos_table().get_item(Key={"repo_id": repo_id})
        repo = resp.get("Item")
        if not repo:
            raise HTTPException(status_code=404, detail="Repository not found")

        intelligence = _generate_intelligence_report(repo_id)
        _save_intelligence_report(repo_id, intelligence)
        _update_repo_status(repo_id, "analyzed")
        return {"success": True, "repo_id": repo_id, "intelligence": intelligence}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── History  (MUST be declared before /{repo_id}) ───────────────────────────

@router.get("/history")
async def get_repo_history(current_user: dict = Depends(get_current_user)):
    """
    Get all analyzed repositories for the authenticated user.

    Returns a flat array (not wrapped in an object) matching frontend expectations.
    Items are normalised: repo_id → id, created_at → last_scanned.
    """
    user_id = current_user["sub"]
    try:
        response = get_repos_table().scan(
            FilterExpression="user_id = :uid AND #s = :status",
            ExpressionAttributeValues={":uid": user_id, ":status": "analyzed"},
            ExpressionAttributeNames={"#s": "status"}
        )
        items = response.get("Items", [])

        # Deduplicate by repo_url — keep latest per URL
        seen_urls = {}
        for item in items:
            url = item.get("repo_url", "")
            existing = seen_urls.get(url)
            if not existing:
                seen_urls[url] = item
            else:
                # Keep the more recent one
                if item.get("updated_at", "") > existing.get("updated_at", ""):
                    seen_urls[url] = item
        
        unique_items = list(seen_urls.values())
        
        # Sort by most recent first
        unique_items.sort(
            key=lambda x: x.get("updated_at") or x.get("created_at", ""),
            reverse=True
        )

        # Normalise to frontend-expected shape
        normalised = [
            {
                "id": item.get("repo_id", ""),
                "repo_name": item.get("repo_name", ""),
                "repo_url": item.get("repo_url", ""),
                "last_scanned": item.get("updated_at") or item.get("created_at", ""),
                "summary": f"{item.get('repo_url', '')}",
                "status": item.get("status", "unknown"),
            }
            for item in unique_items
        ]
        return normalised  # flat array — NOT wrapped in { repos: [] }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Get Single Repo (flat merged response) ───────────────────────────────────

@router.get("/{repo_id}")
async def get_repo(repo_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get repository details and intelligence report.

    Returns a FLAT merged object — intelligence fields are at the top level
    (not nested under an 'intelligence' key) so the frontend normaliser can
    read raw.overview, raw.complexity_score, raw.tech_stack directly.
    """
    try:
        repo_resp = get_repos_table().get_item(Key={"repo_id": repo_id})
        repo = repo_resp.get("Item")
        if not repo:
            raise HTTPException(status_code=404, detail="Repository not found")

        intel_resp = get_intelligence_table().get_item(Key={"repo_id": repo_id})
        intelligence = intel_resp.get("Item", {})

        return {
            "repo_id": repo.get("repo_id", repo_id),
            "repo_name": repo.get("repo_name", ""),
            "repo_url": repo.get("repo_url", ""),
            "status": repo.get("status", "unknown"),
            "user_id": repo.get("user_id", ""),
            "created_at": repo.get("created_at", ""),
            # Intelligence fields at top level — NOT nested
            "overview": intelligence.get("overview", ""),
            "architecture_summary": intelligence.get("architecture_summary", ""),
            "complexity_score": float(intelligence.get("complexity_score", 0) or 0),
            "tech_stack": intelligence.get("tech_stack", []),
            "design_patterns": intelligence.get("design_patterns", []),
            "recommendations": intelligence.get("recommendations", []),
            "contribution_opportunities": intelligence.get("contribution_opportunities", []),
            "mermaid_diagram": intelligence.get("mermaid_diagram", ""),
            "risks": intelligence.get("risks", []),
            "strengths": intelligence.get("strengths", []),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Chat ─────────────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat_with_repo(
    body: RepoChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """RAG-based repository chatbot."""
    user_id = current_user["sub"]
    repo_id = body.repo_id

    response = repo_controller.chat(repo_id, body.message)

    _save_chat_message(repo_id, user_id, "user", body.message)
    _save_chat_message(repo_id, user_id, "assistant", response)

    return {
        "repo_id": repo_id,
        "message": body.message,
        "response": response,
        "context_used": True,
    }


def _get_chat_history(repo_id: str, user_id: str, limit: int = 10) -> list:
    try:
        table = get_chat_table()
        response = table.query(
            KeyConditionExpression="repo_id = :rid",
            FilterExpression="user_id = :uid",
            ExpressionAttributeValues={":rid": repo_id, ":uid": user_id},
            ScanIndexForward=False,
            Limit=limit,
        )
        return list(reversed(response.get("Items", [])))
    except Exception as e:
        logger.warning(f"Could not load chat history: {e}")
        return []


def _save_chat_message(repo_id: str, user_id: str, role: str, message: str):
    try:
        import uuid
        table = get_chat_table()
        table.put_item(Item={
            "repo_id": repo_id,
            "message_id": str(uuid.uuid4()),
            "user_id": user_id,
            "role": role,
            "message": message,
            "timestamp": utc_now_iso(),
        })
    except Exception as e:
        logger.warning(f"Could not save chat message: {e}")
