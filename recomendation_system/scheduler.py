#!/usr/bin/env python3
"""
TuniData Compass — Job Scraping Scheduler
Runs all scrapers automatically at a set interval and writes to jobs.csv
"""

import schedule
import time
import logging
import os
import pandas as pd
from datetime import datetime


# ─── Import your scrapers ────────────────────────────────────────────────────
from linkedinScrapper import run_linkedin_scraper
from keejob_scraper import run_keejob_scraper
# When ready, uncomment and add:
# from tanitjobs_scraper import run_tanitjobs_scraper
# from naukrigulf_scraper import run_naukrigulf_scraper

# ─── Configuration ───────────────────────────────────────────────────────────

JOBS_CSV        = "jobs.csv"           # Single output file for all scrapers
SCRAPE_INTERVAL = 6                    # Hours between each full scrape cycle
LOG_FILE        = "scheduler.log"      # Log file path

LINKEDIN_KEYWORDS = [
    "data", "cybersecurity", "software engineer",
    "graphic designer", "it", "machine learning",
    "ui ux designer", "multimedia designer", "game developer"
]
LOCATION = "Tunisia"

# ─── Logging setup ───────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler()          # also prints to console
    ]
)
log = logging.getLogger(__name__)

# ─── CSV helpers ─────────────────────────────────────────────────────────────

def load_existing_jobs() -> tuple[pd.DataFrame, set]:
    """Return (existing_df, set_of_known_links)."""
    if os.path.exists(JOBS_CSV):
        df = pd.read_csv(JOBS_CSV)
        links = set(df["job_link"].dropna().unique())
        log.info(f"Loaded {len(df)} existing jobs ({len(links)} unique links)")
        return df, links
    log.info("No existing jobs.csv — starting fresh")
    return pd.DataFrame(), set()


def append_new_jobs(new_df: pd.DataFrame, source: str):
    """Append only genuinely new rows to jobs.csv."""
    if new_df.empty:
        log.info(f"[{source}] No new jobs to append.")
        return

    new_df["source"]      = source
    new_df["scraped_at"]  = datetime.now().isoformat(timespec="seconds")

    write_header = not os.path.exists(JOBS_CSV)
    new_df.to_csv(JOBS_CSV, mode="a", header=write_header, index=False)
    log.info(f"[{source}] Appended {len(new_df)} new jobs → {JOBS_CSV}")


def deduplicate_csv():
    """Remove duplicate job_link rows, keep the first occurrence."""
    if not os.path.exists(JOBS_CSV):
        return
    df = pd.read_csv(JOBS_CSV)
    before = len(df)
    df = df.drop_duplicates(subset=["job_link"], keep="first")
    df.to_csv(JOBS_CSV, index=False)
    removed = before - len(df)
    if removed:
        log.info(f"Deduplication removed {removed} duplicate rows.")

# ─── Main scrape job (runs on schedule) ──────────────────────────────────────

def run_all_scrapers():
    log.info("=" * 60)
    log.info("SCRAPE CYCLE STARTED")
    log.info("=" * 60)

    existing_df, existing_links = load_existing_jobs()

    # ── LinkedIn ──────────────────────────────────────────────────────────────
    try:
        log.info("Starting LinkedIn scraper …")
        already_scraped_kw = set()
        if not existing_df.empty and "search_keyword" in existing_df.columns:
            already_scraped_kw = set(existing_df["search_keyword"].str.lower().unique())

        linkedin_df = run_linkedin_scraper(
            keywords=LINKEDIN_KEYWORDS,
            location=LOCATION,
            pages_per_keyword=5,
            existing_links=existing_links,
            already_scraped_keywords=already_scraped_kw,
        )
        append_new_jobs(linkedin_df, source="linkedin")
        existing_links.update(linkedin_df["job_link"].dropna().values)
    except Exception as e:
        log.error(f"LinkedIn scraper failed: {e}", exc_info=True)

    # ── Keejob ────────────────────────────────────────────────────────────────
    try:
        log.info("Starting Keejob scraper …")
        keejob_df = run_keejob_scraper(
            num_pages=4,
            existing_links=existing_links,
        )
        append_new_jobs(keejob_df, source="keejob")
        existing_links.update(keejob_df["job_link"].dropna().values)
    except Exception as e:
        log.error(f"Keejob scraper failed: {e}", exc_info=True)

    # ── TanitJobs (placeholder) ───────────────────────────────────────────────
    # try:
    #     tanitjobs_df = run_tanitjobs_scraper(existing_links=existing_links)
    #     append_new_jobs(tanitjobs_df, source="tanitjobs")
    # except Exception as e:
    #     log.error(f"TanitJobs scraper failed: {e}", exc_info=True)

    # ── NaukriGulf (placeholder) ──────────────────────────────────────────────
    # try:
    #     naukrigulf_df = run_naukrigulf_scraper(existing_links=existing_links)
    #     append_new_jobs(naukrigulf_df, source="naukrigulf")
    # except Exception as e:
    #     log.error(f"NaukriGulf scraper failed: {e}", exc_info=True)

    deduplicate_csv()

    total = len(pd.read_csv(JOBS_CSV)) if os.path.exists(JOBS_CSV) else 0
    log.info(f"CYCLE COMPLETE — {total} total unique jobs in {JOBS_CSV}")
    log.info(f"Next cycle in {SCRAPE_INTERVAL} hour(s).")
    log.info("=" * 60)

# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    log.info(f"TuniData Compass Scheduler started.")
    log.info(f"Scrape interval: every {SCRAPE_INTERVAL} hour(s).")

    # Run immediately on startup, then on schedule
    run_all_scrapers()

    schedule.every(SCRAPE_INTERVAL).hours.do(run_all_scrapers)

    while True:
        schedule.run_pending()
        time.sleep(60)   # check every minute