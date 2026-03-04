"""
Authentication API routes.

Changes from original:
  - Added POST /signup alias → delegates to register() handler.
  - /profile and /profile (PUT) routes REMOVED — canonical profile is
    served by profile_router at /api/profile.  Auth router keeps only
    login, register, signup, logout.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, status

from config import settings
from database import get_dynamodb_resource
from models.schemas import (
    RegisterRequest, SignupRequest, LoginRequest, TokenResponse,
    SuccessResponse
)
from utils.auth import (
    hash_password, verify_password,
    create_access_token, get_current_user
)
from utils.helpers import generate_id, utc_now_iso

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_users_table():
    db = get_dynamodb_resource()
    return db.Table(settings.DYNAMODB_USERS_TABLE)


def get_user_by_email(email: str):
    """Query via GSI email-index (ACTIVE)."""
    table = get_users_table()
    try:
        response = table.query(
            IndexName="email-index",
            KeyConditionExpression="email = :email",
            ExpressionAttributeValues={":email": email}
        )
        items = response.get("Items", [])
        return items[0] if items else None
    except Exception:
        # Fallback to scan if index not ready
        response = table.scan(
            FilterExpression="email = :email",
            ExpressionAttributeValues={":email": email},
        )
        items = response.get("Items", [])
        return items[0] if items else None


def get_user_by_username(username: str):
    """Query via GSI username-index, fallback to scan while index is building."""
    table = get_users_table()
    try:
        response = table.query(
            IndexName="username-index",
            KeyConditionExpression="username = :username",
            ExpressionAttributeValues={":username": username}
        )
        items = response.get("Items", [])
        return items[0] if items else None
    except Exception:
        # Fallback to scan if index not ready yet
        response = table.scan(
            FilterExpression="username = :username",
            ExpressionAttributeValues={":username": username},
        )
        items = response.get("Items", [])
        return items[0] if items else None


# ─── Internal helper ──────────────────────────────────────────────────────────

async def _do_register(body: RegisterRequest) -> TokenResponse:
    """Shared logic for /register and /signup."""
    if get_user_by_email(body.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user_id = generate_id("user_")
    user = {
        "user_id": user_id,
        "username": body.username,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "rank": "Novice",
        "system_exp": 0,
        "language": body.language or "en",
        "created_at": utc_now_iso(),
    }

    try:
        get_users_table().put_item(Item=user)
    except Exception as e:
        logger.error(f"Failed to create user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")

    token = create_access_token({"sub": user_id, "email": body.email, "username": body.username})
    return TokenResponse(
        access_token=token,
        user_id=user_id,
        username=body.username,
        rank="Novice",
    )


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """Register a new user account (backend-canonical route)."""
    return await _do_register(request)


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest):
    """
    Register a new user account — ALIAS for /register.

    Accepts the same payload as /register.
    Added so the frontend POST /api/auth/signup call succeeds
    without requiring a frontend change.
    """
    return await _do_register(request)


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Authenticate a user and return JWT token."""
    identifier = request.identifier
    
    if "@" in identifier:
        user = get_user_by_email(identifier)
        error_msg = "Invalid email or password"
    else:
        user = get_user_by_username(identifier)
        error_msg = "Invalid username or password"

    if not user or not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_msg,
        )

    token = create_access_token({
        "sub": user["user_id"],
        "email": user.get("email", ""),
        "username": user.get("username", identifier),
    })
    return TokenResponse(
        access_token=token,
        user_id=user["user_id"],
        username=user.get("username", identifier),
        rank=user.get("rank", "Novice"),
    )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout endpoint (client-side token invalidation)."""
    return {"success": True, "message": "Logged out successfully"}
