#!/usr/bin/env python3
"""
fast_scraper.py — High-speed parallel job scraper for Tunisia
Replaces the sequential scraper that took 45min.

Key improvements:
- ThreadPoolExecutor for parallel HTTP requests (20x faster)
- No per-job sleep delays (uses connection pooling instead)
- Aggressive timeout + retry logic
- Scrapes LinkedIn guest API, TanitJobs, Keejob in parallel
- Target: 500+ fresh jobs in < 5 minutes
"""

from __future__ import annotations

import os
import re
import time
import logging
import pandas as pd
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────
CSV_PATH = os.getenv("CSV_PATH", "data/jobs.csv")
MAX_WORKERS = 20          # parallel HTTP threads
REQUEST_TIMEOUT = 10      # seconds per request
MAX_JOBS_TOTAL = 600      # cap to avoid runaway scrapes

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

TUNISIAN_KEYWORDS = [
    # High-demand in Tunisia
    "data engineer", "data scientist", "data analyst",
    "software engineer", "backend developer", "frontend developer",
    "fullstack developer", "java developer", "python developer",
    "devops engineer", "cloud engineer", "machine learning",
    "cybersecurity", "mobile developer", "flutter",
    "react developer", "angular developer", ".net developer",
    "php developer", "QA engineer", "ai engineer",
    # French (Tunisian market)
    "ingénieur logiciel", "développeur", "ingénieur devops",
    "analyste données", "chef de projet IT",
]

DOMAIN_RULES = [
    ("Cybersecurity",        ["cybersecurity", "cyber security", "soc analyst", "penetration test", "pentest", "red team", "siem", "splunk", "security analyst", "information security", "infosec", "network security", "security engineer", "vulnerability", "analyste sécurité", "ingénieur sécurité"]),
    ("Data Science & ML",   ["data scientist", "machine learning", "ml engineer", "mlops", "deep learning", "nlp engineer", "natural language processing", "computer vision", "ai engineer", "artificial intelligence", "data science", "ingénieur ia"]),
    ("Data Engineering",    ["data engineer", "data engineering", "ingénieur data", "big data", "dataops", "etl developer", "spark engineer", "kafka engineer", "data architect", "data pipeline", "ingénieur big data"]),
    ("BI & Data Analysis",  ["data analyst", "business analyst", "bi developer", "business intelligence", "analyste bi", "power bi", "tableau developer", "reporting analyst", "analyste données"]),
    ("DevOps & Cloud",      ["devops", "cloud engineer", "cloud architect", "sre", "site reliability", "platform engineer", "kubernetes", "docker", "terraform", "ansible", "ci/cd", "aws engineer", "azure engineer", "ingénieur devops", "ingénieur cloud"]),
    ("Mobile Development",  ["mobile developer", "android developer", "ios developer", "flutter developer", "react native developer", "swift developer", "kotlin developer", "développeur mobile"]),
    ("Frontend Development",["frontend developer", "front-end developer", "react developer", "angular developer", "vue developer", "javascript developer", "nextjs developer", "développeur frontend", "développeur react"]),
    ("Backend Development", ["backend developer", "back-end developer", "java developer", "spring developer", "python developer", "django developer", ".net developer", "php developer", "laravel developer", "node.js developer", "développeur backend", "développeur java"]),
    ("Software Engineering",["software engineer", "software developer", "ingénieur logiciel", "fullstack", "full stack", "full-stack developer", "développeur fullstack", "software architect", "embedded software", "c++ developer"]),
    ("QA & Testing",        ["qa engineer", "quality assurance", "test engineer", "automation test", "qa analyst", "software tester", "ingénieur test", "selenium", "cypress"]),
    ("IT Consulting & ERP", ["sap consultant", "erp consultant", "salesforce consultant", "odoo consultant", "functional consultant", "consultant sap", "consultant erp"]),
    ("Project Management",  ["project manager", "product manager", "product owner", "scrum master", "agile coach", "chef de projet", "responsable projet"]),
    ("Design & UX",         ["ux designer", "ui designer", "ux/ui", "product designer", "graphic designer", "web designer", "figma", "designer ux"]),
]

