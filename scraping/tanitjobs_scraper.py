"""
tanitjobs_scraper.py - Complete Rewrite for IT Jobs
----------------------------------------------------
Properly extracts ALL fields from TanitJobs detail pages.

FIXES:
- Extracts job description, requirements, experience, education
- Better IT job detection
- Handles the actual TanitJobs page structure
- Collects 300+ IT jobs

Usage:
  python tanitjobs_scraper.py --pages 20
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

# Multiple search strategies for IT jobs
SEARCH_QUERIES = [
    "informatique",
    "développeur", 
    "software",
    "IT",
    "data",
]

# Extended IT keywords for filtering
IT_KEYWORDS = [
    # Job titles (French & English)
    r"\bdéveloppeur\b", r"\bdeveloper\b", r"\bdev\b", r"\bingénieur informatique\b",
    r"\bprogrammeur\b", r"\bsoftware engineer\b", r"\bdata scientist\b", r"\bdata analyst\b",
    r"\bdevops\b", r"\barchitecte\b", r"\btech lead\b", r"\bscrum master\b",
    r"\bweb developer\b", r"\bmobile developer\b", r"\bfull stack\b", r"\bfrontend\b", 
    r"\bbackend\b", r"\bqa engineer\b", r"\btest\b", r"\bsecurity engineer\b",
    r"\bnetwork\b", r"\bsystème\b", r"\badministrateur\b", r"\bdba\b",
    r"\bcloud engineer\b", r"\bmlops\b", r"\bai engineer\b",
    
    # Tech keywords
    r"\bpython\b", r"\bjava\b", r"\bjavascript\b", r"\bphp\b", r"\bc\+\+\b", r"\bc#\b",
    r"\breact\b", r"\bangular\b", r"\bvue\b", r"\bdjango\b", r"\bspring\b", r"\blaravel\b",
    r"\bsql\b", r"\bmongodb\b", r"\bpostgresql\b", r"\boracle\b",
    r"\baws\b", r"\bazure\b", r"\bgcp\b", r"\bdocker\b", r"\bkubernetes\b",
    r"\bmachine learning\b", r"\bdeep learning\b", r"\bdata science\b",
    
    # French IT terms
    r"\binformatique\b", r"\blogiciel\b", r"\bapplication\b", r"\bbase de données\b",
    r"\bréseau\b", r"\bsécurité informatique\b", r"\bdéveloppement\b",
]

IT_PATTERN = re.compile("|".join(IT_KEYWORDS), re.IGNORECASE)

# Skills extraction pattern
SKILL_KEYWORDS = [
    "python", "java", "javascript", "typescript", "c#", "c\\+\\+", "php", "ruby",
    "swift", "kotlin", "go", "rust", "scala", "perl", "r\\b",
    "react", "angular", "vue", "node\\.js", "next\\.js", "django", "flask",
    "spring boot?", "laravel", "express", "asp\\.net",
    "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "oracle",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins",
    "git", "linux", "nginx", "apache", "ci/cd", "devops",
    "machine learning", "deep learning", "tensorflow", "pytorch", "pandas",
    "numpy", "scikit-learn", "spark", "hadoop", "power bi", "tableau",
    "agile", "scrum", "rest api", "graphql", "microservices",
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
    """Normalize whitespace and clean text."""
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text)
    text = text.strip()
    return text


def extract_skills(text: str) -> str:
    """Extract unique skill keywords from text."""
    if not text:
        return ""
    found = {m.group().lower() for m in SKILL_PATTERN.finditer(text)}
    return ", ".join(sorted(found)) if found else ""


def is_it_job(job: dict) -> bool:
    """Check if job is IT-related."""
    # Combine multiple fields for checking
    text = " ".join([
        job.get("job_title", ""),
        job.get("job_category", ""),
        job.get("description", "")[:1000],  # First 1000 chars
        job.get("required_skills", ""),
    ]).lower()
    
    # Must match at least one IT keyword
    return bool(IT_PATTERN.search(text))


def human_delay(min_sec=2, max_sec=4):
    """Random human-like delay."""
    time.sleep(random.uniform(min_sec, max_sec))


# ---------------------------------------------------------------------------
# Selenium Setup
# ---------------------------------------------------------------------------

def setup_driver():
    """Initialize Chrome with anti-detection."""
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
    options.add_argument("--start-maximized")
    
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
    """Wait for Cloudflare challenge."""
    log.info("╔════════════════════════════════════════════════════╗")
    log.info("║  🛡️  CLOUDFLARE DETECTED                          ║")
    log.info("║  Please click the checkbox and wait...            ║")
    log.info("╚════════════════════════════════════════════════════╝")
    
    start = time.time()
    while time.time() - start < max_wait:
        try:
            src = driver.page_source.lower()
            url = driver.current_url
            
            if all(x not in src for x in ["cloudflare", "vérification de sécurité", "challenge"]):
                if "challenge" not in url:
                    log.info("✅ Challenge passed!")
                    time.sleep(2)
                    return True
            
            elapsed = int(time.time() - start)
            if elapsed % 10 == 0:
                log.info(f"   ⏳ Waiting... ({max_wait - elapsed}s)")
        except:
            pass
        time.sleep(3)
    
    log.warning("⚠️  Timeout")
    return False


def scroll_page(driver):
    """Scroll to load lazy content."""
    try:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight/2);")
        time.sleep(0.5)
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(0.5)
    except:
        pass


# ---------------------------------------------------------------------------
# Scraping Functions
# ---------------------------------------------------------------------------

def fetch_page(driver, url: str) -> BeautifulSoup | None:
    """Load page and handle Cloudflare."""
    try:
        log.info(f"🌐 {url}")
        driver.get(url)
        human_delay(2, 3)
        
        # Check for Cloudflare
        src = driver.page_source.lower()
        if any(x in src for x in ["cloudflare", "vérification de sécurité"]):
            if not solve_cloudflare(driver):
                return None
            driver.get(url)
            human_delay(2, 3)
        
        scroll_page(driver)
        
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "article"))
            )
        except TimeoutException:
            log.warning("⚠️  Timeout")
        
        return BeautifulSoup(driver.page_source, "lxml")
    except Exception as e:
        log.error(f"Error: {e}")
        return None


def parse_listing_page(soup: BeautifulSoup) -> list[dict]:
    """Extract job cards from listing page."""
    cards = []
    
    # Find all job articles
    articles = soup.select("article")
    
    if not articles:
        log.warning("⚠️  No articles found")
        return cards
    
    for article in articles:
        job_id = article.get("id", "").strip()
        
        # Title and URL
        title_link = article.select_one("h2 a, h3 a, a.link, .listing-item__title a")
        if not title_link:
            continue
            
        job_title = clean_text(title_link.get_text())
        job_url = title_link.get("href", "")
        
        if not job_url:
            continue
            
        if not job_url.startswith("http"):
            job_url = BASE_URL + job_url
        
        # Company
        company = article.select_one(".company-name, [href*='/company/']")
        company_name = clean_text(company.get_text()) if company else ""
        
        # Location
        location = article.select_one(".location, [class*='location']")
        location_text = clean_text(location.get_text()) if location else ""
        
        # Category/Sector
        category = article.select_one(".category, .sector, [class*='sector']")
        job_category = clean_text(category.get_text()) if category else ""
        
        # Contract type
        contract = article.select_one(".contract, [class*='contract']")
        contract_type = clean_text(contract.get_text()) if contract else ""
        
        # Date
        date_elem = article.select_one("time, .date")
        posting_date = ""
        if date_elem:
            posting_date = date_elem.get("datetime") or clean_text(date_elem.get_text())
        
        cards.append({
            "job_id": job_id,
            "job_title": job_title,
            "company_name": company_name,
            "location": location_text,
            "job_category": job_category,
            "contract_type": contract_type,
            "posting_date": posting_date,
            "job_url": job_url,
            "experience": "",
            "education": "",
            "description": "",
            "required_skills": "",
        })
    
    return cards


def extract_job_details(driver, url: str) -> dict:
    """Extract full details from job detail page."""
    details = {
        "description": "",
        "required_skills": "",
        "experience": "",
        "education": "",
        "contract_type": "",
        "job_category": "",
    }
    
    if not url:
        return details
    
    try:
        driver.get(url)
        human_delay(2, 3)
        scroll_page(driver)
        
        soup = BeautifulSoup(driver.page_source, "lxml")
        
        # --- Extract Description ---
        # Try multiple selectors
        desc_section = (
            soup.select_one("#description") or
            soup.select_one(".job-description") or
            soup.select_one("[class*='description']") or
            soup.select_one(".job-detail") or
            soup.find("h3", string=re.compile(r"Description", re.I))
        )
        
        if desc_section:
            # If it's a header, get the next sibling content
            if desc_section.name in ["h2", "h3", "h4"]:
                content = desc_section.find_next_sibling()
                if content:
                    desc_section = content
            
            # Remove scripts/styles
            for tag in desc_section.select("script, style"):
                tag.decompose()
            
            description = clean_text(desc_section.get_text(separator=" "))
            details["description"] = description
            details["required_skills"] = extract_skills(description)
        
        # --- Extract Meta Information ---
        # Look for info blocks with labels like "Experience:", "Type d'emploi:", etc.
        
        # Method 1: Find specific labeled sections
        all_text = soup.get_text()
        
        # Experience
        exp_match = re.search(r"Expérience?\s*:?\s*([^\n]+)", all_text, re.I)
        if exp_match:
            details["experience"] = clean_text(exp_match.group(1))
        
        # Education/Formation
        edu_match = re.search(r"(?:Formation|Diplôme|Niveau d'études)\s*:?\s*([^\n]+)", all_text, re.I)
        if edu_match:
            details["education"] = clean_text(edu_match.group(1))
        
        # Contract type
        contract_match = re.search(r"Type d'emploi\s*:?\s*([^\n]+)", all_text, re.I)
        if contract_match:
            details["contract_type"] = clean_text(contract_match.group(1))
        
        # Method 2: Look for structured data in lists
        info_lists = soup.select("ul, dl, .job-info, .listing-detail__info")
        for info_list in info_lists:
            items = info_list.select("li, dt, dd")
            for i, item in enumerate(items):
                text = clean_text(item.get_text()).lower()
                
                # Try to get value from next sibling or span
                value = ""
                if i + 1 < len(items):
                    value = clean_text(items[i + 1].get_text())
                else:
                    value_elem = item.select_one("span, strong")
                    if value_elem:
                        value = clean_text(value_elem.get_text())
                
                if "expérience" in text and value:
                    details["experience"] = value
                elif "formation" in text or "diplôme" in text:
                    details["education"] = value
                elif "type" in text or "contrat" in text:
                    details["contract_type"] = value
                elif "secteur" in text or "catégorie" in text:
                    details["job_category"] = value
        
        # If no description found, try to extract from entire page
        if not details["description"]:
            # Get all paragraphs
            paragraphs = soup.select("p")
            desc_parts = []
            for p in paragraphs:
                text = clean_text(p.get_text())
                if len(text) > 50:  # Only substantial paragraphs
                    desc_parts.append(text)
            
            if desc_parts:
                details["description"] = " ".join(desc_parts[:5])  # First 5 paragraphs
                details["required_skills"] = extract_skills(details["description"])
        
        return details
        
    except Exception as e:
        log.error(f"Detail extraction failed: {e}")
        return details


# ---------------------------------------------------------------------------
# Main Scraper
# ---------------------------------------------------------------------------

CSV_FIELDS = [
    "job_id", "job_title", "company_name", "location", "job_category",
    "contract_type", "experience", "education", "posting_date",
    "description", "required_skills", "job_url", "scraped_at",
]


def scrape(max_pages_per_search: int, output_path: str, delay: float, target_jobs: int = 300):
    """Main scraping orchestrator."""
    
    driver = setup_driver()
    if not driver:
        return
    
    all_jobs = []
    seen_urls = set()
    scraped_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    try:
        for search_query in SEARCH_QUERIES:
            log.info("═" * 70)
            log.info(f"🔍 Searching: '{search_query}'")
            log.info("═" * 70)
            
            for page in range(1, max_pages_per_search + 1):
                url = f"{BASE_URL}/jobs?search={search_query}&page={page}"
                
                log.info(f"📄 Page {page}/{max_pages_per_search}")
                
                soup = fetch_page(driver, url)
                if not soup:
                    log.warning("Failed to load page")
                    break
                
                cards = parse_listing_page(soup)
                if not cards:
                    log.info("No more jobs - next search")
                    break
                
                log.info(f"   Found {len(cards)} job cards")
                
                for idx, card in enumerate(cards, 1):
                    # Skip duplicates
                    if card["job_url"] in seen_urls:
                        continue
                    
                    seen_urls.add(card["job_url"])
                    
                    log.info(f"   [{idx}/{len(cards)}] {card['job_title'][:55]}")
                    
                    # Fetch details
                    details = extract_job_details(driver, card["job_url"])
                    
                    # Merge details into card
                    for key, val in details.items():
                        if val and not card.get(key):
                            card[key] = val
                    
                    # Filter IT jobs
                    if is_it_job(card):
                        card["scraped_at"] = scraped_at
                        all_jobs.append(card)
                        log.info(f"        ✓ IT job! ({len(all_jobs)} total)")
                    else:
                        log.info(f"        ✗ Not IT - skipped")
                    
                    human_delay(delay, delay + 1)
                    
                    # Check if target reached
                    if len(all_jobs) >= target_jobs:
                        log.info(f"🎯 Target reached: {len(all_jobs)} jobs!")
                        break
                
                if len(all_jobs) >= target_jobs:
                    break
                
                human_delay(delay + 1, delay + 2)
            
            if len(all_jobs) >= target_jobs:
                break
    
    except KeyboardInterrupt:
        log.info("\n⚠️  Interrupted by user")
    
    finally:
        try:
            driver.quit()
        except:
            pass
        log.info("🔒 Browser closed")
    
    # Save CSV
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    
    with out.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_jobs)
    
    log.info("═" * 70)
    log.info(f"✅  SAVED {len(all_jobs)} IT JOBS → {out.resolve()}")
    log.info("═" * 70)
    
    # Stats
    with_desc = sum(1 for j in all_jobs if j.get("description"))
    with_skills = sum(1 for j in all_jobs if j.get("required_skills"))
    
    log.info(f"📊 Stats:")
    log.info(f"   - Total jobs: {len(all_jobs)}")
    log.info(f"   - With description: {with_desc}")
    log.info(f"   - With skills: {with_skills}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(description="TanitJobs IT Scraper - Fixed Version")
    parser.add_argument("--pages", type=int, default=20,
                        help="Pages per search term (default: 20)")
    parser.add_argument("--output", type=str, default="tanitjobs_it_jobs.csv",
                        help="Output file")
    parser.add_argument("--delay", type=float, default=2.5,
                        help="Delay between requests (default: 2.5s)")
    parser.add_argument("--target", type=int, default=300,
                        help="Target number of IT jobs (default: 300)")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    
    log.info("╔════════════════════════════════════════════════════════╗")
    log.info("║     TanitJobs IT Scraper - FIXED VERSION              ║")
    log.info("║     Target: 300+ IT jobs with full details            ║")
    log.info("╚════════════════════════════════════════════════════════╝")
    log.info("")
    
    scrape(
        max_pages_per_search=args.pages,
        output_path=args.output,
        delay=args.delay,
        target_jobs=args.target,
    )