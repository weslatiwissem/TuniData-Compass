"""
main.py — TuniData Compass API (v2 with Auth)
FastAPI backend with career recommendations + full user management.
"""
from __future__ import annotations

import os
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, HTTPException, Depends, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from recommender import CareerRecommender
from cv_parser import parse_cv, parse_free_text
from auth import (
    UserCreate, UserLogin, UserUpdate, UserPublic, TokenResponse,
    register_user, login_user, update_user,
    save_job, unsave_job, mark_applied, set_cv,
    get_current_user, get_optional_user,
)

# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.getenv("CSV_PATH", os.path.join(BASE_DIR, "data", "jobs.csv"))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

engine: CareerRecommender | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    print(f"Loading engine from: {CSV_PATH}")
    engine = CareerRecommender(CSV_PATH)
    yield
    print("Shutting down.")


# ─────────────────────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="TuniData Compass API",
    version="2.0.0",
    description="Career recommendation engine with full user management.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded CVs
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ─────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────
class RecommendRequest(BaseModel):
    skills: list[str] = Field(..., description="List of skills")
    top_n: int = Field(default=5, ge=1, le=20)


class MissingSkillsRequest(BaseModel):
    skills: list[str]
    domain: str
    top_n: int = Field(default=8, ge=1, le=25)


class FreeTextRequest(BaseModel):
    text: str = Field(..., min_length=20)


class ApplyRequest(BaseModel):
    job_id: int
    cover_letter: Optional[str] = None


class SaveJobRequest(BaseModel):
    job_id: int


# Reuse existing response models from old main.py
class JobResult(BaseModel):
    title: str
    company: str
    location: str
    domain: str
    score: float
    job_match: float
    domain_fit: float
    freshness: str
    days_old: int
    matched_skills: list[str]
    skill_gaps: list[str]
    apply_url: Optional[str]
    expired_warning: bool


class FreshAlternative(BaseModel):
    title: str
    company: str
    location: str
    score: float
    freshness: str
    days_old: int
    apply_url: Optional[str]


class DomainScore(BaseModel):
    domain: str
    score: float


class RecommendResponse(BaseModel):
    input_skills: list[str]
    unknown_skills: list[str]
    expanded_aliases: dict
    domain_ranking: list[DomainScore]
    top_jobs: list[JobResult]
    fresh_alternatives: list[FreshAlternative]


class MissingSkill(BaseModel):
    skill: str
    importance: float
    level: str


class MissingSkillsResponse(BaseModel):
    domain: str
    input_skills: list[str]
    missing_skills: list[MissingSkill]


class ParsedSkillsResponse(BaseModel):
    extracted_skills: list[str]
    count: int


# ─────────────────────────────────────────────────────────────
# SYSTEM
# ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health():
    return {
        "status": "ok",
        "engine": "loaded" if engine else "not loaded",
        "domains": len(engine.domain_names) if engine else 0,
        "jobs": len(engine.df) if engine else 0,
    }


@app.get("/domains", tags=["System"], response_model=list[str])
def get_domains():
    if not engine:
        raise HTTPException(503, "Engine not loaded.")
    return engine.list_domains()


# ─────────────────────────────────────────────────────────────
# AUTH ROUTES
# ─────────────────────────────────────────────────────────────
@app.post("/auth/register", tags=["Auth"], response_model=TokenResponse)
def register(data: UserCreate):
    """Register a new user and return JWT token."""
    from auth import _create_token
    user = register_user(data)
    token = _create_token(user.id)
    return TokenResponse(access_token=token, user=user)


@app.post("/auth/login", tags=["Auth"], response_model=TokenResponse)
def login(data: UserLogin):
    """Login and get JWT token."""
    return login_user(data)


@app.get("/auth/me", tags=["Auth"], response_model=UserPublic)
def me(current_user: UserPublic = Depends(get_current_user)):
    """Get current authenticated user."""
    return current_user


# ─────────────────────────────────────────────────────────────
# USER / PROFILE
# ─────────────────────────────────────────────────────────────
@app.put("/users/me", tags=["User"], response_model=UserPublic)
def update_profile(
    data: UserUpdate,
    current_user: UserPublic = Depends(get_current_user),
):
    """Update authenticated user's profile."""
    return update_user(current_user.id, data)


@app.delete("/users/me", tags=["User"])
def delete_account(current_user: UserPublic = Depends(get_current_user)):
    """Delete the authenticated user's account."""
    from auth import _users
    user_email = None
    from auth import get_user_by_id
    user = get_user_by_id(current_user.id)
    if user:
        del _users[user.email]
    return {"detail": "Account deleted."}


