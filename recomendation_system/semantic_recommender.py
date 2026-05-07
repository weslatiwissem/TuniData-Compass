# ============================================================
# semantic_recommender.py
# Embedding-based career recommender using sentence-transformers
# Replaces TF-IDF with semantic similarity on job descriptions + CV
# ============================================================

from __future__ import annotations

import ast
import warnings
import os
import pickle
import numpy as np
import pandas as pd
from pathlib import Path

warnings.filterwarnings("ignore")

try:
    from sentence_transformers import SentenceTransformer
    SBERT_AVAILABLE = True
except ImportError:
    SBERT_AVAILABLE = False
    print("WARNING: sentence-transformers not installed. Falling back to TF-IDF.")

# ── Skill Aliases (kept for validate_skills compat) ──────────
SKILL_ALIASES = {
    "ml": "machine learning",
    "ci/cd": "ci cd",
    "nlp": "natural language processing",
    "dl": "deep learning",
    "cv": "computer vision",
    "k8s": "kubernetes",
}

EMBEDDING_CACHE_FILE = "embeddings_cache.pkl"
MODEL_NAME = "all-MiniLM-L6-v2"  # Fast, good quality, 384-dim


def normalize_skill(raw: str) -> tuple[str, str | None]:
    cleaned = raw.strip().lower()
    if cleaned in SKILL_ALIASES:
        return SKILL_ALIASES[cleaned], cleaned
    return cleaned, None


def _build_job_document(row: pd.Series) -> str:
    """Build a rich text document for a job, combining all available fields.
    
    The document is structured to maximise semantic similarity with user profiles:
    skills are repeated for emphasis, domain context is explicit.
    """
    parts = []

    title = str(row.get("title", "")).strip()
    if title and title != "nan":
        # Repeat title for emphasis — it's the strongest signal
        parts.append(f"Position: {title}. Role: {title}")

    domain = str(row.get("domain", "")).strip()
    if domain and domain not in ("nan", "Other"):
        parts.append(f"Field: {domain}")

    # Skills list — the core matching signal
    skills = row.get("skills_list", [])
    if isinstance(skills, str):
        try:
            skills = ast.literal_eval(skills)
        except Exception:
            skills = [s.strip() for s in skills.split(",") if s.strip()]
    if skills:
        skill_str = ", ".join(skills)
        # Repeat skills section to boost weight in cosine similarity
        parts.append(f"Required skills: {skill_str}")
        parts.append(f"Technologies: {skill_str}")

    company = str(row.get("company", "")).strip()
    if company and company != "nan":
        parts.append(f"Company: {company}")

    location = str(row.get("location", "")).strip()
    if location and location != "nan":
        parts.append(f"Location: {location}")

    # Description — use full content if available
    desc = str(row.get("description", "")).strip()
    if desc and desc not in ("nan", "None", ""):
        parts.append(f"Job description: {desc[:800]}")

    return ". ".join(parts)


