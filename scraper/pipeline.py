# ============================================================
# scraper/pipeline.py
# Runs every 2 days via APScheduler.
# Scrapes LinkedIn + TanitJob + Keejob → classifies → merges into jobs.csv
#
# KEY CHANGES vs original:
#   - Scraping is NON-BLOCKING: website starts immediately
#   - Description fetching is PARALLEL (ThreadPoolExecutor)
#   - Domain classification runs inline, correctly, before CSV merge
#   - Scheduler runs in a background thread; FastAPI lifespan starts it
# ============================================================

from __future__ import annotations

import os
import re
import time
import logging
import threading
import pandas as pd
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

CSV_PATH     = os.getenv("CSV_PATH", "/app/data/jobs.csv")
LOCATION     = os.getenv("SCRAPE_LOCATION", "Tunisia")
MAX_JOBS     = int(os.getenv("MAX_JOBS_PER_RUN", "500"))
DESC_WORKERS = int(os.getenv("DESC_FETCH_WORKERS", "8"))   # parallel description fetchers

SEARCH_KEYWORDS = [
    # Data / BI
    "data engineer", "data scientist", "data analyst", "business intelligence",
    "machine learning engineer", "MLOps", "big data",
    # Software
    "software engineer", "backend developer", "frontend developer",
    "full stack developer", "java developer", "python developer",
    ".net developer", "php developer",
    # DevOps / Cloud
    "devops engineer", "cloud engineer", "SRE", "kubernetes", "terraform",
    # Mobile
    "mobile developer", "android developer", "ios developer", "flutter developer",
    # QA / Security
    "QA engineer", "test automation", "cybersecurity", "security engineer",
    # AI / NLP
    "AI engineer", "NLP engineer", "computer vision",
    # Management / Other tech
    "product manager", "scrum master", "SAP consultant", "ERP consultant",
    "IT project manager", "UX designer", "UI designer",
    # French keywords (Tunisian market)
    "ingénieur logiciel", "développeur fullstack", "ingénieur devops",
    "analyste données", "chef de projet IT", "consultant SAP",
]

# ─────────────────────────────────────────────────────────────
# DOMAIN CLASSIFICATION
# ─────────────────────────────────────────────────────────────

