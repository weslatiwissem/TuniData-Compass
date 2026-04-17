"""
auth.py — JWT authentication for TuniData Compass
Handles user registration, login, token creation and verification.
"""

from __future__ import annotations
import os
import re
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-use-a-long-random-string")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7   # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# auto_error=False so unauthenticated requests return None rather than 401
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)

# ─────────────────────────────────────────────────────────────
# IN-MEMORY USER STORE  (replace with DB in production)
# ─────────────────────────────────────────────────────────────
# { email: UserInDB }
_users: dict[str, "UserInDB"] = {}


# ─────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: str          # plain str; we normalize manually
    password: str
    role: str = "Job Seeker"


class UserLogin(BaseModel):
    email: str          # plain str to avoid pydantic EmailStr normalization mismatches
    password: str


class UserPublic(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    role: str
    bio: str
    skills: list[str]
    preferences: dict
    cv_filename: Optional[str]
    saved_jobs: list[int]
    applied_jobs: list[int]
    experience: list[dict]
    created_at: str
    avatar_color: str


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[list[str]] = None
    preferences: Optional[dict] = None
    experience: Optional[list[dict]] = None
    avatar_color: Optional[str] = None


class UserInDB(UserPublic):
    hashed_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────
def _hash(password: str) -> str:
    return pwd_context.hash(password)


def _verify(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def _initials_color(name: str) -> str:
    colors = ["#E8A020", "#22C87A", "#3B82F6", "#2DD4BF", "#a78bfa", "#fb923c", "#f472b6"]
    idx = sum(ord(c) for c in name) % len(colors)
    return colors[idx]


# ─────────────────────────────────────────────────────────────
# CRUD
# ─────────────────────────────────────────────────────────────
def register_user(data: UserCreate) -> UserPublic:
    email = str(data.email).lower().strip()
    if email in _users:
        raise HTTPException(status_code=409, detail="Email already registered.")
    if len(data.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters.")

    uid = str(uuid.uuid4())
    full_name = f"{data.first_name} {data.last_name}"
    user = UserInDB(
        id=uid,
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        email=email,
        role=data.role,
        bio="",
        skills=[],
        preferences={"type": "Full-time", "location": "Tunis", "domain": "Any", "salary": "Any"},
        cv_filename=None,
        saved_jobs=[],
        applied_jobs=[],
        experience=[],
        created_at=datetime.utcnow().isoformat(),
        avatar_color=_initials_color(full_name),
        hashed_password=_hash(data.password),
    )
    _users[email] = user
    return UserPublic(**user.model_dump())


def login_user(data: UserLogin) -> TokenResponse:
    # Normalize: try exact match first, then case-insensitive scan
    email_key = str(data.email).lower().strip()
    user = _users.get(email_key)

    # Fallback: scan all users case-insensitively (handles pydantic EmailStr normalization)
    if not user:
        for stored_email, stored_user in _users.items():
            if stored_email.lower() == email_key:
                user = stored_user
                break

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with that email address.",
        )

    if not _verify(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password.",
        )

    token = _create_token(user.id)
    return TokenResponse(access_token=token, user=UserPublic(**user.model_dump()))


def get_user_by_id(user_id: str) -> UserInDB | None:
    for u in _users.values():
        if u.id == user_id:
            return u
    return None


def update_user(user_id: str, data: UserUpdate) -> UserPublic:
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    updates = data.model_dump(exclude_none=True)
    for k, v in updates.items():
        setattr(user, k, v)
    _users[user.email] = user
    return UserPublic(**user.model_dump())


def save_job(user_id: str, job_id: int) -> list[int]:
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if job_id not in user.saved_jobs:
        user.saved_jobs.append(job_id)
    return user.saved_jobs


def unsave_job(user_id: str, job_id: int) -> list[int]:
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.saved_jobs = [j for j in user.saved_jobs if j != job_id]
    return user.saved_jobs


def mark_applied(user_id: str, job_id: int) -> list[int]:
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if job_id not in user.applied_jobs:
        user.applied_jobs.append(job_id)
    return user.applied_jobs


def set_cv(user_id: str, filename: str) -> UserPublic:
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.cv_filename = filename
    return UserPublic(**user.model_dump())


# ─────────────────────────────────────────────────────────────
# DEPENDENCY — current user from JWT
# ─────────────────────────────────────────────────────────────
async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserPublic:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise ValueError
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return UserPublic(**user.model_dump())


async def get_optional_user(token: str = Depends(oauth2_scheme)) -> UserPublic | None:
    if not token:
        return None
    try:
        return await get_current_user(token)
    except HTTPException:
        return None
