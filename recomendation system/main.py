
from __future__ import annotations
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from recommender import CareerRecommender

# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────

import os


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.getenv("CSV_PATH", os.path.join(BASE_DIR, "data", "jobs.csv"))

# ─────────────────────────────────────────────────────────────
# ENGINE — loaded once at startup
# ─────────────────────────────────────────────────────────────

engine: CareerRecommender | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the recommender engine when the server starts."""
    global engine
    print(f"Loading engine from: {CSV_PATH}")
    engine = CareerRecommender(CSV_PATH)
    yield
    print("Shutting down.")


# ─────────────────────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "Career Recommender API",
    description = (
        "TF-IDF + Cosine Similarity career recommender.\n\n"
        "Enter your skills to get matching job posts and career domains.\n\n"
        "**Supported shortcuts:** `ml` → machine learning | `ci/cd` → ci cd"
    ),
    version     = "1.0.0",
    lifespan    = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    skills: list[str] = Field(
        ...,
        description = "List of your skills. Shortcuts like 'ml' and 'ci/cd' are supported.",
    )
    top_n: int = Field(
        default     = 3,
        ge          = 1,
        le          = 10,
        description = "Number of job results to return (1–10).",
    )

class MissingSkillsRequest(BaseModel):
    skills: list[str] = Field(
        ...,
        description = "Your current skills.",
    )
    domain: str = Field(
        ...,
        description = "The target domain to analyze your skill gaps against.",
    )
    top_n: int = Field(
        default     = 6,
        ge          = 1,
        le          = 25,
        description = "Number of missing skills to return.",
    )

class JobResult(BaseModel):
    title          : str
    company        : str
    location       : str
    domain         : str
    score          : float = Field(description="Combined match score (0–1)")
    job_match      : float = Field(description="Job-level skill similarity (0–1)")
    domain_fit     : float = Field(description="Domain profile similarity (0–1)")
    freshness      : str   = Field(description="fresh / aging / expired / unknown")
    days_old       : int
    matched_skills : list[str]
    skill_gaps     : list[str]
    apply_url      : Optional[str]
    expired_warning: bool

class FreshAlternative(BaseModel):
    title    : str
    company  : str
    location : str
    score    : float
    freshness: str
    days_old : int
    apply_url: Optional[str]

class DomainScore(BaseModel):
    domain: str
    score : float = Field(description="Cosine similarity score (0–1)")

class RecommendResponse(BaseModel):
    input_skills        : list[str]  = Field(description="Skills after normalization")
    unknown_skills      : list[str]  = Field(description="Skills not found in job data")
    expanded_aliases    : dict       = Field(description="Aliases that were auto-expanded")
    domain_ranking      : list[DomainScore]
    top_jobs            : list[JobResult]
    fresh_alternatives  : list[FreshAlternative] = Field(
        description="Shown only when top results contain expired posts"
    )

class MissingSkill(BaseModel):
    skill     : str
    importance: float = Field(description="Importance score relative to domain top skill (0–1)")
    level     : str   = Field(description="critical / important / useful")

class MissingSkillsResponse(BaseModel):
    domain        : str
    input_skills  : list[str]
    missing_skills: list[MissingSkill]


# ─────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"], summary="Health check")
def health():
    """Returns API status and whether the engine is loaded."""
    return {
        "status" : "ok",
        "engine" : "loaded" if engine is not None else "not loaded",
        "domains": len(engine.domain_names) if engine else 0,
        "jobs"   : len(engine.df) if engine else 0,
    }


@app.get(
    "/domains",
    tags      = ["System"],
    summary   = "List all available career domains",
    response_model = list[str],
)
def get_domains():
    """Returns a sorted list of all career domains in the dataset."""
    if engine is None:
        raise HTTPException(status_code=503, detail="Engine not loaded yet.")
    return engine.list_domains()


@app.post(
    "/recommend",
    tags           = ["Recommender"],
    summary        = "Get job recommendations based on your skills",
    response_model = RecommendResponse,
)
def recommend(request: RecommendRequest):
    """
    **Input:** a list of your skills (shortcuts like `ml`, `ci/cd` are supported).

    **Returns:**
    - Domain ranking (all domains sorted by cosine similarity)
    - Top N matching job posts with freshness info
    - Fresh alternatives if any top result is expired (>60 days old)
    - Any skills that were not recognized in the dataset

    **Scoring formula:**
    `final_score = 0.65 × job_skill_similarity + 0.35 × domain_profile_similarity`
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Engine not loaded yet.")

    # Validate and normalize input skills
    validation = engine.validate_skills(request.skills)
    valid_skills = validation["valid"]

    if not valid_skills:
        raise HTTPException(
            status_code=422,
            detail=(
                "None of the provided skills were recognized in the job data. "
                f"Unrecognized: {validation['unknown']}. "
                "Try using full skill names (e.g. 'machine learning' instead of 'mlearn')."
            ),
        )

    # Domain ranking
    domain_ranking = engine.rank_domains(valid_skills)

    # Top jobs
    top_jobs = engine.score_all_jobs(valid_skills, top_n=request.top_n)

    # Fresh alternatives for any expired top result
    has_expired     = any(j["expired_warning"] for j in top_jobs)
    fresh_alts      = engine.find_fresh_alternatives(valid_skills) if has_expired else []

    return RecommendResponse(
        input_skills      = valid_skills,
        unknown_skills    = validation["unknown"],
        expanded_aliases  = validation["expanded"],
        domain_ranking    = [DomainScore(**d) for d in domain_ranking],
        top_jobs          = [JobResult(**j) for j in top_jobs],
        fresh_alternatives= [FreshAlternative(**a) for a in fresh_alts],
    )


@app.post(
    "/missing-skills",
    tags           = ["Recommender"],
    summary        = "Get skill gaps for a specific domain",
    response_model = MissingSkillsResponse,
)
def missing_skills(request: MissingSkillsRequest):
    """
    **Input:** your skills + a target domain name.

    **Returns:** the top skills you are missing for that domain,
    each with an importance score and urgency level:
    - `critical`  — importance ≥ 70%
    - `important` — importance ≥ 40%
    - `useful`    — importance < 40%

    Use `GET /domains` to see all valid domain names.
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Engine not loaded yet.")

    # Validate domain
    if request.domain not in engine.domain_names:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Domain '{request.domain}' not found. "
                f"Use GET /domains to see all valid options."
            ),
        )

    # Validate skills
    validation   = engine.validate_skills(request.skills)
    valid_skills = validation["valid"]

    # Still run even if some skills are unknown
    missing = engine.get_missing_skills(valid_skills, request.domain, request.top_n)

    return MissingSkillsResponse(
        domain         = request.domain,
        input_skills   = valid_skills,
        missing_skills = [MissingSkill(**m) for m in missing],
    )