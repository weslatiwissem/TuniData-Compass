"""
Test script for Naukrigulf scraper
"""

from naukrigulf_scraper import NaukrigulfScraper
import json

def test_single_page():
    """Test scraping just one page to verify extraction"""
    print("="*60)
    print("TESTING NAUKRIGULF SCRAPER - SINGLE PAGE")
    print("="*60)
    print()
    
    scraper = NaukrigulfScraper()
    count = scraper.scrape_listing_page(1)
    
    print(f"\n{'='*60}")
    print(f"Total jobs found: {count}")
    print(f"Total jobs scraped: {len(scraper.jobs)}")
    print(f"{'='*60}\n")
    
    if scraper.jobs:
        # Show first job details
        first_job = scraper.jobs[0]
        print("FIRST JOB DETAILS:")
        print("-" * 60)
        for key, value in first_job.items():
            if key == 'full_description':
                display_value = value[:200] + "..." if len(value) > 200 else value
                print(f"{key:20}: {display_value}")
            else:
                print(f"{key:20}: {value}")
        print("-" * 60)
        
        # Verify critical fields
        print("\nFIELD VERIFICATION:")
        print("-" * 60)
        critical_fields = ['title', 'company', 'location', 'experience', 'posted_date', 'description_preview', 'full_description']
        for field in critical_fields:
            status = "✓ Present" if field in first_job and first_job[field] else "✗ Missing"
            value_preview = str(first_job.get(field, ""))[:50] + "..." if first_job.get(field) else "N/A"
            print(f"{field:20}: {status:12} | {value_preview}")
        print("-" * 60)
        
        # Save for inspection
        with open('test_naukrigulf_job.json', 'w', encoding='utf-8') as f:
            json.dump(first_job, f, ensure_ascii=False, indent=2)
        print("\n✓ First job saved to 'test_naukrigulf_job.json' for inspection")
        
        # Show all jobs briefly
        print(f"\nALL {len(scraper.jobs)} JOBS FOUND:")
        print("-" * 60)
        for idx, job in enumerate(scraper.jobs, 1):
            print(f"{idx}. {job.get('title', 'N/A')[:50]}")
            print(f"   Company: {job.get('company', 'N/A')}")
            print(f"   Location: {job.get('location', 'N/A')}")
            print(f"   Experience: {job.get('experience', 'N/A')}")
            print(f"   Posted: {job.get('posted_date', 'N/A')}")
            print()
    else:
        print("⚠ No jobs were scraped. Check your internet connection or website accessibility.")
        print("The HTML structure might have changed. You may need to inspect the page and update the selectors.")

if __name__ == "__main__":
    test_single_page()
    
    print("\n" + "="*60)
    print("TESTING COMPLETE")
    print("="*60)
    print("\nCheck 'test_naukrigulf_job.json' for detailed inspection.")