DOMAIN_RULES = [
    ("Cybersecurity", [
        "cybersecurity", "cyber security", "soc analyst", "soc engineer",
        "penetration test", "pentest", "red team", "blue team", "siem",
        "splunk", "security analyst", "information security", "infosec",
        "network security", "security engineer", "vulnerability",
        "analyste sécurité", "ingénieur sécurité", "sécurité informatique",
    ]),
    ("Data Science & ML", [
        "data scientist", "machine learning", "ml engineer", "mlops",
        "deep learning", "nlp engineer", "natural language processing",
        "computer vision", "ai engineer", "artificial intelligence",
        "statistician", "research scientist", "data science",
        "ingénieur ia", "ingénieur intelligence artificielle",
    ]),
    ("Data Engineering", [
        "data engineer", "data engineering", "ingénieur data",
        "big data engineer", "dataops", "data platform",
        "data infrastructure", "data pipeline", "etl developer",
        "spark engineer", "kafka engineer", "data architect",
        "ingénieur big data",
    ]),
    ("BI & Data Analysis", [
        "data analyst", "business analyst", "bi developer", "bi engineer",
        "business intelligence", "analyste bi", "analyste données",
        "analyste de données", "power bi", "tableau developer",
        "data lead", "reporting analyst", "data visualization",
        "analyste fonctionnel", "functional analyst",
    ]),
    ("DevOps & Cloud", [
        "devops", "cloud engineer", "cloud architect", "sre",
        "site reliability", "platform engineer", "infrastructure engineer",
        "kubernetes", "docker", "terraform", "ansible", "ci/cd",
        "aws engineer", "azure engineer", "gcp engineer",
        "ingénieur devops", "ingénieur cloud", "ingénieur infrastructure",
        "ingénieur systèmes", "system administrator", "linux administrator",
        "network administrator", "sysadmin",
    ]),
    ("Mobile Development", [
        "mobile developer", "android developer", "ios developer",
        "flutter developer", "react native developer", "swift developer",
        "kotlin developer", "mobile engineer",
        "développeur mobile", "développeur android", "développeur ios",
    ]),
    ("Frontend Development", [
        "frontend developer", "front-end developer", "frontend engineer",
        "react developer", "angular developer", "vue developer",
        "ui developer", "web developer", "javascript developer",
        "typescript developer", "nextjs developer",
        "développeur frontend", "développeur react", "développeur angular",
        "développeur web", "intégrateur web",
    ]),
    ("Backend Development", [
        "backend developer", "back-end developer", "backend engineer",
        "java developer", "java engineer", "spring developer",
        "python developer", "django developer", "fastapi developer",
        ".net developer", "c# developer", "php developer",
        "laravel developer", "node.js developer", "api developer",
        "développeur backend", "développeur java", "développeur python",
        "développeur .net", "développeur php",
    ]),
    ("Software Engineering", [
        "software engineer", "software developer", "ingénieur logiciel",
        "ingénieur développement", "fullstack", "full stack",
        "full-stack developer", "développeur fullstack",
        "développeur full stack", "software architect",
        "embedded software", "firmware engineer", "c++ developer",
        "ingénieur informatique", "développeur confirmé",
    ]),
    ("QA & Testing", [
        "qa engineer", "quality assurance", "test engineer",
        "automation test", "qa analyst", "software tester",
        "ingénieur test", "testeur", "qa lead", "test automation",
        "selenium", "cypress", "qa tester", "validation engineer",
    ]),
    ("IT Consulting & ERP", [
        "sap consultant", "erp consultant", "oracle consultant",
        "salesforce consultant", "odoo consultant", "ms dynamics",
        "functional consultant", "techno-functional",
        "consultant sap", "consultant erp", "consultant oracle",
        "consultant crm", "consultant fonctionnel",
    ]),
    ("Project Management", [
        "project manager", "product manager", "product owner",
        "scrum master", "agile coach", "delivery manager",
        "programme manager", "pmo",
        "chef de projet", "responsable projet", "manager it",
    ]),
    ("Design & UX", [
        "ux designer", "ui designer", "ux/ui", "product designer",
        "graphic designer", "motion designer", "visual designer",
        "web designer", "creative designer", "figma",
        "designer ux", "designer ui", "designer graphique",
    ]),
    ("IT Support & Infrastructure", [
        "it support", "helpdesk", "service desk", "technical support",
        "network engineer", "network technician", "system engineer",
        "support engineer", "it technician", "infrastructure",
        "technicien support", "technicien réseau", "administrateur réseau",
        "support technique", "technicien informatique",
    ]),
]

SKILL_KEYWORDS = [
    "python", "java", "javascript", "typescript", "c#", "c++", "php",
    "ruby", "go", "golang", "rust", "scala", "kotlin", "swift",
    "r ", "matlab", "bash", "shell",
    "react", "angular", "vue", "nextjs", "nuxtjs", "html", "css",
    "sass", "webpack", "vite", "jquery", "bootstrap", "tailwind",
    "django", "fastapi", "flask", "spring", "laravel", "express",
    "nestjs", "asp.net", ".net", "node.js", "nodejs", "rails",
    "pandas", "numpy", "scikit-learn", "sklearn", "tensorflow",
    "pytorch", "keras", "spark", "hadoop", "kafka", "airflow",
    "dbt", "snowflake", "databricks", "mlflow", "xgboost",
    "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "oracle", "sqlite", "cassandra", "dynamodb", "firebase",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
    "ansible", "jenkins", "gitlab", "github actions", "ci/cd",
    "linux", "nginx", "apache",
    "power bi", "tableau", "looker", "excel", "grafana", "kibana",
    "git", "rest api", "graphql", "microservices", "agile", "scrum",
    "jira", "figma", "photoshop",
    "machine learning", "deep learning", "nlp", "computer vision",
    "cybersecurity", "penetration testing", "siem",
    "sap", "salesforce", "odoo",
]


