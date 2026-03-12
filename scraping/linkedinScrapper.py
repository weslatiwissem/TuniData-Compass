import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
import pandas as pd

def extract_full_description(driver, wait):
    """Extract complete description including bullets and hidden content"""
    try:
        # Wait for the description section to be present
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "show-more-less-html__markup")))
        
        # Try to click "Show more" / "voir plus" button
        show_more_selectors = [
            "//button[contains(@aria-label, 'Show more')]",
            "//button[contains(@aria-label, 'voir plus')]",
            "//button[contains(@class, 'show-more-less-html__button')]",
        ]
        
        show_more_clicked = False
        for selector in show_more_selectors:
            try:
                show_more = WebDriverWait(driver, 3).until(
                    EC.element_to_be_clickable((By.XPATH, selector))
                )
                driver.execute_script("arguments[0].click();", show_more)
                time.sleep(1)
                print("  Expanded full description")
                show_more_clicked = True
                break
            except:
                continue
        
        if not show_more_clicked:
            print("  No 'Show more' button found")
        
        # Extract description - try multiple selectors with innerHTML
        selectors_to_try = [
            (By.CLASS_NAME, "show-more-less-html__markup"),
            (By.CLASS_NAME, "jobs-description__content"),
            (By.CSS_SELECTOR, ".description__text"),
            (By.CSS_SELECTOR, "article.jobs-description"),
            (By.XPATH, "//div[contains(@class, 'jobs-description')]"),
        ]
        
        for by_method, selector in selectors_to_try:
            try:
                element = driver.find_element(by_method, selector)
                
                # Get innerHTML which preserves all content including bullets
                html_content = element.get_attribute('innerHTML')
                
                # Parse with BeautifulSoup to extract text INCLUDING bullets
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # Extract text - this gets everything including bullets
                description = soup.get_text(separator='\n', strip=True)
                
                if description and len(description) > 50:
                    print(f"  ✓ Description extracted: {len(description)} characters")
                    return description
                    
            except:
                continue
        
        print("  ⚠️ Could not extract meaningful description")
        return "Description not available"
                
    except Exception as e:
        print(f"  ⚠️ Error extracting description: {e}")
        return "Description not available"


def scrape_linkedin_jobs(keyword="data", location="Tunisia", pages=5, existing_links=set()):
    """Scrape jobs, skipping links that already exist in the dataset"""
    
    # Set up Chrome options
    options = webdriver.ChromeOptions()
    options.add_argument('--start-maximized')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    wait = WebDriverWait(driver, 15)
    
    url = f"https://www.linkedin.com/jobs/search/?keywords={keyword}&location={location}"
    driver.get(url)
    time.sleep(5)
    
    print("Loading job listings...")
    for i in range(pages):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(5)
        print(f"  Scrolled {i+1}/{pages} times")
    
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    jobs_html = soup.find_all("div", class_="base-card")
    
    print(f"\nFound {len(jobs_html)} job listings")
    
    # First pass: collect all basic info and links
    jobs_basic_info = []
    skipped_count = 0
    
    for job in jobs_html:
        try:
            title = job.find("span").get_text(strip=True)
            company = job.find("h4").get_text(strip=True)
            job_location = job.find("span", class_="job-search-card__location").get_text(strip=True)
            date = job.find("time")["datetime"]
            job_link = job.find("a")["href"]
            
            # Skip if link already exists
            if job_link in existing_links:
                skipped_count += 1
                continue
            
            jobs_basic_info.append({
                "title": title,
                "company": company,
                "location": job_location,
                "date": date,
                "job_link": job_link
            })
        except Exception as e:
            print(f"Error extracting basic info: {e}")
            pass
    
    print(f"Collected {len(jobs_basic_info)} NEW job links (skipped {skipped_count} duplicates)\n")
    
    # Second pass: visit each NEW job link and extract description
    jobs = []
    
    for idx, job_info in enumerate(jobs_basic_info):
        try:
            print(f"Processing NEW job {idx + 1}/{len(jobs_basic_info)}...")
            print(f"  Title: {job_info['title']}")
            print(f"  Company: {job_info['company']}")
            
            driver.get(job_info['job_link'])
            time.sleep(3)
            
            # Use the new extraction function
            description = extract_full_description(driver, wait)
            
            # Combine basic info with description
            job_data = job_info.copy()
            job_data['description'] = description
            jobs.append(job_data)
            
            time.sleep(1)
            
        except Exception as e:
            print(f"  ⚠️ Error processing job: {e}")
            job_data = job_info.copy()
            job_data['description'] = "Description not available"
            jobs.append(job_data)
    
    driver.quit()
    return pd.DataFrame(jobs)