class SemanticRecommender:
    """
    Embedding-based career recommender.
    Uses sentence-transformers to encode job descriptions and user CVs/skills
    for semantic similarity matching.
    """

    def __init__(self, csv_path: str, cache_dir: str = None):
        self.df = None
        self.domain_top_skills = None
        self.job_embeddings = None
        self.domain_embeddings = None
        self.domain_names = None
        self.model = None
        self.cache_dir = cache_dir or os.path.dirname(os.path.abspath(csv_path))
        
        # Keep a TF-IDF vectorizer for validate_skills compatibility
        self._tfidf_vocab = set()
        
        self._build(csv_path)

    def _build(self, csv_path: str):
        print("Building semantic recommendation engine...")
        df = pd.read_csv(csv_path)
        print(f"  Loaded {len(df)} jobs, {df['final_category'].nunique()} categories")

        df = df.drop(columns=[c for c in ["auto_category"] if c in df.columns])
        df = self._parse_dates(df)
        df = self._parse_skills(df)
        df = self._consolidate_categories(df)
        df["city"] = df["location"].apply(
            lambda loc: "unknown" if pd.isna(loc)
            else str(loc).split(",")[0].strip().lower()
        )

        self.df = df
        self._build_tfidf_vocab(df)
        self._build_domain_profiles(df)

        if SBERT_AVAILABLE:
            self._load_or_build_embeddings(df)
        else:
            print("  SBERT unavailable — semantic features disabled.")

        print("Engine ready.")

    def _parse_dates(self, df: pd.DataFrame) -> pd.DataFrame:
        TODAY = pd.Timestamp.today().normalize()
        if "date" not in df.columns:
            df["post_date"] = pd.NaT
            df["days_old"] = 0
            df["freshness_label"] = "unknown"
            return df
        df["post_date"] = pd.to_datetime(df["date"], format="%m/%d/%Y", errors="coerce")
        df["days_old"] = (TODAY - df["post_date"]).dt.days.fillna(9999).astype(int)
        df["freshness_label"] = df["days_old"].apply(
            lambda d: "fresh" if d <= 30 else ("aging" if d <= 60 else "expired")
        )
        return df

    def _parse_skills(self, df: pd.DataFrame) -> pd.DataFrame:
        def split_skills(val):
            if pd.isna(val) or str(val).strip() == "":
                return []
            return [s.strip().lower() for s in str(val).split(",") if s.strip()]
        df["skills_list"] = df["extracted_skills"].apply(split_skills)
        df["num_skills"] = df["skills_list"].apply(len)
        return df

    def _consolidate_categories(self, df: pd.DataFrame, min_jobs: int = 10) -> pd.DataFrame:
        from collections import Counter
        # Fill NaN final_category to avoid float comparisons
        df["final_category"] = df["final_category"].fillna("Other").astype(str).str.strip()
        counts = df["final_category"].value_counts()
        rare = counts[counts < min_jobs].index.tolist()
        df["domain"] = df["final_category"].apply(
            lambda x: "Other" if (x in rare or x == "" or x.lower() == "nan") else x
        )
        df = df[df["domain"] != "Other"].reset_index(drop=True)
        # Ensure domain column has no NaN/float values
        df["domain"] = df["domain"].fillna("Other").astype(str)
        df = df[df["domain"] != "Other"].reset_index(drop=True)
        return df

    def _build_tfidf_vocab(self, df: pd.DataFrame):
        """Build vocabulary for validate_skills compatibility."""
        all_skills = set()
        for skills in df["skills_list"]:
            for s in skills:
                all_skills.add(s.lower())
                # Add individual tokens too
                for tok in s.split():
                    all_skills.add(tok.lower())
        self._tfidf_vocab = all_skills

    def _build_domain_profiles(self, df: pd.DataFrame):
        from collections import Counter
        self.domain_top_skills = {}
        domain_sizes = df.groupby("domain").size()
        for domain, group in df.groupby("domain"):
            all_skills = []
            for skills in group["skills_list"]:
                all_skills.extend(skills)
            counts = Counter(all_skills)
            n_jobs = domain_sizes[domain]
            min_count = max(2, round(n_jobs * 0.10))
            filtered = [(s, c) for s, c in counts.most_common() if c >= min_count]
            self.domain_top_skills[domain] = filtered
        self.domain_names = list(self.domain_top_skills.keys())

    def _get_cache_path(self) -> Path:
        return Path(self.cache_dir) / EMBEDDING_CACHE_FILE

    def _csv_mtime(self) -> float:
        """Return the modification time of the source CSV (used as cache key)."""
        try:
            # Walk up from cache_dir to find the jobs.csv
            csv_candidates = list(Path(self.cache_dir).glob("*.csv"))
            if csv_candidates:
                return max(p.stat().st_mtime for p in csv_candidates)
        except Exception:
            pass
        return 0.0

    def _load_or_build_embeddings(self, df: pd.DataFrame):
        cache_path = self._get_cache_path()
        csv_mtime = self._csv_mtime()

        # Try loading cached embeddings
        if cache_path.exists():
            try:
                print("  Loading cached embeddings...")
                with open(cache_path, "rb") as f:
                    cache = pickle.load(f)
                cache_valid = (
                    cache.get("n_jobs") == len(df) and
                    cache.get("model") == MODEL_NAME and
                    abs(cache.get("csv_mtime", 0) - csv_mtime) < 1.0  # 1-second tolerance
                )
                if cache_valid:
                    self.job_embeddings = cache["job_embeddings"]
                    self.domain_embeddings = cache["domain_embeddings"]
                    self.model = SentenceTransformer(MODEL_NAME)
                    print(f"  Loaded embeddings from cache ({len(df)} jobs).")
                    return
                else:
                    print("  Cache stale (data changed), rebuilding embeddings...")
            except Exception as e:
                print(f"  Cache load failed: {e}")

        print(f"  Loading model: {MODEL_NAME}...")
        self.model = SentenceTransformer(MODEL_NAME)

        # Build job documents
        print("  Building job documents...")
        job_docs = [_build_job_document(row) for _, row in df.iterrows()]

        print(f"  Encoding {len(job_docs)} jobs (this takes ~1-2 min first time)...")
        self.job_embeddings = self.model.encode(
            job_docs,
            batch_size=64,
            show_progress_bar=True,
            normalize_embeddings=True,
        )

        # Build domain documents
        print("  Encoding domain profiles...")
        domain_docs = []
        for domain in self.domain_names:
            top_skills = self.domain_top_skills.get(domain, [])
            domain_jobs = df[df["domain"] == domain]
            # Combine domain name + top skills + sample job titles
            skill_text = ", ".join([s for s, _ in top_skills[:20]])
            sample_titles = " | ".join(domain_jobs["title"].head(10).tolist())
            domain_doc = f"Domain: {domain}. Key skills: {skill_text}. Example roles: {sample_titles}"
            domain_docs.append(domain_doc)

        self.domain_embeddings = self.model.encode(
            domain_docs,
            normalize_embeddings=True,
        )

        # Cache embeddings
        print("  Caching embeddings...")
        try:
            with open(cache_path, "wb") as f:
                pickle.dump({
                    "n_jobs": len(df),
                    "model": MODEL_NAME,
                    "csv_mtime": csv_mtime,
                    "job_embeddings": self.job_embeddings,
                    "domain_embeddings": self.domain_embeddings,
                }, f)
            print(f"  Embeddings cached to {cache_path}")
        except Exception as e:
            print(f"  Cache save failed: {e}")

    # ── Public API ────────────────────────────────────────────

    def encode_query(self, text: str) -> np.ndarray:
        """Encode a user query (skills text or CV text) into embedding."""
        if not SBERT_AVAILABLE or self.model is None:
            return None
        return self.model.encode([text], normalize_embeddings=True)[0]

    def encode_user_profile(self, skills: list[str], cv_text: str = None,
                             bio: str = None, experience: list[dict] = None) -> np.ndarray:
        """
        Build a rich user profile embedding from all available user data.
        Skills are weighted heavily; experience and bio provide semantic context.
        """
        parts = []

        if skills:
            skill_str = ", ".join(skills)
            # Repeat skills for stronger embedding signal
            parts.append(f"My skills: {skill_str}")
            parts.append(f"I am proficient in: {skill_str}")
            parts.append(f"Technical expertise: {skill_str}")

        if bio and len(bio) > 20:
            parts.append(f"About me: {bio}")

        if experience:
            exp_texts = []
            for exp in experience[:4]:
                exp_str = f"{exp.get('title', '')} at {exp.get('company', '')}"
                if exp.get("period"):
                    exp_str += f" ({exp['period']})"
                if exp.get("desc"):
                    exp_str += f": {exp['desc'][:250]}"
                exp_texts.append(exp_str)
            if exp_texts:
                parts.append(f"Work experience: {' | '.join(exp_texts)}")

        if cv_text and len(cv_text) > 50:
            # Use a larger chunk of CV for richer context
            parts.append(f"CV: {cv_text[:1500]}")

        if not parts:
            return None

        query = ". ".join(parts)
        return self.encode_query(query)

    def is_skill_known(self, skill: str) -> bool:
        tokens = skill.lower().split()
        return any(tok in self._tfidf_vocab for tok in tokens)

    def validate_skills(self, raw_skills: list[str]) -> dict:
        valid, unknown, expanded = [], [], {}
        for raw in raw_skills:
            skill, alias = normalize_skill(raw)
            if not self.is_skill_known(skill):
                unknown.append(raw)
            else:
                valid.append(skill)
                if alias:
                    expanded[alias] = skill
        return {"valid": valid, "unknown": unknown, "expanded": expanded}

    def rank_domains(self, user_skills: list[str],
                     user_embedding: np.ndarray = None) -> list[dict]:
        """Rank domains using embeddings if available, else skill overlap."""
        if self.domain_embeddings is not None and user_embedding is not None:
            sims = self.domain_embeddings @ user_embedding
            # Normalise to [0, 1] so scores are interpretable
            d_min, d_max = sims.min(), sims.max()
            if d_max > d_min:
                sims_norm = (sims - d_min) / (d_max - d_min)
            else:
                sims_norm = sims
            ranked = sorted(zip(self.domain_names, sims_norm),
                            key=lambda x: x[1], reverse=True)
            return [{"domain": d, "score": round(float(s), 4)} for d, s in ranked]

        # Fallback: skill overlap scoring
        user_set = set(s.lower() for s in user_skills)
        scores = []
        for domain in self.domain_names:
            top = self.domain_top_skills.get(domain, [])
            if not top:
                scores.append(0.0)
                continue
            max_count = top[0][1]
            overlap = sum(c / max_count for s, c in top[:20] if s in user_set)
            scores.append(overlap / max(1, len(top[:20])))

        ranked = sorted(zip(self.domain_names, scores), key=lambda x: x[1], reverse=True)
        return [{"domain": d, "score": round(float(s), 4)} for d, s in ranked]

    def get_missing_skills(self, user_skills: list[str],
                           domain: str, top_n: int = 8) -> list[dict]:
        user_lower = {s.lower() for s in user_skills}
        top = self.domain_top_skills.get(domain, [])
        max_count = top[0][1] if top else 1
        missing = []
        for skill, count in top:
            if skill not in user_lower:
                importance = round(count / max_count, 4)
                level = ("critical" if importance >= 0.7 else
                         "important" if importance >= 0.4 else "useful")
                missing.append({"skill": skill, "importance": importance, "level": level})
        return missing[:top_n]

    def score_all_jobs(self, user_skills: list[str],
                       user_embedding: np.ndarray = None,
                       job_weight: float = 0.40,
                       semantic_weight: float = 0.45,
                       domain_weight: float = 0.15,
                       top_n: int = 6) -> list[dict]:
        """
        Hybrid scorer combining skill overlap + semantic similarity + domain fit.

        Weights (when embeddings available):
          40% skill overlap  — exact keyword match, fast & reliable
          45% semantic sim   — embedding cosine similarity, catches paraphrasing
          15% domain fit     — domain-level embedding similarity

        Without embeddings: 65% skill + 35% domain.
        """
        n = len(self.df)

        # ── Skill overlap scores ──────────────────────────────
        user_set = set(s.lower() for s in user_skills)
        skill_scores = np.zeros(n)
        for i, skills in enumerate(self.df["skills_list"]):
            if not skills:
                continue
            overlap = sum(1 for s in skills if s.lower() in user_set)
            # Jaccard-like: overlap / union to avoid rewarding huge skill lists
            union = len(set(skills) | user_set)
            skill_scores[i] = overlap / max(1, union) * 2  # scale back up

        # ── Semantic embedding scores ─────────────────────────
        sem_scores = np.zeros(n)
        if self.job_embeddings is not None and user_embedding is not None:
            raw_sims = self.job_embeddings @ user_embedding  # cosine (normalised)
            # Soft-normalise: map to [0,1] using the 5th-95th percentile range
            # so outliers don't crush the useful signal
            p5, p95 = np.percentile(raw_sims, 5), np.percentile(raw_sims, 95)
            if p95 > p5:
                sem_scores = np.clip((raw_sims - p5) / (p95 - p5), 0.0, 1.0)
            else:
                sem_scores = raw_sims.clip(0, 1)

        # ── Domain scores ─────────────────────────────────────
        domain_idx_map = {name: i for i, name in enumerate(self.domain_names)}
        if self.domain_embeddings is not None and user_embedding is not None:
            domain_sims = self.domain_embeddings @ user_embedding
            # Normalise domain sims to [0,1]
            d_min, d_max = domain_sims.min(), domain_sims.max()
            if d_max > d_min:
                domain_sims = (domain_sims - d_min) / (d_max - d_min)
        else:
            domain_sims = np.array([
                sum(1 for s, _ in self.domain_top_skills.get(d, [])[:15] if s in user_set) /
                max(1, min(15, len(self.domain_top_skills.get(d, []))))
                for d in self.domain_names
            ])

        job_domain_scores = np.array([
            domain_sims[domain_idx_map.get(str(d), 0)]
            for d in self.df["domain"]
        ])

        # ── Combine ───────────────────────────────────────────
        if self.job_embeddings is not None and user_embedding is not None:
            combined = (job_weight * skill_scores +
                        semantic_weight * sem_scores +
                        domain_weight * job_domain_scores)
        else:
            combined = 0.65 * skill_scores + 0.35 * job_domain_scores

        # Take a generous pool; freshness sort below will trim to top_n
        top_indices = np.argsort(combined)[::-1][:top_n * 15]

        results = []
        seen = set()
        for idx in top_indices:
            job = self.df.iloc[idx]
            freshness = job.get("freshness_label", "unknown")
            days_old = int(job.get("days_old", 0))

            dedup_key = (str(job.get("title", "")), str(job.get("company", "")))
            if dedup_key in seen:
                continue
            seen.add(dedup_key)

            job_skills = job.get("skills_list", [])
            if isinstance(job_skills, str):
                try:
                    job_skills = ast.literal_eval(job_skills)
                except Exception:
                    job_skills = []

            overlap = [s for s in job_skills if s.lower() in user_set]
            gaps = [s for s in job_skills if s.lower() not in user_set][:5]

            link_col = next(
                (c for c in ["job_link", "url", "link", "apply_url"]
                 if c in job.index and pd.notna(job[c]) and
                 str(job[c]) not in ("", "nan", "None")),
                None,
            )

            semantic_score = float(sem_scores[idx]) if self.job_embeddings is not None else 0.0

            results.append({
                "title": str(job.get("title", "N/A")),
                "company": str(job.get("company", "N/A")),
                "location": str(job.get("location", "N/A")),
                "domain": str(job.get("domain", "N/A")),
                "score": round(float(combined[idx]), 4),
                "job_match": round(float(skill_scores[idx]), 4),
                "domain_fit": round(float(job_domain_scores[idx]), 4),
                "semantic_score": round(semantic_score, 4),
                "freshness": freshness,
                "days_old": days_old,
                "matched_skills": overlap,
                "skill_gaps": gaps,
                "apply_url": str(job[link_col]) if link_col else None,
                "expired_warning": freshness == "expired",
                "description": str(job.get("description", ""))[:500]
                               if "description" in job.index else "",
            })

        freshness_order = {"fresh": 0, "aging": 1, "unknown": 2, "expired": 3}
        results.sort(key=lambda r: (freshness_order[r["freshness"]], -r["score"]))
        return results[:top_n]

    def find_fresh_alternatives(self, user_skills: list[str],
                                user_embedding: np.ndarray = None,
                                top_n: int = 3) -> list[dict]:
        fresh_mask = self.df["freshness_label"].isin(["fresh", "aging"])
        fresh_idx = self.df.index[fresh_mask].tolist()
        if not fresh_idx:
            return []

        user_set = set(s.lower() for s in user_skills)

        if self.job_embeddings is not None and user_embedding is not None:
            fresh_embs = self.job_embeddings[fresh_idx]
            sem_sims = fresh_embs @ user_embedding
            # Also compute skill overlap for hybrid score
            skill_sims = np.array([
                sum(1 for s in self.df.iloc[i]["skills_list"] if s.lower() in user_set) /
                max(1, len(self.df.iloc[i]["skills_list"]))
                for i in fresh_idx
            ])
            # Normalise semantic
            p5, p95 = np.percentile(sem_sims, 5), np.percentile(sem_sims, 95)
            if p95 > p5:
                sem_norm = np.clip((sem_sims - p5) / (p95 - p5), 0.0, 1.0)
            else:
                sem_norm = sem_sims.clip(0, 1)
            sims = 0.55 * sem_norm + 0.45 * skill_sims
        else:
            sims = np.array([
                sum(1 for s in self.df.iloc[i]["skills_list"] if s.lower() in user_set) /
                max(1, len(self.df.iloc[i]["skills_list"]))
                for i in fresh_idx
            ])

        top_local = np.argsort(sims)[::-1][:top_n]
        alts = []
        for local_i in top_local:
            global_i = fresh_idx[local_i]
            job = self.df.iloc[global_i]
            link_col = next(
                (c for c in ["job_link", "url", "link", "apply_url"]
                 if c in job.index and pd.notna(job[c]) and
                 str(job[c]) not in ("", "nan", "None")),
                None,
            )
            alts.append({
                "title": str(job.get("title", "N/A")),
                "company": str(job.get("company", "N/A")),
                "location": str(job.get("location", "N/A")),
                "score": round(float(sims[local_i]), 4),
                "freshness": str(job.get("freshness_label", "unknown")),
                "days_old": int(job.get("days_old", 0)),
                "apply_url": str(job[link_col]) if link_col else None,
            })
        return alts

    def list_domains(self) -> list[str]:
        return sorted(self.domain_names)

    # ── Kept for legacy compatibility ─────────────────────────
    @property
    def skill_vectorizer(self):
        """Compatibility shim for code that checks skill_vectorizer.vocabulary_"""
        class FakeVectorizer:
            def __init__(self, vocab):
                self.vocabulary_ = {s: i for i, s in enumerate(vocab)}
        return FakeVectorizer(self._tfidf_vocab)
