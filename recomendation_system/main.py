from __future__ import annotations

import os
import uuid
import math
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, HTTPException, Depends, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from semantic_recommender import SemanticRecommender
from cv_parser import parse_cv_full, parse_free_text
from cover_letter import generate_cover_letter, generate_cover_letter_stream
from auth import (
    UserCreate, UserLogin, UserUpdate, UserPublic, TokenResponse, ProfileSection,
    register_user, login_user, update_user, update_user_cv_sections,
    save_job, unsave_job, mark_applied, set_cv, delete_account,
    get_current_user, get_optional_user, init_db, get_user_by_id,
)

# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
CSV_PATH   = os.getenv("CSV_PATH", os.path.join(BASE_DIR, "data", "jobs.csv"))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
MONGO_URI  = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB   = os.getenv("MONGO_DB", "compass")
os.makedirs(UPLOAD_DIR, exist_ok=True)

engine: SemanticRecommender | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    init_db(MONGO_URI, MONGO_DB)
    print(f"Connected to MongoDB: {MONGO_DB}")
    print(f"Loading semantic engine from: {CSV_PATH}")
    engine = SemanticRecommender(CSV_PATH, cache_dir=os.path.join(BASE_DIR, "data"))
    yield
    print("Shutting down.")


# ─────────────────────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="TuniData Compass API",
    version="4.0.0",
    description="Semantic career recommender with AI cover letters.",
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
# SCHEMAS
# ─────────────────────────────────────────────────────────────
class RecommendRequest(BaseModel):
    skills: list[str] = Field(..., description="List of skills")
    top_n: int = Field(default=6, ge=1, le=20)
    cv_text: Optional[str] = None
    bio: Optional[str] = None
    experience: Optional[list[dict]] = None


class MissingSkillsRequest(BaseModel):
    skills: list[str]
    domain: str
    top_n: int = Field(default=8, ge=1, le=25)


class FreeTextRequest(BaseModel):
    text: str = Field(..., min_length=20)


class CoverLetterRequest(BaseModel):
    job_id: str
    user_skills: Optional[list[str]] = None
    custom_note: Optional[str] = None  # Extra context from user


class ApplyRequest(BaseModel):
    job_id: str
    cover_letter: Optional[str] = None
    auto_generate: bool = Field(default=False, description="Auto-generate cover letter with AI")


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
    semantic_score: float = 0.0
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
    semantic_enabled: bool = False


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


class CoverLetterResponse(BaseModel):
    cover_letter: str
    job_title: str
    company: str


# ─────────────────────────────────────────────────────────────
# SYSTEM
# ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health():
    return {
        "status": "ok",
        "engine": "loaded" if engine else "not loaded",
        "semantic": engine is not None and engine.job_embeddings is not None,
        "domains": len(engine.domain_names) if engine else 0,
        "jobs": len(engine.df) if engine else 0,
    }


@app.get("/domains", tags=["System"], response_model=list[str])
def get_domains():
    if not engine:
        raise HTTPException(503, "Engine not loaded.")
    return engine.list_domains()


