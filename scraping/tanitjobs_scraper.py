"""
tanitjobs_scraper.py - IT Category Edition
-------------------------------------------
Scrapes ONLY from the IT category pages (already filtered).
Uses exact HTML selectors from TanitJobs.

Target URL: https://www.tanitjobs.com/categories/705/informatique-jobs/
Pages: 16 total

Fields extracted:
- job_title
- company_name
- location
- job_link
- description (from detail page)
- required_skills (extracted from description)
- posting_date

Usage:
  python tanitjobs_scraper.py
  python tanitjobs_scraper.py --pages 16
"""

import argparse
import csv
import logging
import random
import re
import time
from datetime import datetime
from pathlib import Path

from bs4 import BeautifulSoup

try:
    import undetected_chromedriver as uc
    USE_UNDETECTED = True
except ImportError:
    USE_UNDETECTED = False
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_URL = "https://www.tanitjobs.com"
IT_CATEGORY_URL = f"{BASE_URL}/categories/705/informatique-jobs/"

# Skill keywords for extraction
SKILL_KEYWORDS = [
    "python", "java", "javascript", "typescript", "c#", "c\\+\\+", "php", "ruby",
    "swift", "kotlin", "go", "rust", "scala", "perl", "r\\b",
    "react", "angular", "vue\\.js", "node\\.js", "next\\.js", "django", "flask",
    "spring", "laravel", "express", "asp\\.net", "symfony",
    "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "oracle",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins",
    "git", "github", "gitlab", "linux", "nginx", "apache", "ci/cd",
    "machine learning", "deep learning", "tensorflow", "pytorch", "pandas",
    "numpy", "scikit-learn", "spark", "hadoop", "airflow",
    "power bi", "tableau", "excel", "agile", "scrum", "rest api", "graphql",
]

SKILL_PATTERN = re.compile("|".join(SKILL_KEYWORDS), re.IGNORECASE)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def clean_text(text: str) -> str:
    """Clean and normalize text."""
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_skills(text: str) -> str:
    """Extract unique skills from text."""
    if not text:
        return ""
    found = {m.group().lower() for m in SKILL_PATTERN.finditer(text)}
    return ", ".join(sorted(found)) if found else ""


def human_delay(min_sec=2, max_sec=4):
    """Random human-like delay."""
    time.sleep(random.uniform(min_sec, max_sec))


# ---------------------------------------------------------------------------
# Selenium Setup
# ---------------------------------------------------------------------------

def setup_driver():
    """Initialize Chrome driver."""
    if USE_UNDETECTED:
        log.info("🛡️  Using undetected-chromedriver")
        options = uc.ChromeOptions()
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--start-maximized")
        
        try:
            driver = uc.Chrome(options=options, version_main=144)
            log.info("✅ Driver ready")
            return driver
        except Exception as e:
            log.warning(f"Undetected failed: {e}")
    
    log.info("🌐 Using regular Selenium")
    options = Options()
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_argument("--window-size=1920,1080")
    
    try:
        driver = webdriver.Chrome(options=options)
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
        })
        log.info("✅ Driver ready")
        return driver
    except Exception as e:
        log.error(f"Failed: {e}")
        return None


def solve_cloudflare(driver, max_wait=120):
    """Wait for Cloudflare challenge to be solved."""
    log.info("╔════════════════════════════════════════════════════╗")
    log.info("║  🛡️  CLOUDFLARE DETECTED                          ║")
    log.info("║  Please click the checkbox...                     ║")
    log.info("╚════════════════════════════════════════════════════╝")
    
    start = time.time()
    while time.time() - start < max_wait:
        try:
            src = driver.page_source.lower()
            url = driver.current_url.lower()
            
            # Check if we're past the challenge
            if all(x not in src for x in ["cloudflare", "vérification", "challenge"]):
                if "challenge" not in url:
                    log.info("✅ Challenge passed!")
                    time.sleep(2)
                    return True
            
            elapsed = int(time.time() - start)
            if elapsed % 10 == 0 and elapsed > 0:
                log.info(f"   ⏳ Waiting... ({max_wait - elapsed}s)")
        except:
            pass
        time.sleep(3)
    
    log.warning("⚠️  Timeout")
    return False


# ---------------------------------------------------------------------------
# Scraping Functions
# ---------------------------------------------------------------------------

