# ============================================================
# scraper/pipeline.py
# Runs every 2 days via APScheduler.
# Scrapes LinkedIn + TanitJob → classifies → merges into jobs.csv
# ============================================================

import os
import re
import time
import logging
import pandas as pd
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

CSV_PATH = os.getenv("CSV_PATH", "/app/data/jobs.csv")
LOCATION = os.getenv("SCRAPE_LOCATION", "Tunisia")
MAX_JOBS = int(os.getenv("MAX_JOBS_PER_RUN", "500"))  # raised to 500

# More comprehensive keyword list targeting Tunisian market
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
# DOMAIN CLASSIFICATION — comprehensive rule table
# ─────────────────────────────────────────────────────────────

DOMAIN_RULES = [
    # Ordered: most specific first
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
        "docteur en data", "data researcher",
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
        "analyste qualité", "quality analyst",
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
        "ingénieur qa", "analyste test",
    ]),
    ("IT Consulting & ERP", [
        "sap consultant", "erp consultant", "oracle consultant",
        "salesforce consultant", "odoo consultant", "ms dynamics",
        "functional consultant", "techno-functional",
        "consultant sap", "consultant erp", "consultant oracle",
        "consultant crm", "consultant fonctionnel",
        "microsoft dynamics", "consultant si",
    ]),
    ("Project Management", [
        "project manager", "product manager", "product owner",
        "scrum master", "agile coach", "delivery manager",
        "programme manager", "pmo",
        "chef de projet", "responsable projet", "manager it",
        "directeur technique", "it manager",
    ]),
    ("Design & UX", [
        "ux designer", "ui designer", "ux/ui", "product designer",
        "graphic designer", "motion designer", "visual designer",
        "web designer", "creative designer", "figma",
        "designer ux", "designer ui", "designer graphique",
        "intégrateur", "maquettiste",
    ]),
    ("IT Support & Infrastructure", [
        "it support", "helpdesk", "service desk", "technical support",
        "network engineer", "network technician", "system engineer",
        "support engineer", "it technician", "infrastructure",
        "technicien support", "technicien réseau", "administrateur réseau",
        "support technique", "technicien informatique",
    ]),
    ("Finance & Operations", [
        "finance", "accountant", "comptable", "audit", "treasury",
        "financial analyst", "controller", "cfo", "revenue management",
        "analyste financier", "chef comptable",
    ]),
    ("HR & Recruitment", [
        "recruiter", "hr manager", "talent acquisition", "rh ",
        "human resources", "chargé rh", "responsable rh",
        "recruteur", "ingénieure d'affaires it",
    ]),
    ("Marketing & Growth", [
        "marketing", "digital marketing", "seo", "sem", "growth hacker",
        "content manager", "social media", "e-commerce",
        "chargé marketing", "responsable marketing",
    ]),
]


def assign_domain(title: str, description: str = "") -> str:
    """Assign a domain using title (primary) + description keywords."""
    text = (str(title) + " " + str(description)[:300]).lower()
    text = re.sub(r"[^\w\s/]", " ", text)

    for domain, keywords in DOMAIN_RULES:
        for kw in keywords:
            if kw in text:
                return domain

    return "Software Engineering"  # default — better than "Other"


# ─────────────────────────────────────────────────────────────
# SKILL EXTRACTION
# ─────────────────────────────────────────────────────────────

SKILL_KEYWORDS = [
    # Languages
    "python", "java", "javascript", "typescript", "c#", "c++", "php",
    "ruby", "go", "golang", "rust", "scala", "kotlin", "swift",
    "r ", "matlab", "bash", "shell", "perl",
    # Frontend
    "react", "angular", "vue", "nextjs", "nuxtjs", "html", "css",
    "sass", "webpack", "vite", "jquery", "bootstrap", "tailwind",
    # Backend
    "django", "fastapi", "flask", "spring", "laravel", "express",
    "nestjs", "asp.net", ".net", "node.js", "nodejs", "rails",
    # Data
    "pandas", "numpy", "scikit-learn", "sklearn", "tensorflow",
    "pytorch", "keras", "spark", "hadoop", "kafka", "airflow",
    "dbt", "snowflake", "databricks", "mlflow", "xgboost",
    # Databases
    "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "oracle", "sqlite", "cassandra", "dynamodb", "firebase",
    # Cloud / DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
    "ansible", "jenkins", "gitlab", "github actions", "ci/cd",
    "linux", "nginx", "apache",
    # BI / Analytics
    "power bi", "tableau", "looker", "excel", "grafana", "kibana",
    "analytics", "dashboards", "etl",
    # Other
    "git", "rest api", "graphql", "microservices", "agile", "scrum",
    "jira", "figma", "photoshop",
    "machine learning", "deep learning", "nlp", "computer vision",
    "cybersecurity", "penetration testing", "siem",
    "sap", "salesforce", "odoo",
]


