#!/usr/bin/env python3
"""
Naukrigulf Advanced Web Scraper
Scrapes job listings from Naukrigulf.com with configurable parameters
"""

import requests
from bs4 import BeautifulSoup
import csv
import time
from urllib.parse import urljoin
import re
import json
from datetime import datetime
import argparse


class NaukrigulfScraperAdvanced:
    """Advanced web scraper for Naukrigulf.com with configurable search"""
    
    def __init__(self, industry_type=25, location="tunisia", keywords=""):
        self.base_url = "https://www.naukrigulf.com"
        self.industry_type = industry_type  # 25 = IT
        self.location = location.lower()
        self.keywords = keywords
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }
        self.jobs = []
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def build_search_url(self, page_num):
        """Build search URL with parameters"""
        url = f"{self.base_url}/jobs-in-{self.location}?industryType={self.industry_type}&page={page_num}"
        if self.keywords:
            url += f"&k={self.keywords.replace(' ', '+')}"
        return url
    
    def scrape_listing_page(self, page_num=1):
        """Scrape a single listing page"""
        url = self.build_search_url(page_num)
        print(f"Scraping page {page_num}: {url}")
        
        try:
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find all job listings
            job_articles = soup.find_all('li', class_=re.compile(r'info-exp|tuple'))
            
            if not job_articles:
                job_articles = soup.find_all('article', class_=re.compile(r'job|listing'))
            
            if not job_articles:
                job_articles = soup.find_all('div', class_=re.compile(r'tuple|job-tuple|srp-tuple'))
            
            print(f"Found {len(job_articles)} job listings on page {page_num}")
            
            for idx, article in enumerate(job_articles, 1):
                print(f"  Processing job {idx}/{len(job_articles)}...")
                job_data = self.parse_job_listing(article)
                if job_data:
                    self.jobs.append(job_data)
                    time.sleep(0.5)
            
            return len(job_articles)
        
        except requests.exceptions.RequestException as e:
            print(f"Error scraping page {page_num}: {e}")
            return 0
    
    def parse_job_listing(self, article):
        """Parse a single job listing"""
        job_data = {}
        
        try:
            # Job title
            title_elem = article.find('p', class_='designation-title')
            if not title_elem:
                title_elem = article.find('a', class_=re.compile(r'title|job-title'))
            if not title_elem:
                title_elem = article.find(['h2', 'h3', 'h4'])
            
            if title_elem:
                title_link = title_elem.find('a') if title_elem.name != 'a' else title_elem
                if title_link and title_link.get('href'):
                    job_data['title'] = title_link.text.strip()
                    job_data['url'] = urljoin(self.base_url, title_link['href'])
                else:
                    job_data['title'] = title_elem.text.strip()
            
            # Company name
            company_elem = article.find('span', class_='ico-webjob')
            if not company_elem:
                company_elem = article.find('p', class_=re.compile(r'company|recruiter'))
            if not company_elem:
                company_elem = article.find('a', class_='info-org')
            
            if company_elem:
                company_text = company_elem.get_text(strip=True)
                company_text = re.sub(r'^.*?(?=[A-Z])', '', company_text)
                job_data['company'] = company_text
            
            # Experience required
            exp_elem = article.find('li', class_='info-exp')
            if not exp_elem:
                exp_elem = article.find('span', string=re.compile(r'\d+\s*-\s*\d+\s*[Yy]ears'))
            
            if exp_elem:
                exp_text = exp_elem.get_text(strip=True)
                exp_match = re.search(r'(\d+\s*-\s*\d+)\s*[Yy]ears?', exp_text)
                if exp_match:
                    job_data['experience'] = exp_match.group(1) + ' Years'
                else:
                    job_data['experience'] = exp_text
            
            # Location
            loc_elem = article.find('li', class_='info-loc')
            if not loc_elem:
                loc_elem = article.find('span', class_='ico')
            if not loc_elem:
                loc_elem = article.find('span', string=re.compile(r'Tunisia'))
            
            if loc_elem:
                location_text = loc_elem.get_text(strip=True)
                location_text = re.sub(r'^.*?(?=Tunisia)', '', location_text)
                job_data['location'] = location_text
            
            # Posted date
            date_elem = article.find('span', class_='time-star-cont')
            if not date_elem:
                date_elem = article.find('span', class_='time')
            if not date_elem:
                date_elem = article.find('span', string=re.compile(r'\d+\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)', re.I))
            
            if date_elem:
                date_text = date_elem.get_text(strip=True)
                job_data['posted_date'] = date_text
            
            # Description preview
            desc_elem = article.find('p', class_='description')
            if not desc_elem:
                desc_elem = article.find('div', class_=re.compile(r'description|summary'))
            
            if desc_elem:
                job_data['description_preview'] = desc_elem.get_text(strip=True)
            
            # Company logo
            logo_elem = article.find('img', class_=re.compile(r'logo'))
            if logo_elem and logo_elem.get('src'):
                job_data['company_logo_url'] = urljoin(self.base_url, logo_elem['src'])
            
            # Get full job description
            if 'url' in job_data:
                print(f"    Fetching full details for: {job_data.get('title', 'Unknown')}")
                full_description = self.get_full_job_description(job_data['url'])
                job_data['full_description'] = full_description
            
            return job_data
        
        except Exception as e:
            print(f"Error parsing job listing: {e}")
            return None
    
    def get_full_job_description(self, job_url, max_retries=3):
        """Visit individual job page and extract full description"""
        for attempt in range(max_retries):
            try:
                response = self.session.get(job_url, timeout=15)
                response.raise_for_status()
                soup = BeautifulSoup(response.content, 'html.parser')
                
                description_text = None
                
                possible_selectors = [
                    ('div', {'class': re.compile(r'job[-_]?description', re.IGNORECASE)}),
                    ('section', {'class': re.compile(r'description', re.IGNORECASE)}),
                    ('div', {'id': re.compile(r'job[-_]?desc', re.IGNORECASE)}),
                    ('div', {'class': re.compile(r'jd[-_]?info', re.IGNORECASE)}),
                    ('article', {'class': re.compile(r'detail', re.IGNORECASE)}),
                ]
                
                for tag, attrs in possible_selectors:
                    container = soup.find(tag, attrs)
                    if container:
                        text = container.get_text(separator='\n', strip=True)
                        text = re.sub(r'\n{3,}', '\n\n', text)
                        if len(text) > 100:
                            description_text = text
                            break
                
                if not description_text:
                    main_content = soup.find('main') or soup.find('div', class_=re.compile(r'main|content', re.IGNORECASE))
                    if main_content:
                        elements = main_content.find_all(['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li'])
                        text_parts = []
                        for elem in elements:
                            text = elem.get_text(strip=True)
                            if len(text) > 20:
                                text_parts.append(text)
                        
                        if text_parts:
                            description_text = '\n'.join(text_parts)
                
                if not description_text:
                    paragraphs = soup.find_all('p')
                    text_parts = []
                    for p in paragraphs:
                        text = p.get_text(strip=True)
                        if len(text) > 40 and not any(x in text.lower() for x in ['cookie', 'privacy', 'terms', 'copyright', '©']):
                            text_parts.append(text)
                    
                    if text_parts:
                        description_text = '\n\n'.join(text_parts[:20])
                
                if description_text:
                    description_text = description_text.replace('\xa0', ' ')
                    description_text = re.sub(r' +', ' ', description_text)
                    return description_text[:5000]
                else:
                    return "Description not found on job page"
                
            except requests.exceptions.Timeout:
                if attempt < max_retries - 1:
                    print(f"    Timeout on attempt {attempt + 1}, retrying...")
                    time.sleep(2)
                else:
                    return "Error: Request timeout"
            except Exception as e:
                print(f"    Error: {e}")
                return f"Error: {str(e)}"
        
        return "Error: Max retries exceeded"
    
    def scrape_all_pages(self, num_pages=5):
        """Scrape all pages"""
        print(f"Starting to scrape {num_pages} pages...")
        print(f"Search parameters:")
        print(f"  Industry Type: {self.industry_type} (25=IT)")
        print(f"  Location: {self.location}")
        print(f"  Keywords: '{self.keywords}' (empty means all)")
        print()
        
        for page in range(1, num_pages + 1):
            count = self.scrape_listing_page(page)
            if count == 0:
                print(f"No jobs found on page {page}, stopping.")
                break
            time.sleep(1)
        
        print(f"\nTotal jobs scraped: {len(self.jobs)}")
    
    def save_to_csv(self, filename='naukrigulf_listings.csv'):
        """Save scraped data to CSV with cleaned text"""
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
                    
                    replacements = {
                        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
                        'à': 'a', 'â': 'a', 'ä': 'a',
                        'ù': 'u', 'û': 'u', 'ü': 'u',
                        'ô': 'o', 'ö': 'o',
                        'î': 'i', 'ï': 'i',
                        'ç': 'c',
                        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
                        'À': 'A', 'Â': 'A', 'Ä': 'A',
                        'Ù': 'U', 'Û': 'U', 'Ü': 'U',
                        'Ô': 'O', 'Ö': 'O',
                        'Î': 'I', 'Ï': 'I',
                        'Ç': 'C'
                    }
                    for accent, normal in replacements.items():
                        value_str = value_str.replace(accent, normal)
                    
                    cleaned_job[key] = value_str.strip()
                else:
                    cleaned_job[key] = ''
            
            cleaned_jobs.append(cleaned_job)
        
        fieldnames = set()
        for job in cleaned_jobs:
            fieldnames.update(job.keys())
        fieldnames = sorted(list(fieldnames))
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
            writer.writeheader()
            writer.writerows(cleaned_jobs)
        
        print(f"Data saved to {filename}")
    
    def save_to_json(self, filename='naukrigulf_listings.json'):
        """Save scraped data to JSON"""
        if not self.jobs:
            print("No jobs to save!")
            return
        
        with open(filename, 'w', encoding='utf-8') as jsonfile:
            json.dump({
                'scraped_at': datetime.now().isoformat(),
                'search_params': {
                    'industry_type': self.industry_type,
                    'location': self.location,
                    'keywords': self.keywords
                },
                'total_jobs': len(self.jobs),
                'jobs': self.jobs
            }, jsonfile, ensure_ascii=False, indent=2)
        
        print(f"Data saved to {filename}")
    
    def get_statistics(self):
        """Get statistics about scraped jobs"""
        if not self.jobs:
            print("No jobs scraped yet!")
            return
        
        print("\n" + "="*50)
        print("SCRAPING STATISTICS")
        print("="*50)
        print(f"Total jobs scraped: {len(self.jobs)}")
        
        company_counts = {}
        for job in self.jobs:
            company = job.get('company', 'Unknown')
            company_counts[company] = company_counts.get(company, 0) + 1
        
        if company_counts:
            print("\nTop 10 companies:")
            for company, count in sorted(company_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"  {company}: {count}")
        
        location_counts = {}
        for job in self.jobs:
            location = job.get('location', 'Unknown')
            location_counts[location] = location_counts.get(location, 0) + 1
        
        if location_counts:
            print("\nLocations:")
            for location, count in sorted(location_counts.items(), key=lambda x: x[1], reverse=True):
                print(f"  {location}: {count}")
        
        print("="*50 + "\n")


def main():
    """Main function with command-line arguments"""
    parser = argparse.ArgumentParser(description='Scrape job listings from Naukrigulf.com')
    parser.add_argument('--industry', type=int, default=25, help='Industry type ID (default: 25 for IT)')
    parser.add_argument('--location', type=str, default='tunisia', help='Location (default: tunisia)')
    parser.add_argument('--keywords', type=str, default='', help='Search keywords')
    parser.add_argument('--pages', type=int, default=5, help='Number of pages to scrape (default: 5)')
    parser.add_argument('--output', type=str, default='naukrigulf_listings', help='Output filename (without extension)')
    
    args = parser.parse_args()
    
    print("="*60)
    print("NAUKRIGULF ADVANCED WEB SCRAPER")
    print("="*60)
    print()
    
    scraper = NaukrigulfScraperAdvanced(
        industry_type=args.industry,
        location=args.location,
        keywords=args.keywords
    )
    
    scraper.scrape_all_pages(num_pages=args.pages)
    scraper.get_statistics()
    
    scraper.save_to_csv(f'{args.output}.csv')
    scraper.save_to_json(f'{args.output}.json')
    
    print("\nScraping completed successfully!")


if __name__ == "__main__":
    main()
