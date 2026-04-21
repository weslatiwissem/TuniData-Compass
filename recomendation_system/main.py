
from __future__ import annotations

import os
import uuid
import math
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, HTTPException, Depends, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from recommender import CareerRecommender
from cv_parser import parse_cv_full, parse_free_text
from auth import (
    UserCreate, UserLogin, UserUpdate, UserPublic, TokenResponse, ProfileSection,
    register_user, login_user, update_user, update_user_cv_sections,
    save_job, unsave_job, mark_applied, set_cv, delete_account,
    get_current_user, get_optional_user, init_db,
)

# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
CSV_PATH  = os.getenv("CSV_PATH", os.path.join(BASE_DIR, "data", "jobs.csv"))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB  = os.getenv("MONGO_DB", "compass")
os.makedirs(UPLOAD_DIR, exist_ok=True)

engine: CareerRecommender | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    # Init MongoDB
    init_db(MONGO_URI, MONGO_DB)
    print(f"Connected to MongoDB: {MONGO_DB}")
    # Load recommendation engine
    print(f"Loading engine from: {CSV_PATH}")
    engine = CareerRecommender(CSV_PATH)
    yield
    print("Shutting down.")


# ─────────────────────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="TuniData Compass API",
    version="3.0.0",
    description="Career recommendation engine with MongoDB + profile auto-fill.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ─────────────────────────────────────────────────────────────
# REQUEST / RESPONSE SCHEMAS
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
    job_id: str
    cover_letter: Optional[str] = None


class SaveJobRequest(BaseModel):
    job_id: str


class JobResult(BaseModel):
    id: str
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
    description: Optional[str] = None


class FreshAlternative(BaseModel):
    id: str
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
    profile_sections: Optional[dict] = None


