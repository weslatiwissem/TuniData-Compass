# ============================================================
# scraper/pipeline.py
# Runs every 2 days via APScheduler.
# Scrapes LinkedIn + TanitJob → cleans → merges into jobs.csv
# ============================================================

import os
import re
import logging
import pandas as pd
from datetime import datetime
from collections import Counter
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

CSV_PATH    = os.getenv("CSV_PATH", "/app/data/jobs.csv")
SEARCH_KEYWORDS = os.getenv("SEARCH_KEYWORDS", "data engineer,data scientist,software engineer,devops,cybersecurity,product manager").split(",")
LOCATION    = os.getenv("SCRAPE_LOCATION", "Tunisia")
MAX_JOBS    = int(os.getenv("MAX_JOBS_PER_RUN", "100"))

# ─────────────────────────────────────────────────────────────
# 1. SCRAPING
# ─────────────────────────────────────────────────────────────

def scrape_linkedin(keywords: list[str], location: str, max_per_keyword: int = 25) -> pd.DataFrame:
    """Scrape LinkedIn job listings using requests + BeautifulSoup."""
    rows = []
    try:
        import requests
        from bs4 import BeautifulSoup

        headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}
        base = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={kw}&location={loc}&start={start}"

        for kw in keywords:
            count = 0
            for start in range(0, max_per_keyword, 25):
                if count >= max_per_keyword:
                    break
                try:
                    url  = base.format(kw=kw.replace(" ", "%20"), loc=location.replace(" ", "%20"), start=start)
                    resp = requests.get(url, headers=headers, timeout=15)
                    if resp.status_code != 200:
                        break
                    soup  = BeautifulSoup(resp.text, "html.parser")
                    cards = soup.select("li")
                    if not cards:
                        break
                    for card in cards:
                        if count >= max_per_keyword:
                            break
                        try:
                            title   = card.select_one(".base-search-card__title")
                            company = card.select_one(".base-search-card__subtitle")
                            loc_el  = card.select_one(".job-search-card__location")
                            link_el = card.select_one("a.base-card__full-link")
                            if not title:
                                continue
                            link = link_el["href"].split("?")[0] if link_el else ""
                            # Fetch description
                            desc = ""
                            if link:
                                dr = requests.get(link, headers=headers, timeout=10)
                                ds = BeautifulSoup(dr.text, "html.parser")
                                db = ds.select_one(".description__text")
                                desc = db.get_text(" ", strip=True)[:3000] if db else ""
                            rows.append({
                                "title"      : title.get_text(strip=True),
                                "company"    : company.get_text(strip=True) if company else "",
                                "location"   : loc_el.get_text(strip=True) if loc_el else location,
                                "date"       : datetime.today().strftime("%m/%d/%Y"),
                                "job_link"   : link,
                                "description": desc,
                                "source"     : "linkedin",
                            })
                            count += 1
                        except Exception:
                            continue
                except Exception as e:
                    log.warning(f"LinkedIn page failed: {e}")
                    break

    except Exception as e:
        log.error(f"LinkedIn scrape failed: {e}")

    return pd.DataFrame(rows)


def scrape_tanitjob(keywords: list[str], max_per_keyword: int = 25) -> pd.DataFrame:
    """Scrape TanitJob using requests + BeautifulSoup."""
    rows = []
    try:
        import requests
        from bs4 import BeautifulSoup

        headers = {"User-Agent": "Mozilla/5.0"}
        base    = "https://www.tanitjobs.com/jobs/?keyword={kw}&page={p}"

        for kw in keywords:
            count = 0
            for page in range(1, 5):
                if count >= max_per_keyword:
                    break
                url  = base.format(kw=kw.replace(" ", "+"), p=page)
                resp = requests.get(url, headers=headers, timeout=15)
                if resp.status_code != 200:
                    break
                soup = BeautifulSoup(resp.text, "html.parser")
                cards = soup.select(".job-listing")
                if not cards:
                    break
                for card in cards:
                    if count >= max_per_keyword:
                        break
                    try:
                        title   = card.select_one(".job-title").get_text(strip=True)
                        company = card.select_one(".company-name").get_text(strip=True)
                        loc     = card.select_one(".location")
                        loc     = loc.get_text(strip=True) if loc else "Tunisia"
                        link_el = card.select_one("a[href]")
                        link    = "https://www.tanitjobs.com" + link_el["href"] if link_el else ""

                        # Fetch description
                        desc = ""
                        if link:
                            dr = requests.get(link, headers=headers, timeout=10)
                            ds = BeautifulSoup(dr.text, "html.parser")
                            db = ds.select_one(".job-description")
                            desc = db.get_text(" ", strip=True)[:3000] if db else ""

                        rows.append({
                            "title"      : title,
                            "company"    : company,
                            "location"   : loc,
                            "date"       : datetime.today().strftime("%m/%d/%Y"),
                            "job_link"   : link,
                            "description": desc,
                            "source"     : "tanitjob",
                        })
                        count += 1
                    except Exception:
                        continue

    except ImportError:
        log.warning("requests/beautifulsoup4 not installed, skipping TanitJob scrape.")
    except Exception as e:
        log.error(f"TanitJob scrape failed: {e}")

    return pd.DataFrame(rows)


# ─────────────────────────────────────────────────────────────
# 2. CLEANING
# ─────────────────────────────────────────────────────────────