SKILL_KEYWORDS = [
    "python", "java", "javascript", "typescript", "c#", "c++", "php", "ruby", "go", "golang",
    "rust", "scala", "kotlin", "swift", "bash", "shell", "perl", "r",
    "react", "angular", "vue", "nextjs", "html", "css", "sass", "webpack", "tailwind",
    "django", "fastapi", "flask", "spring", "laravel", "express", "nestjs", "asp.net", ".net", "node.js",
    "pandas", "numpy", "scikit-learn", "sklearn", "tensorflow", "pytorch", "keras", "spark", "hadoop",
    "kafka", "airflow", "dbt", "snowflake", "databricks", "mlflow", "xgboost",
    "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "oracle", "sqlite", "cassandra", "firebase",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible", "jenkins", "gitlab", "github actions",
    "linux", "nginx", "apache",
    "power bi", "tableau", "looker", "excel", "grafana", "kibana",
    "git", "rest api", "graphql", "microservices", "agile", "scrum", "jira", "figma",
    "machine learning", "deep learning", "nlp", "computer vision", "cybersecurity", "penetration testing",
    "sap", "salesforce", "odoo",
]


def assign_domain(title: str, description: str = "") -> str:
    text = (str(title) + " " + str(description)[:300]).lower()
    text = re.sub(r"[^\w\s/]", " ", text)
    for domain, keywords in DOMAIN_RULES:
        for kw in keywords:
            if kw in text:
                return domain
    return "Software Engineering"


def extract_skills(title: str, description: str) -> str:
    text = (str(title) + " " + str(description)).lower()
    found = [s for s in SKILL_KEYWORDS if s in text]
    return ", ".join(dict.fromkeys(found))


def make_session() -> requests.Session:
    """Create a session with connection pooling and retry logic."""
    session = requests.Session()
    retry = Retry(
        total=2,
        backoff_factor=0.3,
        status_forcelist=[500, 502, 503, 504],
        raise_on_status=False,
    )
    adapter = HTTPAdapter(
        max_retries=retry,
        pool_connections=30,
        pool_maxsize=30,
    )
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update(HEADERS)
    return session


# ── LinkedIn scraper ──────────────────────────────────────────

def _fetch_linkedin_page(session: requests.Session, kw: str, start: int) -> list[dict]:
    """Fetch one page of LinkedIn results (no description fetch — too slow)."""
    url = (
        "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
        f"?keywords={kw.replace(' ', '%20')}"
        "&location=Tunisia"
        f"&start={start}"
        "&f_TPR=r2592000"
    )
    today = datetime.today().strftime("%m/%d/%Y")
    try:
        resp = session.get(url, timeout=REQUEST_TIMEOUT)
        if resp.status_code != 200:
            return []
        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.select("li")
        jobs = []
        for card in cards:
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
                loc     = loc_el.get_text(strip=True) if loc_el else "Tunisia"
                raw_date = date_el.get("datetime", today)[:10] if date_el else today
                try:
                    d = datetime.strptime(raw_date, "%Y-%m-%d")
                    date = d.strftime("%m/%d/%Y")
                except Exception:
                    date = today
                link = link_el["href"].split("?")[0] if link_el and link_el.get("href") else ""
                jobs.append({
                    "title": title, "company": company, "location": loc,
                    "date": date, "job_link": link,
                    "description": "",  # skip description fetch for speed
                    "source": "linkedin",
                })
            except Exception:
                continue
        return jobs
    except Exception as e:
        log.debug(f"LinkedIn page error ({kw}, start={start}): {e}")
        return []


def scrape_linkedin_fast(keywords: list[str], max_per_keyword: int = 25) -> pd.DataFrame:
    """Parallel LinkedIn scraping — no description fetching (3x faster)."""
    log.info(f"LinkedIn: scraping {len(keywords)} keywords × {max_per_keyword} jobs...")
    session = make_session()
    tasks = []
    for kw in keywords:
        for start in range(0, max_per_keyword, 25):
            tasks.append((kw, start))

    all_jobs = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(_fetch_linkedin_page, session, kw, start): (kw, start)
                   for kw, start in tasks}
        for future in as_completed(futures):
            try:
                jobs = future.result()
                all_jobs.extend(jobs)
            except Exception:
                pass

    log.info(f"LinkedIn: collected {len(all_jobs)} raw jobs")
    return pd.DataFrame(all_jobs) if all_jobs else pd.DataFrame()