# ─────────────────────────────────────────────────────────────
# JOBS BROWSE
# ─────────────────────────────────────────────────────────────
@app.get("/jobs", tags=["Jobs"], response_model=JobsListResponse)
def list_jobs(
    search: str = Query(""),
    domain: str = Query(""),
    freshness: str = Query(""),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    semantic_query: str = Query("", description="Semantic search query"),
):
    if not engine:
        raise HTTPException(503, "Engine not loaded.")

    df = engine.df.copy()

    # Keyword filters
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

    # Semantic re-ranking if query provided and embeddings available
    if semantic_query and engine.job_embeddings is not None and len(df) > 0:
        query_emb = engine.encode_query(semantic_query)
        if query_emb is not None:
            idxs = df.index.tolist()
            embs = engine.job_embeddings[idxs]
            sims = embs @ query_emb
            order = sims.argsort()[::-1]
            df = df.iloc[order]

    total = len(df)
    pages = max(1, math.ceil(total / per_page))
    page  = min(page, pages)
    start = (page - 1) * per_page
    slice_df = df.iloc[start:start + per_page]

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
            "description": str(row.get("description", ""))[:400]
                           if "description" in row.index else None,
        })

    all_domains = sorted(
        [d for d in engine.df["domain"].dropna().unique().tolist()
         if isinstance(d, str) and d.strip() and d != "Other"]
    )
    return JobsListResponse(jobs=jobs, total=total, page=page,
                            pages=pages, domains=all_domains)


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
        "description": str(row.get("description", ""))[:2000]
                       if "description" in row.index else None,
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

    await set_cv(current_user.id, safe_name)

    vocab = engine._tfidf_vocab
    try:
        result = parse_cv_full(contents, vocab)
    except ValueError:
        doc = await get_user_by_id(current_user.id)
        from auth import _doc_to_user
        return _doc_to_user(doc)

    ps = result.get("profile_sections", {})
    sections = ProfileSection(
        summary=ps.get("summary") or None,
        experience=ps.get("experience", []),
        education=ps.get("education", []),
        languages=ps.get("languages", []),
        certifications=ps.get("certifications", []),
    )
    updated = await update_user_cv_sections(
        current_user.id, sections, result.get("extracted_skills", [])
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
    """
    Real application endpoint.
    - Stores application in DB with cover letter
    - If auto_generate=True and no cover_letter provided, generates one with AI
    - If job has apply_url, returns it for redirect
    """
    if not engine:
        raise HTTPException(503, "Engine not loaded.")

    # Fetch job data
    try:
        job_idx = int(data.job_id)
        job_row = engine.df.iloc[job_idx]
    except (ValueError, IndexError):
        raise HTTPException(404, "Job not found.")

    job_skills = list(job_row.get("skills_list", []))
    job_description = str(job_row.get("description", ""))
    job_title = str(job_row.get("title", "N/A"))
    job_company = str(job_row.get("company", "N/A"))
    job_location = str(job_row.get("location", "N/A"))

    link_col = next(
        (c for c in ["job_link", "url", "link", "apply_url"]
         if c in job_row.index and str(job_row[c]) not in ("", "nan", "None")),
        None
    )
    apply_url = str(job_row[link_col]) if link_col else None

    cover_letter = data.cover_letter or ""

    # Auto-generate cover letter if requested and none provided
    if data.auto_generate and not cover_letter:
        try:
            # Get full user doc for experience/education
            user_doc = await get_user_by_id(current_user.id)
            matched_skills = [s for s in (current_user.skills or []) if s in job_skills]

            cover_letter = generate_cover_letter(
                user_name=f"{current_user.first_name} {current_user.last_name}",
                user_role=current_user.role,
                user_skills=current_user.skills or [],
                user_bio=current_user.bio or "",
                user_experience=user_doc.get("experience", []) if user_doc else [],
                user_education=user_doc.get("education", []) if user_doc else [],
                job_title=job_title,
                job_company=job_company,
                job_location=job_location,
                job_description=job_description,
                job_skills=job_skills,
                matched_skills=matched_skills,
            )
        except Exception as e:
            print(f"Cover letter generation failed: {e}")
            cover_letter = ""

    # Store application
    applied = await mark_applied(current_user.id, data.job_id, cover_letter)

    return {
        "applied_jobs": applied,
        "cover_letter": cover_letter,
        "cover_letter_generated": data.auto_generate and bool(cover_letter),
        "apply_url": apply_url,
        "job": {
            "title": job_title,
            "company": job_company,
            "location": job_location,
        }
    }


# ─────────────────────────────────────────────────────────────
# COVER LETTER — dedicated endpoint
# ─────────────────────────────────────────────────────────────
@app.post("/cover-letter/generate", tags=["Cover Letter"],
          response_model=CoverLetterResponse)
async def generate_cover_letter_endpoint(
    data: CoverLetterRequest,
    current_user: UserPublic = Depends(get_current_user),
):
    """Generate a tailored cover letter for a specific job."""
    if not engine:
        raise HTTPException(503, "Engine not loaded.")

    try:
        job_idx = int(data.job_id)
        job_row = engine.df.iloc[job_idx]
    except (ValueError, IndexError):
        raise HTTPException(404, "Job not found.")

    job_skills = list(job_row.get("skills_list", []))
    job_description = str(job_row.get("description", ""))
    job_title = str(job_row.get("title", "N/A"))
    job_company = str(job_row.get("company", "N/A"))
    job_location = str(job_row.get("location", "N/A"))

    user_skills = data.user_skills or current_user.skills or []
    matched_skills = [s for s in user_skills if s in job_skills]

    # Get full user doc for experience/education
    user_doc = await get_user_by_id(current_user.id)

    try:
        letter = generate_cover_letter(
            user_name=f"{current_user.first_name} {current_user.last_name}",
            user_role=current_user.role,
            user_skills=user_skills,
            user_bio=current_user.bio or "",
            user_experience=user_doc.get("experience", []) if user_doc else [],
            user_education=user_doc.get("education", []) if user_doc else [],
            job_title=job_title,
            job_company=job_company,
            job_location=job_location,
            job_description=job_description,
            job_skills=job_skills,
            matched_skills=matched_skills,
        )
    except RuntimeError as e:
        raise HTTPException(503, f"AI service unavailable: {e}")
    except Exception as e:
        raise HTTPException(500, f"Cover letter generation failed: {e}")

    return CoverLetterResponse(
        cover_letter=letter,
        job_title=job_title,
        company=job_company,
    )


@app.post("/cover-letter/stream", tags=["Cover Letter"])
async def stream_cover_letter(
    data: CoverLetterRequest,
    current_user: UserPublic = Depends(get_current_user),
):
    """Stream a tailored cover letter using SSE."""
    if not engine:
        raise HTTPException(503, "Engine not loaded.")

    try:
        job_idx = int(data.job_id)
        job_row = engine.df.iloc[job_idx]
    except (ValueError, IndexError):
        raise HTTPException(404, "Job not found.")

    job_skills = list(job_row.get("skills_list", []))
    job_description = str(job_row.get("description", ""))
    job_title = str(job_row.get("title", "N/A"))
    job_company = str(job_row.get("company", "N/A"))
    job_location = str(job_row.get("location", "N/A"))

    user_skills = data.user_skills or current_user.skills or []
    matched_skills = [s for s in user_skills if s in job_skills]
    user_doc = await get_user_by_id(current_user.id)

    def event_stream():
        try:
            for chunk in generate_cover_letter_stream(
                user_name=f"{current_user.first_name} {current_user.last_name}",
                user_role=current_user.role,
                user_skills=user_skills,
                user_bio=current_user.bio or "",
                user_experience=user_doc.get("experience", []) if user_doc else [],
                user_education=user_doc.get("education", []) if user_doc else [],
                job_title=job_title,
                job_company=job_company,
                job_location=job_location,
                job_description=job_description,
                job_skills=job_skills,
                matched_skills=matched_skills,
            ):
                # SSE format
                yield f"data: {chunk}\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


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

    # Build user embedding from all available data
    user_embedding = None
    if engine.model is not None:
        cv_text = request.cv_text
        bio = request.bio
        experience = request.experience

        # If authenticated, get full profile from DB
        if current_user:
            user_doc = await get_user_by_id(current_user.id)
            if user_doc:
                bio = bio or current_user.bio
                experience = experience or user_doc.get("experience", [])

        user_embedding = engine.encode_user_profile(
            skills=valid_skills,
            cv_text=cv_text,
            bio=bio,
            experience=experience,
        )

    domain_ranking = engine.rank_domains(valid_skills, user_embedding)
    raw_jobs = engine.score_all_jobs(valid_skills, user_embedding, top_n=request.top_n)
    has_expired = any(j["expired_warning"] for j in raw_jobs)
    fresh_alts = engine.find_fresh_alternatives(valid_skills, user_embedding) if has_expired else []

    top_jobs = []
    for job in raw_jobs:
        match = engine.df[
            (engine.df["title"] == job["title"]) &
            (engine.df["company"] == job["company"])
        ]
        job_id = str(match.index[0]) if not match.empty else "0"
        job_data = {k: v for k, v in job.items()}
        top_jobs.append(JobResult(id=job_id, **job_data))

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
        semantic_enabled=engine.job_embeddings is not None,
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
    vocab = engine._tfidf_vocab
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
    vocab = engine._tfidf_vocab
    result = parse_free_text(request.text, vocab)
    if result["count"] == 0:
        raise HTTPException(422, "No recognisable skills found in text.")
    return ParsedSkillsResponse(
        extracted_skills=result["extracted_skills"],
        count=result["count"],
    )


# ─────────────────────────────────────────────────────────────
# STATS
# ─────────────────────────────────────────────────────────────
@app.get("/stats/market", tags=["Stats"])
def market_stats():
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
        "semantic_enabled": engine.job_embeddings is not None,
    }