def assign_category(title: str) -> str:
    t = str(title).lower()
    rules = [
        (['cybersecurity','cyber security','soc analyst','pentest','siem','security analyst'], 'Cybersecurity'),
        (['data scientist','machine learning','mlops','nlp engineer','big data'],              'Data Science & ML'),
        (['data engineer','ingénieur data','dataops','data governance'],                       'Data Engineering'),
        (['data analyst','bi ','business intelligence','analyste bi'],                         'BI & Data Analysis'),
        (['devops','cloud engineer','sre ','platform engineer','infrastructure engineer'],     'DevOps & Cloud'),
        (['frontend','front-end','react developer','angular','vue developer'],                 'Frontend Development'),
        (['backend','back-end','java developer','python developer','.net developer'],          'Backend Development'),
        (['fullstack','full-stack','software engineer','software developer','développeur'],    'Software Engineering'),
        (['mobile','android','ios developer','flutter','react native'],                        'Mobile Development'),
        (['qa ','quality assurance','test engineer','automation test'],                        'QA & Testing'),
        (['sap','erp','oracle consultant','odoo','salesforce'],                                'IT Consulting & ERP'),
        (['product manager','product owner','scrum master','chef de projet','project manager'],'Project Management'),
        (['network engineer','sysadmin','helpdesk','support techni','technicien'],             'IT Support & Infrastructure'),
        (['ux','ui/ux','product designer','graphic design'],                                   'Design & UX'),
        (['finance','accountant','comptable','audit','treasury'],                              'Finance & Accounting'),
        (['marketing','digital marketing','seo','social media'],                               'Marketing & Growth'),
        (['rh ','hr ','human resources','talent acquisition','recruiter'],                     'HR & Recruitment'),
    ]
    for keywords, category in rules:
        if any(k in t for k in keywords):
            return category
    return 'Other'


def clean_new_jobs(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    # Drop rows without description
    df = df[df["description"].str.len() >= 50].copy()

    # Clean text fields
    for col in ["title", "company", "location"]:
        df[col] = df[col].astype(str).str.strip().str.replace(r"\s+", " ", regex=True)

    # Assign category
    df["final_category"] = df["title"].apply(assign_category)

    # Basic skill extraction from description (keyword matching)
    SKILL_KEYWORDS = [
        "python","java","javascript","typescript","react","angular","vue","node.js",
        "sql","nosql","mongodb","postgresql","mysql","redis","elasticsearch",
        "aws","gcp","azure","docker","kubernetes","terraform","ansible",
        "machine learning","deep learning","nlp","computer vision","pytorch","tensorflow",
        "spark","hadoop","kafka","airflow","dbt","snowflake","databricks",
        "git","ci/cd","jenkins","github actions","fastapi","django","spring",
        "linux","bash","rest api","graphql","microservices","agile","scrum",
        "power bi","tableau","looker","excel","data visualization",
        "cybersecurity","penetration testing","siem","splunk","network security",
        "sap","salesforce","odoo","erp","crm",
        "figma","ux design","product management",
    ]

    def extract_skills(text):
        text_lower = str(text).lower()
        found = [s for s in SKILL_KEYWORDS if s in text_lower]
        return ", ".join(found)

    df["extracted_skills"] = df["description"].apply(extract_skills)
    df["required_skills"]  = ""

    return df


# ─────────────────────────────────────────────────────────────
# 3. MERGE INTO PRODUCTION CSV
# ─────────────────────────────────────────────────────────────

def merge_into_csv(new_df: pd.DataFrame, csv_path: str):
    if new_df.empty:
        log.info("No new jobs to merge.")
        return

    # Load existing
    if Path(csv_path).exists():
        existing = pd.read_csv(csv_path)
        log.info(f"Existing CSV: {len(existing)} rows")
    else:
        existing = pd.DataFrame()

    # Align columns
    for col in existing.columns:
        if col not in new_df.columns:
            new_df[col] = ""
    for col in new_df.columns:
        if col not in existing.columns:
            existing[col] = ""

    combined = pd.concat([existing, new_df], ignore_index=True)

    # Deduplicate — keep newest
    combined["_link_norm"] = combined["job_link"].astype(str).str.strip().str.lower().str.rstrip("/")
    has_link  = combined["_link_norm"].notna() & ~combined["_link_norm"].isin(["", "nan", "none"])
    df_linked = combined[has_link].drop_duplicates(subset=["_link_norm"], keep="last")
    df_nolink = combined[~has_link].drop_duplicates(subset=["title", "company"], keep="last")
    combined  = pd.concat([df_linked, df_nolink], ignore_index=True).drop(columns=["_link_norm"])

    combined.to_csv(csv_path, index=False)
    log.info(f"✓ Merged CSV saved: {len(combined)} total rows (+{len(combined) - (len(existing) if not existing.empty else 0)} new)")


# ─────────────────────────────────────────────────────────────
# 4. MAIN PIPELINE
# ─────────────────────────────────────────────────────────────

def run_pipeline():
    log.info("=" * 50)
    log.info("Starting scrape pipeline...")
    log.info("=" * 50)

    per_kw = max(5, MAX_JOBS // len(SEARCH_KEYWORDS))

    li_df  = scrape_linkedin(SEARCH_KEYWORDS,  LOCATION, per_kw)
    tan_df = scrape_tanitjob(SEARCH_KEYWORDS, per_kw)

    log.info(f"Scraped: {len(li_df)} LinkedIn, {len(tan_df)} TanitJob")

    combined = pd.concat([li_df, tan_df], ignore_index=True)
    cleaned  = clean_new_jobs(combined)

    log.info(f"After cleaning: {len(cleaned)} jobs")

    merge_into_csv(cleaned, CSV_PATH)
    log.info("Pipeline complete.")


if __name__ == "__main__":
    run_pipeline()