def assign_domain(title: str, description: str = "") -> str:
    """Assign a domain using title (primary) + description keywords.
    Title match wins — we check title alone first for speed and accuracy."""
    title_lower = str(title).lower()
    title_lower = re.sub(r"[^\w\s/]", " ", title_lower)

    # Title-only pass first (most reliable signal)
    for domain, keywords in DOMAIN_RULES:
        for kw in keywords:
            if kw in title_lower:
                return domain

    # Fallback to description (first 400 chars only — fast)
    if description:
        desc_lower = str(description)[:400].lower()
        desc_lower = re.sub(r"[^\w\s/]", " ", desc_lower)
        for domain, keywords in DOMAIN_RULES:
            for kw in keywords:
                if kw in desc_lower:
                    return domain

    return "Software Engineering"


def extract_skills(title: str, description: str) -> str:
    text = (str(title) + " " + str(description)).lower()
    found = [s for s in SKILL_KEYWORDS if s in text]
    return ", ".join(dict.fromkeys(found))


# ─────────────────────────────────────────────────────────────
# HTTP HELPERS
# ─────────────────────────────────────────────────────────────

def _get_headers() -> dict:
    return {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
    }


def _fetch_description(url: str, source: str) -> str:
    """Fetch a single job description page. Called in parallel."""
    try:
        import requests
        from bs4 import BeautifulSoup

        resp = requests.get(url, headers=_get_headers(), timeout=12)
        if resp.status_code != 200:
            return ""
        soup = BeautifulSoup(resp.text, "html.parser")

        selectors = {
            "linkedin": [".description__text", ".show-more-less-html__markup"],
            "tanitjob": [".job-description", "[class*='description']", "article", "main"],
            "keejob":   ["[class*='description']", "main article", "main"],
        }

        for sel in selectors.get(source, ["main"]):
            el = soup.select_one(sel)
            if el:
                text = el.get_text(" ", strip=True)
                if len(text) > 80:
                    return text[:2000]

        return ""
    except Exception:
        return ""


# ─────────────────────────────────────────────────────────────
# SCRAPERS  (list-only pass — NO per-job HTTP during listing)
# ─────────────────────────────────────────────────────────────

def _scrape_linkedin_listings(keywords: list[str], location: str,
                               max_per_keyword: int) -> list[dict]:
    """Collect job metadata from LinkedIn search pages (no per-job detail fetching yet)."""
    rows = []
    try:
        import requests
        from bs4 import BeautifulSoup

        headers = _get_headers()
        today = datetime.today().strftime("%m/%d/%Y")

        for kw in keywords:
            count = 0
            for start in range(0, max_per_keyword, 25):
                if count >= max_per_keyword:
                    break
                url = (
                    "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
                    f"?keywords={kw.replace(' ', '%20')}"
                    f"&location={location.replace(' ', '%20')}"
                    f"&start={start}&f_TPR=r2592000"
                )
                try:
                    resp = requests.get(url, headers=headers, timeout=20)
                    if resp.status_code != 200:
                        break
                    soup = BeautifulSoup(resp.text, "html.parser")
                    cards = soup.select("li")
                    if not cards:
                        break

                    for card in cards:
                        if count >= max_per_keyword:
                            break
                        try:
                            title_el   = card.select_one(".base-search-card__title")
                            company_el = card.select_one(".base-search-card__subtitle")
                            loc_el     = card.select_one(".job-search-card__location")
                            date_el    = card.select_one("time")
                            link_el    = card.select_one("a.base-card__full-link")

                            if not title_el:
                                continue

                            title   = title_el.get_text(strip=True)
                            company = company_el.get_text(strip=True) if company_el else ""
                            loc     = loc_el.get_text(strip=True) if loc_el else location
                            date    = date_el.get("datetime", today)[:10] if date_el else today
                            link    = link_el["href"].split("?")[0] if link_el and link_el.get("href") else ""

                            try:
                                d = datetime.strptime(date, "%Y-%m-%d")
                                date = d.strftime("%m/%d/%Y")
                            except Exception:
                                date = today

                            rows.append({
                                "title": title, "company": company, "location": loc,
                                "date": date, "job_link": link,
                                "description": "",   # filled later in parallel
                                "source": "linkedin",
                            })
                            count += 1
                        except Exception:
                            continue
                    time.sleep(1.0)
                except Exception as e:
                    log.warning(f"LinkedIn listing error (kw={kw}, start={start}): {e}")
                    break
            log.info(f"LinkedIn listings '{kw}': {count} found")
    except Exception as e:
        log.error(f"LinkedIn scrape failed: {e}", exc_info=True)
    return rows


