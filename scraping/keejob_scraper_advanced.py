#!/usr/bin/env python3
"""
Keejob Advanced Web Scraper
Scrapes job listings from Keejob.com with configurable parameters
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


class KeejobScraperAdvanced:
    """Advanced web scraper for Keejob.com job listings with configurable search"""
    
    def __init__(self, keywords="", profession_ids=None, location="", contract_type=""):
        self.base_url = "https://www.keejob.com"
        self.keywords = keywords
        self.profession_ids = profession_ids or [24]
        self.location = location
        self.contract_type = contract_type
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }
        self.jobs = []
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def build_search_url(self, page_num):
        """Build search URL with parameters"""
        profession_param = str(self.profession_ids).replace(" ", "")
        base = f"{self.base_url}/offres-emploi/"
        query = f"keywords={self.keywords}&professions={profession_param}&page={page_num}"
        return f"{base}?{query}"
    
    def scrape_listing_page(self, page_num):
        """Scrape a single listing page"""
        url = self.build_search_url(page_num)
        print(f"Scraping page {page_num}: {url}")
        
        try:
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find all job articles
            job_articles = soup.find_all('article', class_='bg-white')
            print(f"Found {len(job_articles)} job listings on page {page_num}")
            
            for idx, article in enumerate(job_articles, 1):
                print(f"  Processing job {idx}/{len(job_articles)}...")
                job_data = self.parse_job_listing(article)
                if job_data:
                    self.jobs.append(job_data)
                    # Be polite - add a small delay
                    time.sleep(0.5)
            
            return len(job_articles)
        
        except requests.exceptions.RequestException as e:
            print(f"Error scraping page {page_num}: {e}")
            return 0
    
    def parse_job_listing(self, article):
        """Parse a single job listing article"""
        job_data = {}
        
        try:
            # Job title and URL
            title_h2 = article.find('h2', class_='text-base')
            if title_h2:
                title_link = title_h2.find('a')
                if title_link:
                    job_data['title'] = title_link.text.strip()
                    job_data['url'] = urljoin(self.base_url, title_link['href'])
            
            # Company name and URL
            company_p = article.find('p', class_='text-sm')
            if company_p:
                company_link = company_p.find('a')
                if company_link:
                    job_data['company'] = company_link.text.strip()
                    job_data['company_url'] = urljoin(self.base_url, company_link['href'])
            
            # Industry
            industry_span = article.find('span', class_='bg-indigo-100')
            if industry_span:
                text = industry_span.get_text(strip=True)
                job_data['industry'] = text
            
            # Contract types
            contract_spans = article.find_all('span', class_='bg-blue-100')
            contract_types = []
            for span in contract_spans:
                text = span.get_text(strip=True)
                if text:
                    contract_types.append(text)
            job_data['contract_types'] = ', '.join(contract_types)
            
            # Salary
            salary_span = article.find('span', class_='bg-green-100')
            if salary_span:
                text = salary_span.get_text(strip=True)
                job_data['salary'] = text
            
            # Description preview - the preview text in the listing
            desc_div = article.find('div', class_='mb-3')
            if desc_div:
                desc_p = desc_div.find('p', class_='text-sm')
                if desc_p:
                    job_data['description_preview'] = desc_p.text.strip().replace('\xa0', ' ')
            
            # Location
            location_divs = article.find_all('div', class_='flex items-center whitespace-nowrap')
            for div in location_divs:
                i_tag = div.find('i', class_='fa-map-marker-alt')
                if i_tag:
                    span = div.find('span')
                    if span:
                        job_data['location'] = span.text.strip()
                    break
            
            # Posted date
            for div in location_divs:
                i_tag = div.find('i', class_='fa-clock')
                if i_tag:
                    span = div.find('span')
                    if span:
                        job_data['posted_date'] = span.text.strip()
                    break
            
            # Company logo
            logo_img = article.find('img', alt=lambda x: x and 'logo' in x.lower())
            if logo_img and 'src' in logo_img.attrs:
                job_data['company_logo_url'] = urljoin(self.base_url, logo_img['src'])
            
            # Get full job description by visiting the job page
            if 'url' in job_data:
                print(f"    Fetching full details for: {job_data['title']}")
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
                
                # Strategy 1: Look for the main job description container
                description_text = None
                
                # Try to find specific description sections
                possible_selectors = [
                    ('div', {'class': re.compile(r'job[-_]?description', re.IGNORECASE)}),
                    ('section', {'class': re.compile(r'description', re.IGNORECASE)}),
                    ('div', {'id': re.compile(r'description', re.IGNORECASE)}),
                    ('div', {'class': re.compile(r'offer[-_]?description', re.IGNORECASE)}),
                    ('div', {'class': re.compile(r'job[-_]?details', re.IGNORECASE)}),
                    ('div', {'class': re.compile(r'job[-_]?content', re.IGNORECASE)}),
                    ('article', {'class': re.compile(r'job', re.IGNORECASE)}),
                ]
                
                for tag, attrs in possible_selectors:
                    container = soup.find(tag, attrs)
                    if container:
                        # Get text but try to preserve some structure
                        text = container.get_text(separator='\n', strip=True)
                        # Clean up excessive newlines
                        text = re.sub(r'\n{3,}', '\n\n', text)
                        if len(text) > 100:
                            description_text = text
                            break
                
                # Strategy 2: If no specific container, look for the main content area
                if not description_text:
                    main_content = soup.find('main') or soup.find('div', class_=re.compile(r'main|content|wrapper', re.IGNORECASE))
                    if main_content:
                        elements = main_content.find_all(['p', 'h2', 'h3', 'h4', 'ul', 'ol'])
                        text_parts = []
                        for elem in elements:
                            text = elem.get_text(strip=True)
                            if len(text) > 20:
                                text_parts.append(text)
                        
                        if text_parts:
                            description_text = '\n'.join(text_parts)
                
                # Strategy 3: Last resort - get all meaningful paragraphs
                if not description_text:
                    paragraphs = soup.find_all('p')
                    text_parts = []
                    for p in paragraphs:
                        text = p.get_text(strip=True)
                        # Filter out navigation, footer, header content
                        if len(text) > 40 and not any(x in text.lower() for x in ['cookie', 'privacy', 'terms', 'copyright', '©']):
                            text_parts.append(text)
                    
                    if text_parts:
                        description_text = '\n\n'.join(text_parts[:20])
                
                if description_text:
                    # Clean up the text
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
                    print(f"    Failed after {max_retries} attempts")
                    return "Error: Request timeout"
            except Exception as e:
                print(f"    Error fetching full description: {e}")
                return f"Error: {str(e)}"
        
        return "Error: Max retries exceeded"
    
    def scrape_all_pages(self, num_pages=4):
        """Scrape all pages"""
        print(f"Starting to scrape {num_pages} pages...")
        print(f"Search parameters:")
        print(f"  Keywords: '{self.keywords}' (empty means all)")
        print(f"  Professions: {self.profession_ids}")
        print(f"  Location: '{self.location}' (empty means all)")
        print(f"  Contract type: '{self.contract_type}' (empty means all)")
        print()
        
        for page in range(1, num_pages + 1):
            count = self.scrape_listing_page(page)
            if count == 0:
                print(f"No jobs found on page {page}, stopping.")
                break
            time.sleep(1)
        
        print(f"\nTotal jobs scraped: {len(self.jobs)}")
    
    def save_to_csv(self, filename='keejob_listings.csv'):
        """Save scraped data to CSV"""
        if not self.jobs:
            print("No jobs to save!")
            return
        
        # Clean the jobs data for CSV format
        cleaned_jobs = []
        for job in self.jobs:
            cleaned_job = {}
            for key, value in job.items():
                if value:
                    # Convert to string
                    value_str = str(value)
                    
                    # Replace newlines with spaces for CSV compatibility
                    value_str = value_str.replace('\n', ' ').replace('\r', ' ')
                    
                    # Replace multiple spaces with single space
                    value_str = re.sub(r'\s+', ' ', value_str)
                    
                    # Normalize accented characters
                    # Replace é with e, è with e, ê with e, etc.
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
        
        # Get all unique keys
        fieldnames = set()
        for job in cleaned_jobs:
            fieldnames.update(job.keys())
        fieldnames = sorted(list(fieldnames))
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
            writer.writeheader()
            writer.writerows(cleaned_jobs)
        
        print(f"Data saved to {filename}")
    
    def save_to_json(self, filename='keejob_listings.json'):
        """Save scraped data to JSON"""
        if not self.jobs:
            print("No jobs to save!")
            return
        
        with open(filename, 'w', encoding='utf-8') as jsonfile:
            json.dump({
                'scraped_at': datetime.now().isoformat(),
                'search_params': {
                    'keywords': self.keywords,
                    'professions': self.profession_ids,
                    'location': self.location,
                    'contract_type': self.contract_type
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
        
        # Count by contract type
        contract_counts = {}
        for job in self.jobs:
            contracts = job.get('contract_types', '').split(', ')
            for contract in contracts:
                if contract:
                    contract_counts[contract] = contract_counts.get(contract, 0) + 1
        
        if contract_counts:
            print("\nJobs by contract type:")
            for contract, count in sorted(contract_counts.items(), key=lambda x: x[1], reverse=True):
                print(f"  {contract}: {count}")
        
        # Count by location
        location_counts = {}
        for job in self.jobs:
            location = job.get('location', 'Unknown')
            location_counts[location] = location_counts.get(location, 0) + 1
        
        if location_counts:
            print("\nTop 10 locations:")
            for location, count in sorted(location_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"  {location}: {count}")
        
        print("="*50 + "\n")


def main():
    """Main function with command-line argument parsing"""
    parser = argparse.ArgumentParser(description='Scrape job listings from Keejob.com')
    parser.add_argument('--keywords', type=str, default='', help='Search keywords')
    parser.add_argument('--professions', type=str, default='24', help='Comma-separated profession IDs (default: 24)')
    parser.add_argument('--location', type=str, default='', help='Location filter')
    parser.add_argument('--contract-type', type=str, default='', help='Contract type filter')
    parser.add_argument('--pages', type=int, default=4, help='Number of pages to scrape (default: 4)')
    parser.add_argument('--output', type=str, default='keejob_listings', help='Output filename (without extension)')
    
    args = parser.parse_args()
    
    # Parse profession IDs
    profession_ids = [int(x.strip()) for x in args.professions.split(',')]
    
    print("="*60)
    print("KEEJOB ADVANCED WEB SCRAPER")
    print("="*60)
    print()
    
    scraper = KeejobScraperAdvanced(
        keywords=args.keywords,
        profession_ids=profession_ids,
        location=args.location,
        contract_type=args.contract_type
    )
    
    scraper.scrape_all_pages(num_pages=args.pages)
    scraper.get_statistics()
    
    scraper.save_to_csv(f'{args.output}.csv')
    scraper.save_to_json(f'{args.output}.json')
    
    print("\nScraping completed successfully!")


if __name__ == "__main__":
    main()