def extract_skills(title: str, description: str) -> str:
    text = (str(title) + " " + str(description)).lower()
    found = [s for s in SKILL_KEYWORDS if s in text]
    return ", ".join(dict.fromkeys(found))  # deduplicate, preserve order


# ─────────────────────────────────────────────────────────────
# SCRAPERS
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


def scrape_linkedin(keywords: list[str], location: str, max_per_keyword: int = 15) -> pd.DataFrame:
    """
    Scrape LinkedIn public job listings.
    Uses the guest job-search API (no login required).
    max_per_keyword: max jobs to fetch per keyword.
    """
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
                    f"&start={start}"
                    "&f_TPR=r2592000"  # posted within last 30 days
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
                            link    = (link_el["href"].split("?")[0]
                                       if link_el and link_el.get("href") else "")

                            # Normalise date to MM/DD/YYYY
                            try:
                                d = datetime.strptime(date, "%Y-%m-%d")
                                date = d.strftime("%m/%d/%Y")
                            except Exception:
                                date = today

                            # Fetch description
                            desc = ""
                            if link:
                                try:
                                    dr = requests.get(link, headers=headers, timeout=15)
                                    ds = BeautifulSoup(dr.text, "html.parser")
                                    db = ds.select_one(".description__text")
                                    if db:
                                        desc = db.get_text(" ", strip=True)
                                    time.sleep(0.3)
                                except Exception:
                                    pass

                            rows.append({
                                "title":       title,
                                "company":     company,
                                "location":    loc,
                                "date":        date,
                                "job_link":    link,
                                "description": desc,
                                "source":      "linkedin",
                            })
                            count += 1
                        except Exception:
                            continue

                    time.sleep(1.5)  # be polite to LinkedIn

                except Exception as e:
                    log.warning(f"LinkedIn page error (kw={kw}, start={start}): {e}")
                    break

            log.info(f"LinkedIn '{kw}': {count} jobs")

    except ImportError:
        log.error("requests/beautifulsoup4 not installed.")
    except Exception as e:
        log.error(f"LinkedIn scrape failed: {e}", exc_info=True)

    return pd.DataFrame(rows)


def scrape_tanitjob(keywords: list[str], max_per_keyword: int = 20) -> pd.DataFrame:
    """
    Scrape TanitJobs.com — Tunisia's largest local job board.
    """
    rows = []
    try:
        import requests
        from bs4 import BeautifulSoup

        headers = _get_headers()
        today = datetime.today().strftime("%m/%d/%Y")

        for kw in keywords:
            count = 0
            for page in range(1, 6):  # up to 5 pages per keyword
                if count >= max_per_keyword:
                    break
                url = (
                    f"https://www.tanitjobs.com/jobs/"
                    f"?keyword={kw.replace(' ', '+')}&page={page}"
                )
                try:
                    resp = requests.get(url, headers=headers, timeout=20)
                    if resp.status_code != 200:
                        break
                    soup = BeautifulSoup(resp.text, "html.parser")

                    # TanitJobs listing cards
                    cards = soup.select("article.job-item, .job-item, .job-listing")
                    if not cards:
                        # Try alternate selector
                        cards = soup.select("[class*='job']")
                    if not cards:
                        break

                    for card in cards:
                        if count >= max_per_keyword:
                            break
                        try:
                            title_el = (
                                card.select_one("h2 a") or
                                card.select_one(".job-title a") or
                                card.select_one("h3 a") or
                                card.select_one("a[class*='title']")
                            )
                            if not title_el:
                                continue

                            title = title_el.get_text(strip=True)
                            href  = title_el.get("href", "")
                            link  = (
                                href if href.startswith("http")
                                else "https://www.tanitjobs.com" + href
                            )

                            company_el = (
                                card.select_one(".company-name") or
                                card.select_one("[class*='company']")
                            )
                            company = company_el.get_text(strip=True) if company_el else ""

                            loc_el = (
                                card.select_one(".location") or
                                card.select_one("[class*='location']") or
                                card.select_one("[class*='city']")
                            )
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

                            # Fetch description
                            desc = ""
                            if link and "tanitjobs.com" in link:
                                try:
                                    dr = requests.get(link, headers=headers, timeout=15)
                                    ds = BeautifulSoup(dr.text, "html.parser")
                                    db = (
                                        ds.select_one(".job-description") or
                                        ds.select_one("[class*='description']") or
                                        ds.select_one("article") or
                                        ds.select_one("main")
                                    )
                                    if db:
                                        desc = db.get_text(" ", strip=True)
                                    time.sleep(0.3)
                                except Exception:
                                    pass

                            rows.append({
                                "title":       title,
                                "company":     company,
                                "location":    loc,
                                "date":        date,
                                "job_link":    link,
                                "description": desc,
                                "source":      "tanitjob",
                            })
                            count += 1
                        except Exception:
                            continue

                    time.sleep(1.0)

                except Exception as e:
                    log.warning(f"TanitJob page error (kw={kw}, page={page}): {e}")
                    break

            log.info(f"TanitJob '{kw}': {count} jobs")

    except ImportError:
        log.error("requests/beautifulsoup4 not installed.")
    except Exception as e:
        log.error(f"TanitJob scrape failed: {e}", exc_info=True)

    return pd.DataFrame(rows)


