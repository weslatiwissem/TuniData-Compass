import time
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from pipeline import run_pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

scheduler = BackgroundScheduler()
scheduler.add_job(run_pipeline, "interval", days=2, id="scrape_pipeline")
scheduler.start()

log.info("Scheduler started — running pipeline now, then every 2 days.")

# Run once immediately
try:
    run_pipeline()
except Exception as e:
    log.error(f"Initial pipeline failed: {e}", exc_info=True)

# Keep the process alive
try:
    while True:
        time.sleep(60)
except (KeyboardInterrupt, SystemExit):
    scheduler.shutdown()
    log.info("Scheduler stopped.")