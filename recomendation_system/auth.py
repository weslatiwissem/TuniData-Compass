"""
auth.py — JWT authentication with MongoDB Atlas
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-use-a-long-random-string")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7   # 7 days
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB  = os.getenv("MONGO_DB", "compass")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)

# Shared motor client (initialised in lifespan)
_client: AsyncIOMotorClient | None = None
_db = None


def init_db(mongo_uri: str, db_name: str):
    global _client, _db
    _client = AsyncIOMotorClient(mongo_uri)
    _db = _client[db_name]
    return _db


def get_db():
    return _db


# ─────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    role: str = "Job Seeker"


class UserLogin(BaseModel):
    email: str
    password: str


class ProfileSection(BaseModel):
    """Structured sections extracted from CV"""
    summary: Optional[str] = None
    education: list[dict] = []
    experience: list[dict] = []
    languages: list[str] = []
    certifications: list[str] = []


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
    saved_jobs: list[str]
    applied_jobs: list[str]
    experience: list[dict]
    education: list[dict]
    languages: list[str]
    certifications: list[str]
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
    education: Optional[list[dict]] = None
    languages: Optional[list[str]] = None
    certifications: Optional[list[str]] = None
    avatar_color: Optional[str] = None


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


def _doc_to_user(doc: dict) -> UserPublic:
    return UserPublic(
        id=str(doc["_id"]),
        first_name=doc.get("first_name", ""),
        last_name=doc.get("last_name", ""),
        email=doc.get("email", ""),
        role=doc.get("role", ""),
        bio=doc.get("bio", ""),
        skills=doc.get("skills", []),
        preferences=doc.get("preferences", {}),
        cv_filename=doc.get("cv_filename"),
        saved_jobs=doc.get("saved_jobs", []),
        applied_jobs=doc.get("applied_jobs", []),
        experience=doc.get("experience", []),
        education=doc.get("education", []),
        languages=doc.get("languages", []),
        certifications=doc.get("certifications", []),
        created_at=doc.get("created_at", datetime.utcnow().isoformat()),
        avatar_color=doc.get("avatar_color", "#E8A020"),
    )


# ─────────────────────────────────────────────────────────────
# CRUD — all async
# ─────────────────────────────────────────────────────────────
async def register_user(data: UserCreate) -> tuple[UserPublic, str]:
    db = get_db()
    email = data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered.")
    if len(data.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters.")

    full_name = f"{data.first_name} {data.last_name}"
    doc = {
        "first_name": data.first_name.strip(),
        "last_name": data.last_name.strip(),
        "email": email,
        "role": data.role,
        "bio": "",
        "skills": [],
        "preferences": {"type": "Full-time", "location": "Tunis", "domain": "Any", "salary": "Any"},
        "cv_filename": None,
        "saved_jobs": [],
        "applied_jobs": [],
        "experience": [],
        "education": [],
        "languages": [],
        "certifications": [],
        "created_at": datetime.utcnow().isoformat(),
        "avatar_color": _initials_color(full_name),
        "hashed_password": _hash(data.password),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    user = _doc_to_user(doc)
    token = _create_token(str(result.inserted_id))
    return user, token


async def login_user(data: UserLogin) -> TokenResponse:
    db = get_db()
    email = data.email.lower().strip()
    doc = await db.users.find_one({"email": email})
    if not doc:
        raise HTTPException(status_code=401, detail="No account found with that email address.")
    if not _verify(data.password, doc["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect password.")
    user = _doc_to_user(doc)
    token = _create_token(str(doc["_id"]))
    return TokenResponse(access_token=token, user=user)


async def get_user_by_id(user_id: str) -> dict | None:
    db = get_db()
    try:
        return await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None


async def update_user(user_id: str, data: UserUpdate) -> UserPublic:
    db = get_db()
    updates = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not updates:
        doc = await get_user_by_id(user_id)
        return _doc_to_user(doc)
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    doc = await get_user_by_id(user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found.")
    return _doc_to_user(doc)


async def update_user_cv_sections(user_id: str, sections: ProfileSection, skills: list[str]) -> UserPublic:
    """Merge CV-extracted data into user profile without overwriting existing data"""
    db = get_db()
    doc = await get_user_by_id(user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found.")

    updates: dict = {}

    # Merge skills (deduplicate)
    existing_skills = set(doc.get("skills", []))
    merged_skills = list(existing_skills | set(skills))
    updates["skills"] = merged_skills

    # Only fill sections if currently empty
    if sections.summary and not doc.get("bio"):
        updates["bio"] = sections.summary
    if sections.experience and not doc.get("experience"):
        updates["experience"] = sections.experience
    if sections.education and not doc.get("education"):
        updates["education"] = sections.education
    if sections.languages and not doc.get("languages"):
        updates["languages"] = sections.languages
    if sections.certifications and not doc.get("certifications"):
        updates["certifications"] = sections.certifications

    if updates:
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": updates})

    doc = await get_user_by_id(user_id)
    return _doc_to_user(doc)


async def save_job(user_id: str, job_id: str) -> list[str]:
    db = get_db()
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$addToSet": {"saved_jobs": str(job_id)}}
    )
    doc = await get_user_by_id(user_id)
    return doc.get("saved_jobs", [])


async def unsave_job(user_id: str, job_id: str) -> list[str]:
    db = get_db()
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"saved_jobs": str(job_id)}}
    )
    doc = await get_user_by_id(user_id)
    return doc.get("saved_jobs", [])


async def mark_applied(user_id: str, job_id: str, cover_letter: str = "") -> list[str]:
    db = get_db()
    application = {
        "job_id": str(job_id),
        "cover_letter": cover_letter,
        "applied_at": datetime.utcnow().isoformat(),
    }
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$addToSet": {"applied_jobs": str(job_id)},
            "$push": {"applications": application},
        }
    )
    doc = await get_user_by_id(user_id)
    return doc.get("applied_jobs", [])


async def set_cv(user_id: str, filename: str) -> UserPublic:
    db = get_db()
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"cv_filename": filename}}
    )
    doc = await get_user_by_id(user_id)
    return _doc_to_user(doc)


async def delete_account(user_id: str):
    db = get_db()
    await db.users.delete_one({"_id": ObjectId(user_id)})


# ─────────────────────────────────────────────────────────────
# JWT DEPENDENCIES
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
    doc = await get_user_by_id(user_id)
    if not doc:
        raise HTTPException(status_code=401, detail="User not found.")
    return _doc_to_user(doc)


async def get_optional_user(token: str = Depends(oauth2_scheme)) -> UserPublic | None:
    if not token:
        return None
    try:
        return await get_current_user(token)
    except HTTPException:
        return None