# ── TanitJobs scraper ─────────────────────────────────────────

def _fetch_tanitjob_page(session: requests.Session, kw: str, page: int) -> list[dict]:
    today = datetime.today().strftime("%m/%d/%Y")
    url = f"https://www.tanitjobs.com/jobs/?keyword={kw.replace(' ', '+')}&page={page}"
    try:
        resp = session.get(url, timeout=REQUEST_TIMEOUT)
        if resp.status_code != 200:
            return []
        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.select("article.job-item, .job-item, .job-listing")
        if not cards:
            cards = soup.select("[class*='job']")
        jobs = []
        for card in cards:
            try:
                title_el = (
                    card.select_one("h2 a") or card.select_one(".job-title a") or
                    card.select_one("h3 a") or card.select_one("a[class*='title']")
                )
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                href = title_el.get("href", "")
                link = href if href.startswith("http") else "https://www.tanitjobs.com" + href
                company_el = card.select_one(".company-name, [class*='company']")
                company = company_el.get_text(strip=True) if company_el else ""
                loc_el = card.select_one(".location, [class*='location'], [class*='city']")
                loc = loc_el.get_text(strip=True) if loc_el else "Tunisia"
                date_el = card.select_one("time, [class*='date']")
                date = today
                if date_el:
                    raw = date_el.get("datetime") or date_el.get_text(strip=True)
                    try:
                        d = datetime.strptime(raw[:10], "%Y-%m-%d")
                        date = d.strftime("%m/%d/%Y")
                    except Exception:
                        pass
                # Quick description from card preview
                desc_el = card.select_one("[class*='desc'], [class*='excerpt'], p")
                desc = desc_el.get_text(" ", strip=True)[:500] if desc_el else ""
                jobs.append({
                    "title": title, "company": company, "location": loc,
                    "date": date, "job_link": link, "description": desc,
                    "source": "tanitjob",
                })
            except Exception:
                continue
        return jobs
    except Exception as e:
        log.debug(f"TanitJob error ({kw}, page={page}): {e}")
        return []


def scrape_tanitjobs_fast(keywords: list[str], pages_per_kw: int = 3) -> pd.DataFrame:
    log.info(f"TanitJobs: scraping {len(keywords)} keywords × {pages_per_kw} pages...")
    session = make_session()
    tasks = [(kw, p) for kw in keywords for p in range(1, pages_per_kw + 1)]

    all_jobs = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(_fetch_tanitjob_page, session, kw, page): (kw, page)
                   for kw, page in tasks}
        for future in as_completed(futures):
            try:
                all_jobs.extend(future.result())
            except Exception:
                pass

    log.info(f"TanitJobs: collected {len(all_jobs)} raw jobs")
    return pd.DataFrame(all_jobs) if all_jobs else pd.DataFrame()


# ── Keejob scraper ────────────────────────────────────────────

def _fetch_keejob_page(session: requests.Session, kw: str, page: int) -> list[dict]:
    today = datetime.today().strftime("%m/%d/%Y")
    url = f"https://www.keejob.com/offres-emploi/?keywords={kw.replace(' ', '+')}&page={page}"
    try:
        resp = session.get(url, timeout=REQUEST_TIMEOUT)
        if resp.status_code != 200:
            return []
        soup = BeautifulSoup(resp.text, "html.parser")
        articles = soup.select("article.bg-white, article[class*='job']")
        jobs = []
        for art in articles:
            try:
                title_el = (
                    art.select_one("h2 a") or art.select_one("[class*='title'] a") or
                    art.select_one("a[href*='offres']")
                )
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                href = title_el.get("href", "")
                link = href if href.startswith("http") else "https://www.keejob.com" + href
                company_el = art.select_one("p.text-sm, [class*='company']")
                company = company_el.get_text(strip=True) if company_el else ""
                loc_el = art.select_one("[class*='location'] span, [class*='city']")
                loc = loc_el.get_text(strip=True) if loc_el else "Tunisia"
                desc_el = art.select_one("p.text-sm + p, [class*='desc']")
                desc = desc_el.get_text(" ", strip=True)[:400] if desc_el else ""
                jobs.append({
                    "title": title, "company": company, "location": loc,
                    "date": today, "job_link": link, "description": desc,
                    "source": "keejob",
                })
            except Exception:
                continue
        return jobs
    except Exception as e:
        log.debug(f"Keejob error ({kw}, page={page}): {e}")
        return []