def scrape_keejob(keywords: list[str], max_per_keyword: int = 15) -> pd.DataFrame:
    """
    Scrape Keejob.com — another major Tunisian job board.
    """
    rows = []
    try:
        import requests
        from bs4 import BeautifulSoup

        headers = _get_headers()
        today = datetime.today().strftime("%m/%d/%Y")
        base = "https://www.keejob.com/offres-emploi/?keywords={kw}&page={p}"

        for kw in keywords:
            count = 0
            for page in range(1, 5):
                if count >= max_per_keyword:
                    break
                url = base.format(kw=kw.replace(" ", "+"), p=page)
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
                            title_el = (
                                art.select_one("h2 a") or
                                art.select_one("[class*='title'] a") or
                                art.select_one("a[href*='offres']")
                            )
                            if not title_el:
                                continue

                            title = title_el.get_text(strip=True)
                            href  = title_el.get("href", "")
                            link  = href if href.startswith("http") else "https://www.keejob.com" + href

                            company_el = art.select_one("p.text-sm, [class*='company']")
                            company = company_el.get_text(strip=True) if company_el else ""

                            loc_el = art.select_one("[class*='location'] span, [class*='city']")
                            loc = loc_el.get_text(strip=True) if loc_el else "Tunisia"

                            # Fetch description
                            desc = ""
                            if link and "keejob.com" in link:
                                try:
                                    dr = requests.get(link, headers=headers, timeout=15)
                                    ds = BeautifulSoup(dr.text, "html.parser")
                                    db = (
                                        ds.select_one("[class*='description']") or
                                        ds.select_one("main article") or
                                        ds.select_one("main")
                                    )
                                    if db:
                                        desc = db.get_text(" ", strip=True)
                                    time.sleep(0.3)
                                except Exception:
                                    pass

                            rows.append({
                                "title":       title,
                                "company":     company,
                                "location":    loc,
                                "date":        today,
                                "job_link":    link,
                                "description": desc,
                                "source":      "keejob",
                            })
                            count += 1
                        except Exception:
                            continue
                    time.sleep(1.0)
                except Exception as e:
                    log.warning(f"Keejob page error (kw={kw}, page={page}): {e}")
                    break
            log.info(f"Keejob '{kw}': {count} jobs")

    except ImportError:
        log.error("requests/beautifulsoup4 not installed.")
    except Exception as e:
        log.error(f"Keejob scrape failed: {e}", exc_info=True)

    return pd.DataFrame(rows)


# ─────────────────────────────────────────────────────────────
# CLEANING & CLASSIFICATION
# ─────────────────────────────────────────────────────────────

