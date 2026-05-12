#!/usr/bin/env python3
"""
scraper/scheduler.py — Runs fast_scraper every 2 days via APScheduler.
Replaces the slow sequential scraper.
"""
import time
import logging
import sys
import os

# Add parent to path so fast_scraper can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from apscheduler.schedulers.background import BackgroundScheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger(__name__)


def run_pipeline():
    """Import and run the fast pipeline."""
    try:
        from fast_scraper import run_fast_pipeline
        run_fast_pipeline()
    except ImportError:
        # Fallback to old pipeline if fast_scraper not available
        log.warning("fast_scraper not found, using legacy pipeline")
        from pipeline import run_pipeline as _run
        _run()


scheduler = BackgroundScheduler()
scheduler.add_job(run_pipeline, "interval", days=2, id="scrape_pipeline")
scheduler.start()

log.info("Scheduler started — running fast pipeline now, then every 2 days.")

try:
    run_pipeline()
except Exception as e:
    log.error(f"Initial pipeline failed: {e}", exc_info=True)

try:
    while True:
        time.sleep(60)
except (KeyboardInterrupt, SystemExit):
    scheduler.shutdown()
    log.info("Scheduler stopped.")