def scrape_keejob_fast(keywords: list[str], pages_per_kw: int = 4) -> pd.DataFrame:
    log.info(f"Keejob: scraping {len(keywords)} keywords × {pages_per_kw} pages...")
    session = make_session()
    tasks = [(kw, p) for kw in keywords for p in range(1, pages_per_kw + 1)]

    all_jobs = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(_fetch_keejob_page, session, kw, page): (kw, page)
                   for kw, page in tasks}
        for future in as_completed(futures):
            try:
                all_jobs.extend(future.result())
            except Exception:
                pass

    log.info(f"Keejob: collected {len(all_jobs)} raw jobs")
    return pd.DataFrame(all_jobs) if all_jobs else pd.DataFrame()


# ── EmploiTunisie scraper (bonus source) ─────────────────────

def _fetch_emploitunisie_page(session: requests.Session, page: int) -> list[dict]:
    """Scrape emploi.net.tn — large Tunisian job board."""
    today = datetime.today().strftime("%m/%d/%Y")
    url = f"https://www.emploi.net.tn/fr/offre-d-emploi?page={page}"
    try:
        resp = session.get(url, timeout=REQUEST_TIMEOUT)
        if resp.status_code != 200:
            return []
        soup = BeautifulSoup(resp.text, "html.parser")
        # Multiple possible selectors
        cards = (soup.select(".offer-card") or soup.select(".job-offer") or
                 soup.select("[class*='offer']") or soup.select("article"))
        jobs = []
        for card in cards[:20]:
            try:
                title_el = card.select_one("h2 a, h3 a, .title a, a[class*='title']")
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                if len(title) < 3:
                    continue
                href = title_el.get("href", "")
                link = href if href.startswith("http") else "https://www.emploi.net.tn" + href
                company_el = card.select_one("[class*='company'], [class*='employer']")
                company = company_el.get_text(strip=True) if company_el else ""
                loc_el = card.select_one("[class*='location'], [class*='city'], [class*='region']")
                loc = loc_el.get_text(strip=True) if loc_el else "Tunisia"
                desc_el = card.select_one("[class*='desc'], [class*='excerpt'], p")
                desc = desc_el.get_text(" ", strip=True)[:400] if desc_el else ""
                jobs.append({
                    "title": title, "company": company,
                    "location": loc if loc else "Tunisia",
                    "date": today, "job_link": link,
                    "description": desc, "source": "emploitunisie",
                })
            except Exception:
                continue
        return jobs
    except Exception as e:
        log.debug(f"EmploiTunisie error (page={page}): {e}")
        return []


def scrape_emploitunisie_fast(num_pages: int = 15) -> pd.DataFrame:
    log.info(f"EmploiTunisie: scraping {num_pages} pages...")
    session = make_session()

    all_jobs = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(_fetch_emploitunisie_page, session, p): p
                   for p in range(1, num_pages + 1)}
        for future in as_completed(futures):
            try:
                all_jobs.extend(future.result())
            except Exception:
                pass

    log.info(f"EmploiTunisie: collected {len(all_jobs)} raw jobs")
    return pd.DataFrame(all_jobs) if all_jobs else pd.DataFrame()


# ── Cleaning & Classification ─────────────────────────────────

