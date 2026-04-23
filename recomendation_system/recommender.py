# ============================================================
# recommender.py
# Core engine — loaded once at startup by FastAPI
# ============================================================

import ast
import warnings
import numpy as np
import pandas as pd
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

warnings.filterwarnings("ignore")

# ── Alias map ────────────────────────────────────────────────
SKILL_ALIASES = {
    "ml"   : "machine learning",
    "ci/cd": "ci cd",
}


def normalize_skill(raw: str) -> tuple[str, str | None]:
    """
    Returns (normalized_skill, expanded_from) where expanded_from
    is the original alias if one was resolved, else None.
    """
    cleaned = raw.strip().lower()
    if cleaned in SKILL_ALIASES:
        return SKILL_ALIASES[cleaned], cleaned
    return cleaned, None


# ─────────────────────────────────────────────────────────────
# ENGINE CLASS
# ─────────────────────────────────────────────────────────────

class CareerRecommender:
    """
    Wraps the full pipeline. Instantiated once at app startup
    so the CSV is only loaded and the matrices only built once.
    """

    def __init__(self, csv_path: str):
        self.df               = None
        self.domain_top_skills= None
        self.skill_vectorizer = None
        self.job_skill_matrix = None
        self.domain_matrix    = None
        self.domain_names     = None
        self._build(csv_path)

    # ── Pipeline ─────────────────────────────────────────────

    def _build(self, csv_path: str):
        print("Building recommendation engine...")
        df = pd.read_csv(csv_path)
        print(f"  Loaded {len(df)} jobs, {df['final_category'].nunique()} categories")

        # Drop unused columns (keep date)
        df = df.drop(columns=[c for c in ["description", "auto_category"]
                               if c in df.columns])

        # Parse dates
        df = self._parse_dates(df)

        # Parse skills from comma-separated extracted_skills column
        df = self._parse_skills(df)

        # Consolidate rare categories
        df = self._consolidate_categories(df)

        # Normalize location to city
        df["city"] = df["location"].apply(
            lambda loc: "unknown" if pd.isna(loc)
            else str(loc).split(",")[0].strip().lower()
        )

        # Build domain profiles and TF-IDF matrices
        self.domain_top_skills = self._build_domain_profiles(df)
        (self.skill_vectorizer,
         self.job_skill_matrix,
         self.domain_matrix,
         self.domain_names) = self._build_matrices(df, self.domain_top_skills)

        self.df = df
        print("Engine ready.")

    def _parse_dates(self, df: pd.DataFrame) -> pd.DataFrame:
        TODAY = pd.Timestamp.today().normalize()
        if "date" not in df.columns:
            df["post_date"]       = pd.NaT
            df["days_old"]        = 0
            df["freshness_label"] = "unknown"
            return df

        def parse_date(val):
            if pd.isna(val) or str(val).strip() == "":
                return pd.NaT
            val = str(val).strip()
            for fmt in ("%m/%d/%Y", "%d/%m/%y", "%d/%m/%Y", "%Y-%m-%d", "%m/%d/%y"):
                try:
                    return pd.to_datetime(val, format=fmt)
                except ValueError:
                    continue
            return pd.to_datetime(val, errors="coerce")

        df["post_date"] = df["date"].apply(parse_date)
        # Clamp negative days to 0 (future dates treated as today)
        df["days_old"] = (TODAY - df["post_date"]).dt.days.fillna(9999).astype(int).clip(lower=0)
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
        df["num_skills"]  = df["skills_list"].apply(len)
        return df

    def _consolidate_categories(self, df: pd.DataFrame, min_jobs: int = 10) -> pd.DataFrame:
        df["final_category"] = df["final_category"].fillna("Other").astype(str)
        counts = df["final_category"].value_counts()
        rare   = counts[counts < min_jobs].index.tolist()
        df["domain"] = df["final_category"].apply(
            lambda x: "Other" if x in rare else x
        )
        df = df[df["domain"] != "Other"].reset_index(drop=True)
        return df

    def _build_domain_profiles(self, df: pd.DataFrame) -> dict:
        domain_top_skills = {}
        domain_sizes      = df.groupby("domain").size()
        for domain, group in df.groupby("domain"):
            all_skills = []
            for skills in group["skills_list"]:
                all_skills.extend(skills)
            counts     = Counter(all_skills)
            n_jobs     = domain_sizes[domain]
            # Keep skills appearing in at least 10% of jobs in this domain
            # (minimum 2, maximum ignored — use all qualifying skills)
            min_count  = max(2, round(n_jobs * 0.10))
            filtered   = [(s, c) for s, c in counts.most_common() if c >= min_count]
            domain_top_skills[domain] = filtered
        return domain_top_skills

    def _build_matrices(self, df: pd.DataFrame, domain_top_skills: dict):
        skill_strings = df["skills_list"].apply(lambda x: " ".join(x))
        skill_vectorizer = TfidfVectorizer(
            analyzer      = "word",
            token_pattern = r"[^\s]+",
            min_df        = 5,
            max_df        = 0.95,
            sublinear_tf  = True,
        )
        job_skill_matrix = skill_vectorizer.fit_transform(skill_strings)

        domain_names = list(domain_top_skills.keys())
        domain_docs  = []
        for domain in domain_names:
            top       = domain_top_skills[domain]
            max_count = top[0][1] if top else 1
            tokens    = []
            for skill, count in top:
                repeat = max(1, round(6 * count / max_count))
                tokens.extend([skill] * repeat)
            domain_docs.append(" ".join(tokens))

        domain_matrix = skill_vectorizer.transform(domain_docs)
        print(f"  Vocab size: {len(skill_vectorizer.vocabulary_)} | "
              f"Job matrix: {job_skill_matrix.shape}")
        return skill_vectorizer, job_skill_matrix, domain_matrix, domain_names

    # ── Public helpers ────────────────────────────────────────

    def is_skill_known(self, skill: str) -> bool:
        """True if any token of the skill is in the TF-IDF vocabulary."""
        vocab  = self.skill_vectorizer.vocabulary_
        tokens = skill.lower().split()
        return any(tok in vocab for tok in tokens)

    def validate_skills(self, raw_skills: list[str]) -> dict:
        """
        Normalizes and validates a list of raw skill strings.
        Returns:
          valid    : list of accepted normalized skill strings
          unknown  : list of strings not found in vocabulary
          expanded : dict of {alias: full_name} that were resolved
        """
        valid    = []
        unknown  = []
        expanded = {}
        for raw in raw_skills:
            skill, alias = normalize_skill(raw)
            if not self.is_skill_known(skill):
                unknown.append(raw)
            else:
                valid.append(skill)
                if alias:
                    expanded[alias] = skill
        return {"valid": valid, "unknown": unknown, "expanded": expanded}

    def rank_domains(self, user_skills: list[str]) -> list[dict]:
        """Rank all domains by cosine similarity to user skills."""
        user_vec = self.skill_vectorizer.transform([" ".join(user_skills)])
        scores   = cosine_similarity(user_vec, self.domain_matrix).flatten()
        ranked   = sorted(zip(self.domain_names, scores),
                          key=lambda x: x[1], reverse=True)
        return [{"domain": d, "score": round(float(s), 4)} for d, s in ranked]

    def get_missing_skills(self, user_skills: list[str],
                           domain: str, top_n: int = 8) -> list[dict]:
        """Skills the user lacks for a given domain, ordered by importance."""
        user_lower = {s.lower() for s in user_skills}
        top        = self.domain_top_skills.get(domain, [])
        max_count  = top[0][1] if top else 1
        missing    = []
        for skill, count in top:
            if skill not in user_lower:
                importance = round(count / max_count, 4)
                level = ("critical"  if importance >= 0.7 else
                         "important" if importance >= 0.4 else "useful")
                missing.append({"skill": skill, "importance": importance, "level": level})
        return missing[:top_n]

    def score_all_jobs(self, user_skills: list[str],
                       job_weight: float = 0.65,
                       domain_weight: float = 0.35,
                       top_n: int = 3) -> list[dict]:
        """
        Unified scorer across ALL jobs:
          score = 0.65 x sim(user, job skills) + 0.35 x sim(user, domain profile)
        Fresh/aging jobs ranked above expired ones.
        """
        user_vec = self.skill_vectorizer.transform([" ".join(user_skills)])

        job_sims        = cosine_similarity(user_vec, self.job_skill_matrix).flatten()
        domain_idx_map  = {n: i for i, n in enumerate(self.domain_names)}
        domain_col_sims = cosine_similarity(user_vec, self.domain_matrix).flatten()
        job_domain_sims = np.array([
            domain_col_sims[domain_idx_map.get(d, 0)]
            for d in self.df["domain"]
        ])

        combined    = job_weight * job_sims + domain_weight * job_domain_sims
        top_indices = np.argsort(combined)[::-1][:top_n * 10]

        results  = []
        seen     = set()   # deduplicate by (title, company)
        for idx in top_indices:
            job       = self.df.iloc[idx]
            freshness = job.get("freshness_label", "unknown")
            days_old  = int(job.get("days_old", 0))

            # Skip duplicate title+company combinations
            dedup_key = (job.get("title", ""), job.get("company", ""))
            if dedup_key in seen:
                continue
            seen.add(dedup_key)

            # Parse skills_list safely
            job_skills = job.get("skills_list", [])
            if isinstance(job_skills, str):
                try:    job_skills = ast.literal_eval(job_skills)
                except: job_skills = []

            user_set = set(user_skills)
            overlap  = [s for s in job_skills if s in user_set]
            gaps     = [s for s in job_skills if s not in user_set][:5]

            # Apply link
            link_col = next((c for c in ["job_link", "url", "link", "apply_url"]
                             if c in job.index and pd.notna(job[c])), None)

            results.append({
                "title"          : job.get("title", "N/A"),
                "company"        : job.get("company", "N/A"),
                "location"       : job.get("location", "N/A"),
                "domain"         : job.get("domain", "N/A"),
                "score"          : round(float(combined[idx]), 4),
                "job_match"      : round(float(job_sims[idx]), 4),
                "domain_fit"     : round(float(job_domain_sims[idx]), 4),
                "freshness"      : freshness,
                "days_old"       : days_old,
                "matched_skills" : overlap,
                "skill_gaps"     : gaps,
                "apply_url"      : job[link_col] if link_col else None,
                "expired_warning": freshness == "expired",
            })

        freshness_order = {"fresh": 0, "aging": 1, "unknown": 2, "expired": 3}
        results.sort(key=lambda r: (freshness_order[r["freshness"]], -r["score"]))
        return results[:top_n]

    def find_fresh_alternatives(self, user_skills: list[str],
                                top_n: int = 3) -> list[dict]:
        """Top fresh/aging jobs by skill similarity — used when top result is expired."""
        fresh_mask = self.df["freshness_label"].isin(["fresh", "aging"])
        fresh_idx  = self.df.index[fresh_mask].tolist()
        if not fresh_idx:
            return []
        user_vec  = self.skill_vectorizer.transform([" ".join(user_skills)])
        fresh_mat = self.job_skill_matrix[fresh_idx]
        sims      = cosine_similarity(user_vec, fresh_mat).flatten()
        top_local = np.argsort(sims)[::-1][:top_n]
        alts = []
        for local_i in top_local:
            global_i  = fresh_idx[local_i]
            job       = self.df.iloc[global_i]
            link_col  = next((c for c in ["job_link", "url", "link", "apply_url"]
                              if c in job.index and pd.notna(job[c])), None)
            alts.append({
                "title"    : job.get("title", "N/A"),
                "company"  : job.get("company", "N/A"),
                "location" : job.get("location", "N/A"),
                "score"    : round(float(sims[local_i]), 4),
                "freshness": job.get("freshness_label", "unknown"),
                "days_old" : int(job.get("days_old", 0)),
                "apply_url": job[link_col] if link_col else None,
            })
        return alts

    def list_domains(self) -> list[str]:
        return sorted(self.domain_names)