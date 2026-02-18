#!/usr/bin/env python3
"""
Naukrigulf Selenium Scraper
Uses Selenium WebDriver to scrape job listings from Naukrigulf.com
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
import csv
import time
import re
import json
from datetime import datetime


class NaukrigulfSeleniumScraper:
    """Selenium-based scraper for Naukrigulf.com"""
    
    def __init__(self, headless=True):
        self.base_url = "https://www.naukrigulf.com"
        self.jobs = []
        self.driver = None
        self.headless = headless
        
    def setup_driver(self):
        """Setup Chrome WebDriver with automatic driver management"""
        chrome_options = Options()
        
        if self.headless:
            chrome_options.add_argument('--headless')
        
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        # Hide automation flags
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        try:
            # Use webdriver-manager to automatically download and manage ChromeDriver
            print("Setting up ChromeDriver...")
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            print("✓ Chrome WebDriver initialized successfully")
        except Exception as e:
            print(f"Error initializing Chrome WebDriver: {e}")
            print("\nPlease make sure you have:")
            print("1. Chrome browser installed")
            print("2. Run: pip install selenium webdriver-manager")
            raise
    
    def scrape_listing_page(self, page_num=1):
        """Scrape a single listing page"""
        url = f"https://www.naukrigulf.com/jobs-in-tunisia?industryType=25&page={page_num}"
        print(f"\nScraping page {page_num}: {url}")
        
        try:
            self.driver.get(url)
            
            # Wait for job listings to load
            wait = WebDriverWait(self.driver, 10)
            
            # Try different possible selectors for job listings
            job_elements = None
            selectors = [
                (By.CLASS_NAME, "tuple"),
                (By.CLASS_NAME, "job-tuple"),
                (By.CLASS_NAME, "srp-tuple"),
                (By.CSS_SELECTOR, "article.job"),
                (By.CSS_SELECTOR, "li.info-exp"),
                (By.TAG_NAME, "article"),
            ]
            
            for selector_type, selector_value in selectors:
                try:
                    wait.until(EC.presence_of_element_located((selector_type, selector_value)))
                    job_elements = self.driver.find_elements(selector_type, selector_value)
                    if job_elements:
                        print(f"✓ Found {len(job_elements)} jobs using selector: {selector_value}")
                        break
                except TimeoutException:
                    continue
            
            if not job_elements:
                print("⚠ No job listings found on this page")
                # Save page source for debugging
                with open(f'page_{page_num}_debug.html', 'w', encoding='utf-8') as f:
                    f.write(self.driver.page_source)
                print(f"  Page source saved to page_{page_num}_debug.html for inspection")
                return 0
            
            # Scroll to load all content
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            
            for idx, job_element in enumerate(job_elements, 1):
                print(f"  Processing job {idx}/{len(job_elements)}...")
                job_data = self.parse_job_element(job_element)
                if job_data:
                    # Show what was extracted
                    print(f"    ✓ Title: {job_data.get('title', 'MISSING')[:50]}")
                    print(f"    ✓ Company: {job_data.get('company', 'MISSING')}")
                    print(f"    ✓ URL: {'Found' if job_data.get('url') else 'MISSING'}")
                    self.jobs.append(job_data)
                else:
                    print(f"    ✗ Failed to extract job data")
                time.sleep(0.5)
            
            return len(job_elements)
            
        except Exception as e:
            print(f"Error scraping page {page_num}: {e}")
            return 0
    
    def parse_job_element(self, element):
        """Parse a single job element"""
        job_data = {}
        
        try:
            # Job title, company, and URL are all within <a class="info-position">
            # Structure: <a href="..."><p class="designation-title">Title</p><p class="info-org">Company</p></a>
            
            try:
                # Find the main link element
                link_elem = element.find_element(By.CSS_SELECTOR, "a.info-position")
                job_data['url'] = link_elem.get_attribute('href')
                
                # Get title from <p class="designation-title"> inside the link
                try:
                    title_elem = link_elem.find_element(By.CSS_SELECTOR, "p.designation-title")
                    job_data['title'] = title_elem.text.strip()
                except NoSuchElementException:
                    print("      Warning: Title not found")
                
                # Get company from <p class="info-org"> inside the link
                try:
                    company_elem = link_elem.find_element(By.CSS_SELECTOR, "p.info-org")
                    job_data['company'] = company_elem.text.strip()
                except NoSuchElementException:
                    print("      Warning: Company not found in info-org")
                
            except NoSuchElementException:
                print("      Warning: Main link element (a.info-position) not found")
                
                # Fallback: try to find elements separately
                try:
                    title_elem = element.find_element(By.CSS_SELECTOR, "p.designation-title")
                    job_data['title'] = title_elem.text.strip()
                except NoSuchElementException:
                    pass
                
                try:
                    company_elem = element.find_element(By.CSS_SELECTOR, "p.info-org")
                    job_data['company'] = company_elem.text.strip()
                except NoSuchElementException:
                    pass
                
                # Try to find any link for URL
                try:
                    any_link = element.find_element(By.TAG_NAME, "a")
                    job_data['url'] = any_link.get_attribute('href')
                except NoSuchElementException:
                    pass
            
            # Experience
            exp_selectors = [
                (By.CSS_SELECTOR, "li.info-exp"),
                (By.CSS_SELECTOR, ".experience"),
            ]
            
            for selector_type, selector_value in exp_selectors:
                try:
                    exp_elem = element.find_element(selector_type, selector_value)
                    exp_text = exp_elem.text.strip()
                    job_data['experience'] = exp_text
                    break
                except NoSuchElementException:
                    continue
            
            # Location
            loc_selectors = [
                (By.CSS_SELECTOR, "li.info-loc"),
                (By.CSS_SELECTOR, ".location"),
            ]
            
            for selector_type, selector_value in loc_selectors:
                try:
                    loc_elem = element.find_element(selector_type, selector_value)
                    location_text = loc_elem.text.strip()
                    job_data['location'] = location_text
                    break
                except NoSuchElementException:
                    continue
            
            # Posted date
            date_selectors = [
                (By.CSS_SELECTOR, "span.time-star-cont"),
                (By.CSS_SELECTOR, "span.time"),
                (By.CSS_SELECTOR, ".posted-date"),
            ]
            
            for selector_type, selector_value in date_selectors:
                try:
                    date_elem = element.find_element(selector_type, selector_value)
                    job_data['posted_date'] = date_elem.text.strip()
                    break
                except NoSuchElementException:
                    continue
            
            # Description preview
            desc_selectors = [
                (By.CSS_SELECTOR, "p.description"),
                (By.CSS_SELECTOR, ".job-description"),
                (By.CSS_SELECTOR, ".summary"),
            ]
            
            for selector_type, selector_value in desc_selectors:
                try:
                    desc_elem = element.find_element(selector_type, selector_value)
                    job_data['description_preview'] = desc_elem.text.strip()
                    break
                except NoSuchElementException:
                    continue
            
            # Company logo
            try:
                logo_elem = element.find_element(By.TAG_NAME, "img")
                job_data['company_logo_url'] = logo_elem.get_attribute('src')
            except NoSuchElementException:
                pass
            
            # Get full description from job page
            if 'url' in job_data and job_data['url']:
                print(f"    → Fetching full description...")
                full_desc = self.get_full_job_description(job_data['url'])
                job_data['full_description'] = full_desc
            
            return job_data if job_data else None
            
        except Exception as e:
            print(f"    Error parsing job element: {e}")
            return None
    
    def get_full_job_description(self, job_url):
        """Get full job description from job detail page"""
        try:
            # Open in new tab to preserve current page
            original_window = self.driver.current_window_handle
            self.driver.execute_script("window.open('');")
            self.driver.switch_to.window(self.driver.window_handles[-1])
            
            self.driver.get(job_url)
            wait = WebDriverWait(self.driver, 10)
            
            # Wait for page to load
            time.sleep(2)
            
            # Try to find job description container
            desc_selectors = [
                (By.CSS_SELECTOR, ".job-description"),
                (By.CSS_SELECTOR, "#job-description"),
                (By.CSS_SELECTOR, ".jd-info"),
                (By.ID, "jdInfo"),
                (By.CSS_SELECTOR, "article.detail"),
            ]
            
            description_text = None
            for selector_type, selector_value in desc_selectors:
                try:
                    desc_elem = wait.until(EC.presence_of_element_located((selector_type, selector_value)))
                    description_text = desc_elem.text.strip()
                    if description_text and len(description_text) > 100:
                        break
                except TimeoutException:
                    continue
            
            # If no specific container, get all text
            if not description_text or len(description_text) < 100:
                body = self.driver.find_element(By.TAG_NAME, "body")
                description_text = body.text.strip()
            
            # Close tab and switch back
            self.driver.close()
            self.driver.switch_to.window(original_window)
            
            if description_text:
                return description_text[:5000]
            else:
                return "Description not found"
                
        except Exception as e:
            # Make sure we switch back to original window
            try:
                self.driver.close()
                self.driver.switch_to.window(original_window)
            except:
                pass
            return f"Error fetching description: {str(e)}"
    
    def scrape_all_pages(self, num_pages=5):
        """Scrape multiple pages"""
        print("="*60)
        print("NAUKRIGULF SELENIUM SCRAPER")
        print("="*60)
        print(f"\nStarting to scrape {num_pages} pages...\n")
        
        self.setup_driver()
        
        try:
            for page in range(1, num_pages + 1):
                count = self.scrape_listing_page(page)
                if count == 0:
                    print(f"\nNo jobs found on page {page}, stopping.")
                    break
                time.sleep(2)  # Be polite between pages
            
            print(f"\n{'='*60}")
            print(f"Total jobs scraped: {len(self.jobs)}")
            print("="*60)
            
        finally:
            if self.driver:
                self.driver.quit()
                print("\n✓ Browser closed")
    
    def save_to_csv(self, filename='naukrigulf_listings.csv'):
        """Save to CSV with cleaned text"""
        if not self.jobs:
            print("No jobs to save!")
            return
        
        cleaned_jobs = []
        for job in self.jobs:
            cleaned_job = {}
            for key, value in job.items():
                if value:
                    value_str = str(value)
                    value_str = value_str.replace('\n', ' ').replace('\r', ' ')
                    value_str = re.sub(r'\s+', ' ', value_str)
                    
                    # Normalize accents
                    replacements = {
                        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
                        'à': 'a', 'â': 'a', 'ä': 'a',
                        'ù': 'u', 'û': 'u', 'ü': 'u',
                        'ô': 'o', 'ö': 'o',
                        'î': 'i', 'ï': 'i', 'ç': 'c',
                    }
                    for accent, normal in replacements.items():
                        value_str = value_str.replace(accent, normal)
                    
                    cleaned_job[key] = value_str.strip()
                else:
                    cleaned_job[key] = ''
            cleaned_jobs.append(cleaned_job)
        
        fieldnames = sorted(list(set().union(*[job.keys() for job in cleaned_jobs])))
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
            writer.writeheader()
            writer.writerows(cleaned_jobs)
        
        print(f"✓ Data saved to {filename}")
    
    def save_to_json(self, filename='naukrigulf_listings.json'):
        """Save to JSON"""
        if not self.jobs:
            print("No jobs to save!")
            return
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump({
                'scraped_at': datetime.now().isoformat(),
                'total_jobs': len(self.jobs),
                'jobs': self.jobs
            }, f, ensure_ascii=False, indent=2)
        
        print(f"✓ Data saved to {filename}")
    
    def get_statistics(self):
        """Show statistics"""
        if not self.jobs:
            return
        
        print("\n" + "="*50)
        print("STATISTICS")
        print("="*50)
        print(f"Total jobs: {len(self.jobs)}")
        
        # Companies
        companies = {}
        for job in self.jobs:
            comp = job.get('company', 'Unknown')
            companies[comp] = companies.get(comp, 0) + 1
        
        if companies:
            print("\nTop companies:")
            for comp, count in sorted(companies.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"  {comp}: {count}")
        
        print("="*50)


def main():
    """Main function"""
    scraper = NaukrigulfSeleniumScraper(headless=False)  # Set to True to hide browser
    scraper.scrape_all_pages(num_pages=3)
    scraper.get_statistics()
    scraper.save_to_csv('naukrigulf_selenium.csv')
    scraper.save_to_json('naukrigulf_selenium.json')
    print("\n✓ Scraping completed!")


if __name__ == "__main__":
    main()