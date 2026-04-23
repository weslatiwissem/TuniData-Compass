# ============================================================
# unify_datasets.py
# Merges LinkedIn + TanitJob scraped CSVs into one clean file
# Output: jobs_unified.csv  ← feed this into extracting_skills.ipynb
# ============================================================

import pandas as pd
import re

# ─────────────────────────────────────────────────────────────
# 1. LOAD RAW FILES  (adjust paths as needed)
# ─────────────────────────────────────────────────────────────
linkedin_path = r"C:\Users\User\OneDrive\Desktop\TuniData-Compass\recomendation_system\linkedin_jobs_complete.csv"
tanitjob_path = r"C:\Users\User\OneDrive\Desktop\TuniData-Compass\scraping\tanitjobs_it_jobs.csv"

df_li  = pd.read_csv(linkedin_path)
df_tan = pd.read_csv(tanitjob_path)

print(f"LinkedIn rows  : {len(df_li)}")
print(f"TanitJob rows  : {len(df_tan)}")

# ─────────────────────────────────────────────────────────────
# 2. NORMALISE COLUMN NAMES TO A SHARED SCHEMA
#
#   target columns:
#     title | company | location | date | job_link | description | source
#
# ─────────────────────────────────────────────────────────────

# ── LinkedIn ─────────────────────────────────────────────────
# original: title, company, location, date, job_link, description, search_keyword
df_li = df_li.rename(columns={
    "title"         : "title",
    "company"       : "company",
    "location"      : "location",
    "date"          : "date",
    "job_link"      : "job_link",
    "description"   : "description",
})
df_li["source"] = "linkedin"

# ── TanitJob ─────────────────────────────────────────────────
# original: job_title, company_name, location, job_link, description,
#           required_skills, posting_date
df_tan = df_tan.rename(columns={
    "job_title"      : "title",
    "company_name"   : "company",
    "location"       : "location",
    "job_link"       : "job_link",
    "description"    : "description",
    "posting_date"   : "date",
})
df_tan["source"] = "tanitjob"

# TanitJob already has required_skills — keep it for a later merge-hint
# (extracting_skills.ipynb will re-extract anyway; we store it as a bonus column)
if "required_skills" not in df_tan.columns:
    df_tan["required_skills"] = ""

# ─────────────────────────────────────────────────────────────
# 3. KEEP ONLY THE SHARED COLUMNS  (+ required_skills as bonus)
# ─────────────────────────────────────────────────────────────
KEEP_COLS = ["title", "company", "location", "date", "job_link", "description", "source"]

# Add required_skills only from tanitjob
df_li["required_skills"] = ""

df_li  = df_li[KEEP_COLS  + ["required_skills"]]
df_tan = df_tan[KEEP_COLS + ["required_skills"]]

# ─────────────────────────────────────────────────────────────
# 4. CONCATENATE
# ─────────────────────────────────────────────────────────────
df = pd.concat([df_li, df_tan], ignore_index=True)
print(f"\nAfter concat: {len(df)} rows")

# ─────────────────────────────────────────────────────────────
# 5. DEDUPLICATE
#    Primary key: job_link  (most reliable)
#    Fallback   : title + company + location
# ─────────────────────────────────────────────────────────────
before = len(df)

# Normalise job_link for comparison
df["job_link_norm"] = df["job_link"].astype(str).str.strip().str.lower().str.rstrip("/")

# Deduplicate by link first
has_link = df["job_link_norm"].notna() & (df["job_link_norm"] != "nan")
df_with_link    = df[has_link].drop_duplicates(subset=["job_link_norm"])
df_without_link = df[~has_link].drop_duplicates(
    subset=["title", "company", "location"]
)
df = pd.concat([df_with_link, df_without_link], ignore_index=True)
df.drop(columns=["job_link_norm"], inplace=True)

print(f"After dedup   : {len(df)} rows  (removed {before - len(df)} duplicates)")

# ─────────────────────────────────────────────────────────────
# 6. CLEAN FIELDS
# ─────────────────────────────────────────────────────────────

def clean_text(val):
    if pd.isna(val):
        return ""
    val = str(val).strip()
    val = re.sub(r"\s+", " ", val)
    return val

def clean_location(loc):
    if pd.isna(loc):
        return ""
    loc = str(loc).strip()
    # Keep only city-level: "Tunis, Tunisia" → "Tunis"  (optional, comment out if unwanted)
    # loc = loc.split(",")[0].strip()
    return loc

def normalise_date(val):
    """Try several common date formats; return MM/DD/YYYY for recommender compatibility."""
    if pd.isna(val) or str(val).strip() == "":
        return ""
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%B %d, %Y"):
        try:
            return pd.to_datetime(str(val).strip(), format=fmt).strftime("%m/%d/%Y")
        except ValueError:
            continue
    # Last resort: let pandas infer
    try:
        return pd.to_datetime(str(val).strip(), dayfirst=False).strftime("%m/%d/%Y")
    except Exception:
        return ""

df["title"]       = df["title"].apply(clean_text)
df["company"]     = df["company"].apply(clean_text)
df["location"]    = df["location"].apply(clean_location)
df["description"] = df["description"].apply(clean_text)
df["date"]        = df["date"].apply(normalise_date)

# ─────────────────────────────────────────────────────────────
# 7. DROP ROWS WITHOUT A USABLE DESCRIPTION
#    extracting_skills.ipynb needs at least 50 chars of text
# ─────────────────────────────────────────────────────────────
before = len(df)
df = df[df["description"].str.len() >= 50].reset_index(drop=True)
print(f"After desc filter: {len(df)} rows  (dropped {before - len(df)} empty descriptions)")

# ─────────────────────────────────────────────────────────────
# 8. RESET INDEX & SUMMARY
# ─────────────────────────────────────────────────────────────
df = df.reset_index(drop=True)

print("\n" + "="*55)
print("FINAL DATASET SUMMARY")
print("="*55)
print(f"Total jobs      : {len(df)}")
print(f"Source breakdown:\n{df['source'].value_counts().to_string()}")
print(f"Date coverage   : {df['date'].replace('', pd.NA).dropna().min()} → "
      f"{df['date'].replace('', pd.NA).dropna().max()}")
print(f"Missing dates   : {(df['date'] == '').sum()}")
print(f"Columns         : {df.columns.tolist()}")
print("\nSample:")
print(df[["title", "company", "location", "date", "source"]].head(5).to_string(index=False))

# ─────────────────────────────────────────────────────────────
# 9. SAVE  →  feed this into extracting_skills.ipynb as jobs.csv
# ─────────────────────────────────────────────────────────────
OUT_PATH = r"C:\Users\User\OneDrive\Desktop\TuniData-Compass\recomendation_system\final_dataset.csv"
df.to_csv(OUT_PATH, index=False)
print(f"\n✓ Saved to '{OUT_PATH}'  — ready for extracting_skills.ipynb")