def fetch_page(driver, url: str) -> BeautifulSoup | None:
    """Load page and handle Cloudflare."""
    try:
        log.info(f"🌐 Loading: {url}")
        driver.get(url)
        human_delay(2, 3)
        
        # Check for Cloudflare
        src = driver.page_source.lower()
        if any(x in src for x in ["cloudflare", "vérification de sécurité"]):
            if not solve_cloudflare(driver):
                return None
            driver.get(url)
            human_delay(2, 3)
        
        # Scroll to load lazy content
        try:
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight/2);")
            time.sleep(0.5)
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(1)
        except:
            pass
        
        # Wait for job listings
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "article"))
            )
        except TimeoutException:
            log.warning("⚠️  Timeout waiting for articles")
        
        return BeautifulSoup(driver.page_source, "lxml")
        
    except Exception as e:
        log.error(f"Failed to load page: {e}")
        return None


def parse_listing_page(soup: BeautifulSoup) -> list[dict]:
    """
    Extract job cards from listing page using exact TanitJobs selectors.
    """
    jobs = []
    
    # Find all job articles
    articles = soup.select("article")
    
    if not articles:
        log.warning("⚠️  No job articles found")
        return jobs
    
    log.info(f"   Found {len(articles)} job cards")
    
    for article in articles:
        # Job title and link
        title_link = article.select_one("h2 a, h3 a, .listing-item__title a")
        if not title_link:
            continue
        
        job_title = clean_text(title_link.get_text())
        job_link = title_link.get("href", "")
        
        if not job_link:
            continue
        
        if not job_link.startswith("http"):
            job_link = BASE_URL + job_link
        
        # Company name - exact selector from your example
        company_elem = article.select_one(".listing-item-info-company")
        company_name = clean_text(company_elem.get_text()) if company_elem else ""
        
        # Remove trailing dash if present
        company_name = re.sub(r'\s*-\s*$', '', company_name)
        
        # Location - exact selector from your example
        location_elem = article.select_one(".listing-item-info-location")
        location = clean_text(location_elem.get_text()) if location_elem else ""
        
        # Note: posting_date will be extracted from detail page
        
        jobs.append({
            "job_title": job_title,
            "company_name": company_name,
            "location": location,
            "job_link": job_link,
            "description": "",
            "required_skills": "",
            "posting_date": "",
        })
    
    return jobs


def extract_job_details(driver, url: str) -> dict:
    """
    Extract description and posting date from job detail page (Voir Plus).
    
    Date: .listing-item__info--item-date (e.g., "Il'y a 1 semaine")
    Description: <p> tags in the job description section
    """
    details = {
        "description": "",
        "required_skills": "",
        "posting_date": "",
    }
    
    if not url:
        return details
    
    try:
        driver.get(url)
        human_delay(2, 3)
        
        # Scroll to load all content
        try:
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(1)
        except:
            pass
        
        soup = BeautifulSoup(driver.page_source, "lxml")
        
        # --- Extract Posting Date (from detail page) ---
        date_elem = soup.select_one(".listing-item__info--item-date")
        if date_elem:
            details["posting_date"] = clean_text(date_elem.get_text())
        
        # --- Extract Description ---
        # The description is in <p> tags, as shown in your example
        # Look for the main content area with paragraphs
        
        # Try to find the job description section
        desc_paragraphs = []
        
        # Method 1: Find all <p> tags in the main content
        # Usually after the job header/title
        all_paragraphs = soup.select("p")
        
        for p in all_paragraphs:
            text = clean_text(p.get_text())
            
            # Skip very short paragraphs (likely navigation/footer)
            if len(text) < 20:
                continue
            
            # Skip paragraphs that look like navigation
            if any(x in text.lower() for x in ["connexion", "inscription", "© 20", "mentions légales"]):
                continue
            
            desc_paragraphs.append(text)
        
        if desc_paragraphs:
            # Join all description paragraphs
            description = " ".join(desc_paragraphs)
            
            # Clean up excessive line breaks
            description = re.sub(r'\s+', ' ', description)
            
            details["description"] = description
            details["required_skills"] = extract_skills(description)
        
        # Method 2: If no paragraphs found, try to find description div/section
        if not details["description"]:
            desc_section = (
                soup.select_one(".job-description") or
                soup.select_one("[class*='description']") or
                soup.select_one("#description") or
                soup.select_one(".listing-detail")
            )
            
            if desc_section:
                # Remove navigation/script elements
                for tag in desc_section.select("script, style, nav, header, footer, .sidebar"):
                    tag.decompose()
                
                description = clean_text(desc_section.get_text(separator=" "))
                
                if len(description) > 50:
                    details["description"] = description
                    details["required_skills"] = extract_skills(description)
        
        return details
        
    except Exception as e:
        log.error(f"Detail extraction failed for {url}: {e}")
        return details


# ---------------------------------------------------------------------------
# Main Scraper
# ---------------------------------------------------------------------------

CSV_FIELDS = [
    "job_title",
    "company_name",
    "location",
    "job_link",
    "description",
    "required_skills",
    "posting_date",
]