def clean_and_classify(df: pd.DataFrame) -> pd.DataFrame:
    """Clean scraped data and assign domains + skills."""
    if df.empty:
        return df

    # Drop blank rows
    df = df[
        df["title"].notna() & (df["title"].str.strip() != "")
    ].copy()

    # Clean text
    for col in ["title", "company", "location", "description"]:
        df[col] = (
            df[col]
            .fillna("")
            .astype(str)
            .str.strip()
            .str.replace(r"\s+", " ", regex=True)
        )

    # Drop rows where description is too short to be useful
    df = df[df["description"].str.len() >= 30].copy()

    # Assign domain from title + description
    df["final_category"] = df.apply(
        lambda r: assign_domain(r["title"], r["description"]), axis=1
    )

    # Extract skills
    df["extracted_skills"] = df.apply(
        lambda r: extract_skills(r["title"], r["description"]), axis=1
    )
    df["required_skills"] = ""

    return df.reset_index(drop=True)


# ─────────────────────────────────────────────────────────────
# MERGE INTO PRODUCTION CSV
# ─────────────────────────────────────────────────────────────

def merge_into_csv(new_df: pd.DataFrame, csv_path: str):
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

    # Align columns — add missing ones with empty values
    all_cols = list(dict.fromkeys(
        list(existing.columns) + list(new_df.columns)
    ))
    for col in all_cols:
        if col not in existing.columns:
            existing[col] = ""
        if col not in new_df.columns:
            new_df[col] = ""

    combined = pd.concat([existing, new_df[all_cols]], ignore_index=True)

    # Normalise links for deduplication
    combined["_link_norm"] = (
        combined["job_link"]
        .astype(str).str.strip().str.lower().str.rstrip("/")
    )
    has_link  = combined["_link_norm"].notna() & ~combined["_link_norm"].isin(["", "nan", "none"])
    df_linked = combined[has_link].drop_duplicates(subset=["_link_norm"], keep="last")
    df_nolink = combined[~has_link].drop_duplicates(subset=["title", "company"], keep="last")
    combined  = pd.concat([df_linked, df_nolink], ignore_index=True).drop(columns=["_link_norm"])

    # Reorder so newest jobs appear first (for freshness)
    combined = combined.reset_index(drop=True)

    combined.to_csv(csv_path, index=False)
    added = len(combined) - (len(existing) if not existing.empty else 0)
    log.info(f"✓ CSV saved: {len(combined)} total rows (+{added} new)")
    return added


# ─────────────────────────────────────────────────────────────
# MAIN PIPELINE
# ─────────────────────────────────────────────────────────────

def run_pipeline():
    log.info("=" * 60)
    log.info("Starting scrape pipeline...")
    log.info("=" * 60)

    # Distribute budget across sources and keywords
    n_kw = len(SEARCH_KEYWORDS)
    # LinkedIn: up to 15 per keyword (≈ 450 total if all keywords match)
    li_per_kw  = min(15, max(5, MAX_JOBS // n_kw))
    # TanitJob: up to 20 per keyword
    tan_per_kw = min(20, max(8, MAX_JOBS // n_kw))
    # Keejob: up to 15 per keyword
    kee_per_kw = min(15, max(5, MAX_JOBS // n_kw))

    log.info(f"Scraping {n_kw} keywords × LI:{li_per_kw} / Tanit:{tan_per_kw} / Keejob:{kee_per_kw}")

    li_df  = scrape_linkedin(SEARCH_KEYWORDS,  LOCATION, li_per_kw)
    log.info(f"LinkedIn raw: {len(li_df)} rows")

    tan_df = scrape_tanitjob(SEARCH_KEYWORDS, tan_per_kw)
    log.info(f"TanitJob raw: {len(tan_df)} rows")

    kee_df = scrape_keejob(SEARCH_KEYWORDS, kee_per_kw)
    log.info(f"Keejob raw: {len(kee_df)} rows")

    combined = pd.concat([li_df, tan_df, kee_df], ignore_index=True)
    log.info(f"Total scraped: {len(combined)} rows")

    cleaned = clean_and_classify(combined)
    log.info(f"After cleaning: {len(cleaned)} rows")

    # Log domain distribution
    if not cleaned.empty and "final_category" in cleaned.columns:
        dist = cleaned["final_category"].value_counts()
        log.info(f"Domain distribution:\n{dist.to_string()}")

    added = merge_into_csv(cleaned, CSV_PATH)
    log.info(f"Pipeline complete. {added} new jobs added.")
    return added


if __name__ == "__main__":
    run_pipeline()