@app.post("/users/me/cv", tags=["User"], response_model=UserPublic)
async def upload_cv(
    file: UploadFile = File(...),
    current_user: UserPublic = Depends(get_current_user),
):
    """Upload CV PDF for the authenticated user."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted.")
    contents = await file.read()
    # Save file
    safe_name = f"{current_user.id}_{uuid.uuid4().hex[:8]}.pdf"
    path = os.path.join(UPLOAD_DIR, safe_name)
    with open(path, "wb") as f:
        f.write(contents)
    return set_cv(current_user.id, safe_name)


@app.post("/users/me/save-job", tags=["User"])
def save_job_route(
    data: SaveJobRequest,
    current_user: UserPublic = Depends(get_current_user),
):
    """Save a job to user's favourites."""
    return {"saved_jobs": save_job(current_user.id, data.job_id)}


@app.delete("/users/me/save-job/{job_id}", tags=["User"])
def unsave_job_route(
    job_id: int,
    current_user: UserPublic = Depends(get_current_user),
):
    """Remove a job from user's favourites."""
    return {"saved_jobs": unsave_job(current_user.id, job_id)}


@app.post("/users/me/apply", tags=["User"])
def apply_job_route(
    data: ApplyRequest,
    current_user: UserPublic = Depends(get_current_user),
):
    """Mark a job as applied."""
    applied = mark_applied(current_user.id, data.job_id)
    return {"applied_jobs": applied, "cover_letter_received": bool(data.cover_letter)}


# ─────────────────────────────────────────────────────────────
# RECOMMENDER
# ─────────────────────────────────────────────────────────────
@app.post("/recommend", tags=["Recommender"], response_model=RecommendResponse)
def recommend(
    request: RecommendRequest,
    current_user: Optional[UserPublic] = Depends(get_optional_user),
):
    if not engine:
        raise HTTPException(503, "Engine not loaded.")

    validation = engine.validate_skills(request.skills)
    valid_skills = validation["valid"]
    if not valid_skills:
        raise HTTPException(422, f"No skills recognised. Unrecognised: {validation['unknown']}")

    domain_ranking = engine.rank_domains(valid_skills)
    top_jobs = engine.score_all_jobs(valid_skills, top_n=request.top_n)
    has_expired = any(j["expired_warning"] for j in top_jobs)
    fresh_alts = engine.find_fresh_alternatives(valid_skills) if has_expired else []

    return RecommendResponse(
        input_skills=valid_skills,
        unknown_skills=validation["unknown"],
        expanded_aliases=validation["expanded"],
        domain_ranking=[DomainScore(**d) for d in domain_ranking],
        top_jobs=[JobResult(**j) for j in top_jobs],
        fresh_alternatives=[FreshAlternative(**a) for a in fresh_alts],
    )


@app.post("/missing-skills", tags=["Recommender"], response_model=MissingSkillsResponse)
def missing_skills(request: MissingSkillsRequest):
    if not engine:
        raise HTTPException(503, "Engine not loaded.")
    if request.domain not in engine.domain_names:
        raise HTTPException(404, f"Domain '{request.domain}' not found.")
    validation = engine.validate_skills(request.skills)
    missing = engine.get_missing_skills(validation["valid"], request.domain, request.top_n)
    return MissingSkillsResponse(
        domain=request.domain,
        input_skills=validation["valid"],
        missing_skills=[MissingSkill(**m) for m in missing],
    )


# ─────────────────────────────────────────────────────────────
# PARSERS
# ─────────────────────────────────────────────────────────────
@app.post("/parse-cv", tags=["Parser"], response_model=ParsedSkillsResponse)
async def parse_cv_endpoint(file: UploadFile = File(...)):
    if not engine:
        raise HTTPException(503, "Engine not loaded.")
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted.")
    contents = await file.read()
    vocab = set(engine.skill_vectorizer.vocabulary_.keys())
    try:
        result = parse_cv(contents, vocab)
    except ValueError as e:
        raise HTTPException(422, str(e))
    if result["count"] == 0:
        raise HTTPException(422, "No recognisable skills found in CV.")
    return ParsedSkillsResponse(**result)


@app.post("/parse-text", tags=["Parser"], response_model=ParsedSkillsResponse)
def parse_text_endpoint(request: FreeTextRequest):
    if not engine:
        raise HTTPException(503, "Engine not loaded.")
    vocab = set(engine.skill_vectorizer.vocabulary_.keys())
    result = parse_free_text(request.text, vocab)
    if result["count"] == 0:
        raise HTTPException(422, "No recognisable skills found in text.")
    return ParsedSkillsResponse(**result)