class JobsListResponse(BaseModel):
    jobs: list[dict]
    total: int
    page: int
    pages: int
    domains: list[str]


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
# JOBS BROWSE — exposes real CSV data with pagination + filters
# ─────────────────────────────────────────────────────────────
@app.get("/jobs", tags=["Jobs"], response_model=JobsListResponse)
def list_jobs(
    search: str = Query("", description="Search title or company"),
    domain: str = Query("", description="Filter by domain"),
    freshness: str = Query("", description="fresh|aging|expired"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
):
    if not engine:
        raise HTTPException(503, "Engine not loaded.")

    df = engine.df.copy()

    # Filters
    if search:
        mask = (
            df["title"].str.contains(search, case=False, na=False) |
            df["company"].str.contains(search, case=False, na=False)
        )
        df = df[mask]

    if domain:
        df = df[df["domain"] == domain]

    if freshness:
        df = df[df["freshness_label"] == freshness]

    total = len(df)
    pages = max(1, math.ceil(total / per_page))
    page  = min(page, pages)
    start = (page - 1) * per_page
    end   = start + per_page
    slice_df = df.iloc[start:end]

    jobs = []
    for idx, row in slice_df.iterrows():
        link_col = next(
            (c for c in ["job_link", "url", "link", "apply_url"]
             if c in row.index and str(row[c]) not in ("", "nan", "None")),
            None
        )
        jobs.append({
            "id": str(idx),
            "title": str(row.get("title", "N/A")),
            "company": str(row.get("company", "N/A")),
            "location": str(row.get("location", "N/A")),
            "domain": str(row.get("domain", "N/A")),
            "freshness": str(row.get("freshness_label", "unknown")),
            "days_old": int(row.get("days_old", 0)),
            "skills": list(row.get("skills_list", [])),
            "apply_url": str(row[link_col]) if link_col else None,
            "description": str(row.get("description", ""))[:400] if "description" in row.index else None,
        })

    all_domains = sorted(engine.df["domain"].unique().tolist())
    return JobsListResponse(jobs=jobs, total=total, page=page, pages=pages, domains=all_domains)


@app.get("/jobs/{job_id}", tags=["Jobs"])
def get_job(job_id: str):
    if not engine:
        raise HTTPException(503, "Engine not loaded.")
    try:
        idx = int(job_id)
        row = engine.df.iloc[idx]
    except (ValueError, IndexError):
        raise HTTPException(404, "Job not found.")

    link_col = next(
        (c for c in ["job_link", "url", "link", "apply_url"]
         if c in row.index and str(row[c]) not in ("", "nan", "None")),
        None
    )
    return {
        "id": job_id,
        "title": str(row.get("title", "N/A")),
        "company": str(row.get("company", "N/A")),
        "location": str(row.get("location", "N/A")),
        "domain": str(row.get("domain", "N/A")),
        "freshness": str(row.get("freshness_label", "unknown")),
        "days_old": int(row.get("days_old", 0)),
        "skills": list(row.get("skills_list", [])),
        "apply_url": str(row[link_col]) if link_col else None,
        "description": str(row.get("description", ""))[:2000] if "description" in row.index else None,
    }


# ─────────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────────
@app.post("/auth/register", tags=["Auth"], response_model=TokenResponse)
async def register(data: UserCreate):
    user, token = await register_user(data)
    return TokenResponse(access_token=token, user=user)


@app.post("/auth/login", tags=["Auth"], response_model=TokenResponse)
async def login(data: UserLogin):
    return await login_user(data)


@app.get("/auth/me", tags=["Auth"], response_model=UserPublic)
async def me(current_user: UserPublic = Depends(get_current_user)):
    return current_user


# ─────────────────────────────────────────────────────────────
# USER / PROFILE
# ─────────────────────────────────────────────────────────────
@app.put("/users/me", tags=["User"], response_model=UserPublic)
async def update_profile(
    data: UserUpdate,
    current_user: UserPublic = Depends(get_current_user),
):
    return await update_user(current_user.id, data)


@app.delete("/users/me", tags=["User"])
async def delete_account_route(current_user: UserPublic = Depends(get_current_user)):
    await delete_account(current_user.id)
    return {"detail": "Account deleted."}


@app.post("/users/me/cv", tags=["User"], response_model=UserPublic)
async def upload_cv(
    file: UploadFile = File(...),
    current_user: UserPublic = Depends(get_current_user),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted.")
    if not engine:
        raise HTTPException(503, "Engine not loaded.")

    contents = await file.read()
    safe_name = f"{current_user.id}_{uuid.uuid4().hex[:8]}.pdf"
    path = os.path.join(UPLOAD_DIR, safe_name)
    with open(path, "wb") as f:
        f.write(contents)

    # Update cv_filename
    await set_cv(current_user.id, safe_name)

    # Extract skills + profile sections
    vocab = set(engine.skill_vectorizer.vocabulary_.keys())
    try:
        result = parse_cv_full(contents, vocab)
    except ValueError:
        # Still save the CV even if parsing fails
        from auth import get_user_by_id
        from auth import _doc_to_user
        doc = await get_user_by_id(current_user.id)
        return _doc_to_user(doc)

    # Build ProfileSection object
    ps = result.get("profile_sections", {})
    sections = ProfileSection(
        summary=ps.get("summary") or None,
        experience=ps.get("experience", []),
        education=ps.get("education", []),
        languages=ps.get("languages", []),
        certifications=ps.get("certifications", []),
    )

    # Merge into user profile
    updated = await update_user_cv_sections(
        current_user.id,
        sections,
        result.get("extracted_skills", [])
    )
    return updated


@app.post("/users/me/save-job", tags=["User"])
async def save_job_route(
    data: SaveJobRequest,
    current_user: UserPublic = Depends(get_current_user),
):
    saved = await save_job(current_user.id, data.job_id)
    return {"saved_jobs": saved}


@app.delete("/users/me/save-job/{job_id}", tags=["User"])
async def unsave_job_route(
    job_id: str,
    current_user: UserPublic = Depends(get_current_user),
):
    saved = await unsave_job(current_user.id, job_id)
    return {"saved_jobs": saved}


@app.post("/users/me/apply", tags=["User"])
async def apply_job_route(
    data: ApplyRequest,
    current_user: UserPublic = Depends(get_current_user),
):
    applied = await mark_applied(current_user.id, data.job_id, data.cover_letter or "")
    return {"applied_jobs": applied, "cover_letter_received": bool(data.cover_letter)}


# ─────────────────────────────────────────────────────────────
# RECOMMENDER
# ─────────────────────────────────────────────────────────────
@app.post("/recommend", tags=["Recommender"], response_model=RecommendResponse)
async def recommend(
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
    raw_jobs = engine.score_all_jobs(valid_skills, top_n=request.top_n)
    has_expired = any(j["expired_warning"] for j in raw_jobs)
    fresh_alts = engine.find_fresh_alternatives(valid_skills) if has_expired else []

    # Add sequential IDs from engine dataframe
    top_jobs = []
    for job in raw_jobs:
        # Find the index in the dataframe by title+company match
        match = engine.df[
            (engine.df["title"] == job["title"]) &
            (engine.df["company"] == job["company"])
        ]
        job_id = str(match.index[0]) if not match.empty else "0"
        top_jobs.append(JobResult(id=job_id, **{k: v for k, v in job.items()}))

    alts = []
    for alt in fresh_alts:
        match = engine.df[
            (engine.df["title"] == alt["title"]) &
            (engine.df["company"] == alt["company"])
        ]
        alt_id = str(match.index[0]) if not match.empty else "0"
        alts.append(FreshAlternative(id=alt_id, **{k: v for k, v in alt.items()}))

    return RecommendResponse(
        input_skills=valid_skills,
        unknown_skills=validation["unknown"],
        expanded_aliases=validation["expanded"],
        domain_ranking=[DomainScore(**d) for d in domain_ranking],
        top_jobs=top_jobs,
        fresh_alternatives=alts,
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
        result = parse_cv_full(contents, vocab)
    except ValueError as e:
        raise HTTPException(422, str(e))
    if result["count"] == 0:
        raise HTTPException(422, "No recognisable skills found in CV.")
    return ParsedSkillsResponse(
        extracted_skills=result["extracted_skills"],
        count=result["count"],
        profile_sections=result.get("profile_sections"),
    )


@app.post("/parse-text", tags=["Parser"], response_model=ParsedSkillsResponse)
def parse_text_endpoint(request: FreeTextRequest):
    if not engine:
        raise HTTPException(503, "Engine not loaded.")
    vocab = set(engine.skill_vectorizer.vocabulary_.keys())
    result = parse_free_text(request.text, vocab)
    if result["count"] == 0:
        raise HTTPException(422, "No recognisable skills found in text.")
    return ParsedSkillsResponse(
        extracted_skills=result["extracted_skills"],
        count=result["count"],
    )


# ─────────────────────────────────────────────────────────────
# DASHBOARD STATS
# ─────────────────────────────────────────────────────────────
@app.get("/stats/market", tags=["Stats"])
def market_stats():
    """Returns real job market stats from the CSV."""
    if not engine:
        raise HTTPException(503, "Engine not loaded.")
    df = engine.df
    domain_counts = df.groupby("domain").size().to_dict()
    freshness_counts = df["freshness_label"].value_counts().to_dict()
    return {
        "total_jobs": len(df),
        "total_domains": len(engine.domain_names),
        "domain_counts": domain_counts,
        "freshness_counts": freshness_counts,
        "fresh_jobs": int(freshness_counts.get("fresh", 0)),
        "aging_jobs": int(freshness_counts.get("aging", 0)),
        "expired_jobs": int(freshness_counts.get("expired", 0)),
    }
