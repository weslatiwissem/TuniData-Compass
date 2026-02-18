"""
Test CSV formatting to ensure newlines and accents are handled correctly
"""

from keejob_scraper import KeejobScraper
import csv

def test_csv_formatting():
    """Test that CSV is properly formatted with single-line descriptions"""
    print("="*60)
    print("TESTING CSV FORMATTING")
    print("="*60)
    print()
    
    # Create a mock job with problematic characters
    scraper = KeejobScraper()
    scraper.jobs = [{
        'title': 'Test Job with é and è',
        'company': 'Société française',
        'description_preview': 'This is a short preview',
        'full_description': 'This is a long description\nwith multiple lines\nand some accented letters like é, è, à, ç\nShould be on one line in CSV',
        'location': 'Tunis, Tunisia',
        'salary': '1500-2000 TND'
    }]
    
    # Save to CSV
    scraper.save_to_csv('test_formatting.csv')
    
    # Read it back and verify
    print("\nReading CSV back to verify formatting...")
    with open('test_formatting.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            print("\nCSV Row Contents:")
            print("-" * 60)
            for key, value in row.items():
                print(f"{key:20}: {value[:80]}..." if len(value) > 80 else f"{key:20}: {value}")
            
            # Check for issues
            print("\nVerification:")
            print("-" * 60)
            
            # Check if full_description has newlines
            if '\n' in row['full_description']:
                print("❌ FAILED: full_description contains newline characters")
            else:
                print("✓ PASS: full_description is on a single line")
            
            # Check if accented characters are normalized
            has_accents = any(char in row['full_description'] for char in ['é', 'è', 'à', 'ç'])
            if has_accents:
                print("❌ FAILED: Accented characters still present")
            else:
                print("✓ PASS: Accented characters normalized")
            
            # Check company name
            if 'e' in row['company'] and 'é' not in row['company']:
                print("✓ PASS: Company name accents normalized")
            else:
                print("❌ FAILED: Company name still has accents")
    
    print("\n" + "="*60)
    print("Test file 'test_formatting.csv' created for inspection")
    print("="*60)

if __name__ == "__main__":
    test_csv_formatting()