def clean_and_classify(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    # Drop blank titles
    df = df[df["title"].notna() & (df["title"].str.strip() != "")].copy()

    for col in ["title", "company", "location", "description"]:
        if col in df.columns:
            df[col] = (df[col].fillna("").astype(str).str.strip()
                       .str.replace(r"\s+", " ", regex=True))

    # Classify domain
    df["final_category"] = df.apply(
        lambda r: assign_domain(r["title"], r.get("description", "")), axis=1
    )

    # Extract skills
    df["extracted_skills"] = df.apply(
        lambda r: extract_skills(r["title"], r.get("description", "")), axis=1
    )
    df["required_skills"] = ""

    return df.reset_index(drop=True)


# ── Merge ─────────────────────────────────────────────────────

def merge_into_csv(new_df: pd.DataFrame, csv_path: str) -> int:
    if new_df.empty:
        log.info("No new jobs to merge.")
        return 0

    path = Path(csv_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.exists():
        existing = pd.read_csv(csv_path)
        log.info(f"Existing CSV: {len(existing)} rows")
    else:
        existing = pd.DataFrame()

    all_cols = list(dict.fromkeys(list(existing.columns) + list(new_df.columns)))
    for col in all_cols:
        if col not in existing.columns:
            existing[col] = ""
        if col not in new_df.columns:
            new_df[col] = ""

    combined = pd.concat([existing, new_df[all_cols]], ignore_index=True)

    # Dedup by link
    combined["_link_norm"] = (
        combined["job_link"].astype(str).str.strip().str.lower().str.rstrip("/")
    )
    has_link  = combined["_link_norm"].notna() & ~combined["_link_norm"].isin(["", "nan", "none"])
    df_linked = combined[has_link].drop_duplicates(subset=["_link_norm"], keep="last")
    df_nolink = combined[~has_link].drop_duplicates(subset=["title", "company"], keep="last")
    combined  = pd.concat([df_linked, df_nolink], ignore_index=True).drop(columns=["_link_norm"])

    combined.to_csv(csv_path, index=False)
    added = len(combined) - (len(existing) if not existing.empty else 0)
    log.info(f"✓ CSV saved: {len(combined)} total rows (+{added} new)")
    return added


# ── Main pipeline ─────────────────────────────────────────────

def run_fast_pipeline():
    start_time = time.time()
    log.info("=" * 60)
    log.info("FAST SCRAPE PIPELINE STARTING")
    log.info("=" * 60)

    # Scrape all sources in parallel using threads
    results = {}

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(scrape_linkedin_fast, TUNISIAN_KEYWORDS, 25): "linkedin",
            executor.submit(scrape_tanitjobs_fast, TUNISIAN_KEYWORDS[:12], 3): "tanitjobs",
            executor.submit(scrape_keejob_fast, TUNISIAN_KEYWORDS[:10], 4): "keejob",
            executor.submit(scrape_emploitunisie_fast, 15): "emploitunisie",
        }
        for future in as_completed(futures):
            source = futures[future]
            try:
                results[source] = future.result()
                log.info(f"  ✓ {source}: {len(results[source])} jobs")
            except Exception as e:
                log.error(f"  ✗ {source} failed: {e}")
                results[source] = pd.DataFrame()

    # Combine all
    dfs = [df for df in results.values() if not df.empty]
    if not dfs:
        log.warning("No jobs scraped from any source!")
        return

    combined = pd.concat(dfs, ignore_index=True)
    log.info(f"Total raw jobs: {len(combined)}")

    cleaned = clean_and_classify(combined)
    log.info(f"After cleaning: {len(cleaned)} jobs")

    # Log domain distribution
    if "final_category" in cleaned.columns:
        dist = cleaned["final_category"].value_counts().head(10)
        log.info(f"Top domains:\n{dist.to_string()}")

    added = merge_into_csv(cleaned, CSV_PATH)

    elapsed = time.time() - start_time
    log.info(f"=" * 60)
    log.info(f"DONE in {elapsed:.0f}s — {added} new jobs added")
    log.info(f"=" * 60)
    return added


if __name__ == "__main__":
    run_fast_pipeline()