def scrape(total_pages: int, output_path: str, delay: float):
    """Main scraping orchestrator."""
    
    driver = setup_driver()
    if not driver:
        log.error("❌ Failed to initialize browser")
        return
    
    all_jobs = []
    scraped_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    seen_urls = set()
    
    try:
        log.info("═" * 70)
        log.info("🎯 Scraping IT jobs from: /categories/705/informatique-jobs/")
        log.info(f"📄 Total pages to scrape: {total_pages}")
        log.info("═" * 70)
        
        for page_num in range(1, total_pages + 1):
            log.info("")
            log.info(f"📄 PAGE {page_num}/{total_pages}")
            log.info("─" * 70)
            
            # Build URL
            url = f"{IT_CATEGORY_URL}?page={page_num}"
            
            # Fetch listing page
            soup = fetch_page(driver, url)
            if not soup:
                log.warning(f"Failed to load page {page_num}")
                continue
            
            # Parse job cards
            jobs = parse_listing_page(soup)
            
            if not jobs:
                log.warning("No jobs found on this page")
                continue
            
            # Extract details for each job
            for idx, job in enumerate(jobs, 1):
                # Skip duplicates
                if job["job_link"] in seen_urls:
                    log.info(f"   [{idx}/{len(jobs)}] Duplicate - skipping")
                    continue
                
                seen_urls.add(job["job_link"])
                
                log.info(f"   [{idx}/{len(jobs)}] {job['job_title'][:55]}")
                log.info(f"             Company: {job['company_name'][:40]}")
                
                # Fetch job details
                details = extract_job_details(driver, job["job_link"])
                
                # Merge details
                job["description"] = details["description"]
                job["required_skills"] = details["required_skills"]
                job["posting_date"] = details["posting_date"]  # Now from detail page
                
                # Add to collection
                all_jobs.append(job)
                
                desc_preview = job["description"][:80] + "..." if job["description"] else "No description"
                skills_preview = job["required_skills"][:60] if job["required_skills"] else "No skills"
                date_info = job["posting_date"] if job["posting_date"] else "No date"
                
                log.info(f"             ✓ Date: {date_info}")
                log.info(f"             ✓ Description: {desc_preview}")
                log.info(f"             ✓ Skills: {skills_preview}")
                
                # Delay between requests
                human_delay(delay, delay + 1)
            
            log.info(f"   ✅ Page {page_num} complete: {len(jobs)} jobs added")
            log.info(f"   📊 Total collected: {len(all_jobs)} jobs")
            
            # Delay between pages
            human_delay(delay + 1, delay + 2)
    
    except KeyboardInterrupt:
        log.info("\n⚠️  Interrupted by user")
    
    finally:
        try:
            driver.quit()
        except:
            pass
        log.info("🔒 Browser closed")
    
    # Save to CSV
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    
    with out.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_jobs)
    
    log.info("")
    log.info("═" * 70)
    log.info(f"✅  SAVED {len(all_jobs)} IT JOBS → {out.resolve()}")
    log.info("═" * 70)
    
    # Statistics
    with_desc = sum(1 for j in all_jobs if j.get("description"))
    with_skills = sum(1 for j in all_jobs if j.get("required_skills"))
    
    log.info("")
    log.info("📊 Statistics:")
    log.info(f"   • Total jobs: {len(all_jobs)}")
    log.info(f"   • With description: {with_desc} ({with_desc/len(all_jobs)*100:.1f}%)" if all_jobs else "   • With description: 0")
    log.info(f"   • With skills: {with_skills} ({with_skills/len(all_jobs)*100:.1f}%)" if all_jobs else "   • With skills: 0")
    log.info("")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="Scrape IT jobs from TanitJobs informatique category"
    )
    parser.add_argument(
        "--pages", type=int, default=16,
        help="Number of pages to scrape (default: 16)"
    )
    parser.add_argument(
        "--output", type=str, default="tanitjobs_it_jobs.csv",
        help="Output CSV file"
    )
    parser.add_argument(
        "--delay", type=float, default=2.5,
        help="Delay between requests in seconds (default: 2.5)"
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    
    log.info("╔════════════════════════════════════════════════════════╗")
    log.info("║     TanitJobs IT Category Scraper                     ║")
    log.info("║     Category: Informatique (Pre-filtered)             ║")
    log.info("╚════════════════════════════════════════════════════════╝")
    log.info("")
    log.info(f"Configuration:")
    log.info(f"  • Pages: {args.pages}")
    log.info(f"  • Delay: {args.delay}s")
    log.info(f"  • Output: {args.output}")
    log.info("")
    
    scrape(
        total_pages=args.pages,
        output_path=args.output,
        delay=args.delay,
    )