def _scrape_tanitjob_listings(keywords: list[str], max_per_keyword: int) -> list[dict]:
    rows = []
    try:
        import requests
        from bs4 import BeautifulSoup

        headers = _get_headers()
        today = datetime.today().strftime("%m/%d/%Y")

        for kw in keywords:
            count = 0
            for page in range(1, 6):
                if count >= max_per_keyword:
                    break
                url = f"https://www.tanitjobs.com/jobs/?keyword={kw.replace(' ', '+')}&page={page}"
                try:
                    resp = requests.get(url, headers=headers, timeout=20)
                    if resp.status_code != 200:
                        break
                    soup = BeautifulSoup(resp.text, "html.parser")
                    cards = soup.select("article.job-item, .job-item, .job-listing") or soup.select("[class*='job']")
                    if not cards:
                        break

                    for card in cards:
                        if count >= max_per_keyword:
                            break
                        try:
                            title_el = (card.select_one("h2 a") or card.select_one(".job-title a")
                                        or card.select_one("h3 a"))
                            if not title_el:
                                continue
                            title   = title_el.get_text(strip=True)
                            href    = title_el.get("href", "")
                            link    = href if href.startswith("http") else "https://www.tanitjobs.com" + href
                            company_el = card.select_one(".company-name, [class*='company']")
                            company = company_el.get_text(strip=True) if company_el else ""
                            loc_el  = card.select_one(".location, [class*='location'], [class*='city']")
                            loc     = loc_el.get_text(strip=True) if loc_el else "Tunisia"
                            rows.append({
                                "title": title, "company": company, "location": loc,
                                "date": today, "job_link": link,
                                "description": "", "source": "tanitjob",
                            })
                            count += 1
                        except Exception:
                            continue
                    time.sleep(0.8)
                except Exception as e:
                    log.warning(f"TanitJob listing error (kw={kw}, page={page}): {e}")
                    break
            log.info(f"TanitJob listings '{kw}': {count} found")
    except Exception as e:
        log.error(f"TanitJob scrape failed: {e}", exc_info=True)
    return rows