# ============================================================
#                    CONFIGURATION
# ============================================================

CSV_FILE = "linkedin_jobs_complete.csv"  

# Your keywords
keywords = [
     "data", "cybersecurity", "software engineer", 
    "graphic designer", "it", "machine learning",
    "ui ux designer", "multimedia designer",
    "game developer" 
]

# ============================================================
#               LOAD EXISTING DATA & BUILD LINK SET
# ============================================================

if os.path.exists(CSV_FILE):
    existing_df = pd.read_csv(CSV_FILE)
    
    # Get all existing job links
    existing_links = set(existing_df['job_link'].dropna().unique())
    
    # Get already scraped keywords
    already_scraped_keywords = set(existing_df['search_keyword'].str.lower().unique())
    
    print(f"✓ Loaded existing CSV with {len(existing_df)} jobs")
    print(f"✓ Found {len(existing_links)} unique job links already scraped")
    print(f"✓ Already scraped keywords: {already_scraped_keywords}\n")
else:
    existing_df = pd.DataFrame()
    existing_links = set()
    already_scraped_keywords = set()
    print("No existing CSV found — starting fresh\n")

# Determine which keywords to scrape
keywords_to_scrape = [k for k in keywords if k.lower() not in already_scraped_keywords]

if not keywords_to_scrape:
    print("All keywords already scraped!")
    print("If you want to re-scrape, remove keywords from CSV or change keyword list.")
else:
    print(f"Scraping {len(keywords_to_scrape)} new keywords: {keywords_to_scrape}\n")

# ============================================================
#                     SCRAPING LOOP
# ============================================================

for keyword in keywords_to_scrape:
    print(f"\n{'='*60}")
    print(f"Scraping jobs for: {keyword}")
    print(f"{'='*60}")
    
    # Pass existing links to skip duplicates
    df = scrape_linkedin_jobs(
        keyword=keyword, 
        location="tunisie", 
        pages=5,
        existing_links=existing_links
    )
    
    if len(df) == 0:
        print(f"⚠️ No new jobs found for '{keyword}' (all were duplicates)")
        continue
    
    df['search_keyword'] = keyword
    
    # Append new jobs to CSV
    df.to_csv(CSV_FILE, mode='a', header=not os.path.exists(CSV_FILE), index=False)
    print(f"✓ Appended {len(df)} NEW jobs for '{keyword}' to {CSV_FILE}")
    
    # Update the existing_links set so next keyword also skips these
    existing_links.update(df['job_link'].values)
    
    time.sleep(5)

# Remove duplicates at the end (safety check)
final_df = pd.read_csv(CSV_FILE)
original_count = len(final_df)
final_df = final_df.drop_duplicates(subset=['job_link'], keep='first')
duplicates_removed = original_count - len(final_df)

final_df.to_csv(CSV_FILE, index=False)

print(f"\n{'='*60}")
print(f"✓ Done! Total unique jobs in CSV: {len(final_df)}")
if duplicates_removed > 0:
    print(f"✓ Removed {duplicates_removed} duplicate entries in final cleanup")
print(f"{'='*60}")