def _scrape_keejob_listings(keywords: list[str], max_per_keyword: int) -> list[dict]:
    rows = []
    try:
        import requests
        from bs4 import BeautifulSoup

        headers = _get_headers()
        today = datetime.today().strftime("%m/%d/%Y")

        for kw in keywords:
            count = 0
            for page in range(1, 5):
                if count >= max_per_keyword:
                    break
                url = f"https://www.keejob.com/offres-emploi/?keywords={kw.replace(' ', '+')}&page={page}"
                try:
                    resp = requests.get(url, headers=headers, timeout=20)
                    if resp.status_code != 200:
                        break
                    soup = BeautifulSoup(resp.text, "html.parser")
                    articles = soup.select("article.bg-white, article[class*='job']")
                    if not articles:
                        break

                    for art in articles:
                        if count >= max_per_keyword:
                            break
                        try:
                            title_el = (art.select_one("h2 a") or art.select_one("[class*='title'] a")
                                        or art.select_one("a[href*='offres']"))
                            if not title_el:
                                continue
                            title   = title_el.get_text(strip=True)
                            href    = title_el.get("href", "")
                            link    = href if href.startswith("http") else "https://www.keejob.com" + href
                            company_el = art.select_one("p.text-sm, [class*='company']")
                            company = company_el.get_text(strip=True) if company_el else ""
                            loc_el  = art.select_one("[class*='location'] span, [class*='city']")
                            loc     = loc_el.get_text(strip=True) if loc_el else "Tunisia"
                            rows.append({
                                "title": title, "company": company, "location": loc,
                                "date": today, "job_link": link,
                                "description": "", "source": "keejob",
                            })
                            count += 1
                        except Exception:
                            continue
                    time.sleep(0.8)
                except Exception as e:
                    log.warning(f"Keejob listing error (kw={kw}, page={page}): {e}")
                    break
            log.info(f"Keejob listings '{kw}': {count} found")
    except Exception as e:
        log.error(f"Keejob scrape failed: {e}", exc_info=True)
    return rows


# ─────────────────────────────────────────────────────────────
# PARALLEL DESCRIPTION FETCHER
# ─────────────────────────────────────────────────────────────

def _fetch_descriptions_parallel(rows: list[dict], workers: int = 8) -> list[dict]:
    """
    Fetch job descriptions in parallel using a thread pool.
    Jobs that already have a domain via title-only classification are
    skipped to save bandwidth — description is only needed for the fallback.
    """
    # First classify by title only to know which ones need descriptions
    need_desc_idx = []
    for i, row in enumerate(rows):
        domain = assign_domain(row["title"], "")
        if domain == "Software Engineering":   # title was ambiguous — fetch description
            need_desc_idx.append(i)
        else:
            row["_domain_from_title"] = domain  # cache result

    log.info(f"  {len(need_desc_idx)}/{len(rows)} jobs need description fetch (title was ambiguous)")

    if not need_desc_idx:
        return rows

    # Only fetch for ambiguous jobs
    links_to_fetch = [(i, rows[i]["job_link"], rows[i]["source"]) for i in need_desc_idx
                      if rows[i]["job_link"]]

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(_fetch_description, link, source): idx
            for idx, link, source in links_to_fetch
        }
        done = 0
        for future in as_completed(futures):
            idx = futures[future]
            try:
                rows[idx]["description"] = future.result()
            except Exception:
                rows[idx]["description"] = ""
            done += 1
            if done % 20 == 0:
                log.info(f"  Descriptions: {done}/{len(links_to_fetch)} fetched")

    return rows


# ─────────────────────────────────────────────────────────────
# CLEAN & CLASSIFY
# ─────────────────────────────────────────────────────────────

def clean_and_classify(rows: list[dict]) -> pd.DataFrame:
    """Clean job rows and assign final_category + extracted_skills."""
    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)

    # Drop blank rows
    df = df[df["title"].notna() & (df["title"].str.strip() != "")].copy()

    for col in ["title", "company", "location", "description"]:
        df[col] = (df[col].fillna("").astype(str).str.strip()
                   .str.replace(r"\s+", " ", regex=True))

    # ── Domain classification ──────────────────────────────
    # Use cached title-only result if available, otherwise full classify
    def _get_domain(row):
        cached = row.get("_domain_from_title")
        if cached and cached != "Software Engineering":
            return cached
        return assign_domain(row["title"], row.get("description", ""))

    df["final_category"] = df.apply(_get_domain, axis=1)

    # Clean up helper column
    if "_domain_from_title" in df.columns:
        df = df.drop(columns=["_domain_from_title"])

    # ── Skill extraction ───────────────────────────────────
    df["extracted_skills"] = df.apply(
        lambda r: extract_skills(r["title"], r["description"]), axis=1
    )
    df["required_skills"] = ""

    log.info(f"Domain distribution after classification:\n"
             f"{df['final_category'].value_counts().to_string()}")

    return df.reset_index(drop=True)


# ─────────────────────────────────────────────────────────────
# MERGE INTO CSV
# ─────────────────────────────────────────────────────────────

def merge_into_csv(new_df: pd.DataFrame, csv_path: str) -> int:
    if new_df is None or new_df.empty:
        log.info("No new jobs to merge.")
        return 0

    path = Path(csv_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.exists():
        existing = pd.read_csv(csv_path)
        log.info(f"Existing CSV: {len(existing)} rows")
    else:
        existing = pd.DataFrame()
        log.info("No existing CSV — creating fresh.")

    all_cols = list(dict.fromkeys(list(existing.columns) + list(new_df.columns)))
    for col in all_cols:
        if col not in existing.columns:
            existing[col] = ""
        if col not in new_df.columns:
            new_df[col] = ""

    combined = pd.concat([existing, new_df[all_cols]], ignore_index=True)

    combined["_link_norm"] = (
        combined["job_link"].astype(str).str.strip().str.lower().str.rstrip("/")
    )
    has_link  = combined["_link_norm"].notna() & ~combined["_link_norm"].isin(["", "nan", "none"])
    df_linked = combined[has_link].drop_duplicates(subset=["_link_norm"], keep="last")
    df_nolink = combined[~has_link].drop_duplicates(subset=["title", "company"], keep="last")
    combined  = pd.concat([df_linked, df_nolink], ignore_index=True).drop(columns=["_link_norm"])
    combined  = combined.reset_index(drop=True)

    combined.to_csv(csv_path, index=False)
    added = max(0, len(combined) - (len(existing) if not existing.empty else 0))
    log.info(f"✓ CSV saved: {len(combined)} total rows (+{added} new)")
    return added


# ─────────────────────────────────────────────────────────────
# MAIN PIPELINE  (called by scheduler — runs in background thread)
# ─────────────────────────────────────────────────────────────

def run_pipeline():
    log.info("=" * 60)
    log.info("Starting scrape pipeline (background)...")
    log.info("=" * 60)

    n_kw       = len(SEARCH_KEYWORDS)
    li_per_kw  = min(15, max(5, MAX_JOBS // n_kw))
    tan_per_kw = min(20, max(8, MAX_JOBS // n_kw))
    kee_per_kw = min(15, max(5, MAX_JOBS // n_kw))

    # ── Phase 1: collect listings (fast — no per-job fetching) ──
    log.info("Phase 1: collecting job listings...")
    t0 = time.time()

    li_rows  = _scrape_linkedin_listings(SEARCH_KEYWORDS, LOCATION, li_per_kw)
    tan_rows = _scrape_tanitjob_listings(SEARCH_KEYWORDS, tan_per_kw)
    kee_rows = _scrape_keejob_listings(SEARCH_KEYWORDS, kee_per_kw)

    all_rows = li_rows + tan_rows + kee_rows
    log.info(f"Phase 1 done in {time.time()-t0:.1f}s — {len(all_rows)} raw listings")

    if not all_rows:
        log.warning("No listings collected. Aborting pipeline.")
        return 0

    # ── Phase 2: parallel description fetch (only for ambiguous titles) ──
    log.info(f"Phase 2: fetching descriptions in parallel ({DESC_WORKERS} workers)...")
    t1 = time.time()
    all_rows = _fetch_descriptions_parallel(all_rows, workers=DESC_WORKERS)
    log.info(f"Phase 2 done in {time.time()-t1:.1f}s")

    # ── Phase 3: classify & extract skills ──
    log.info("Phase 3: classifying domains and extracting skills...")
    df = clean_and_classify(all_rows)
    log.info(f"Phase 3 done — {len(df)} clean rows")

    # ── Phase 4: merge into CSV ──
    added = merge_into_csv(df, CSV_PATH)
    log.info(f"Pipeline complete. {added} new jobs added.")
    return added