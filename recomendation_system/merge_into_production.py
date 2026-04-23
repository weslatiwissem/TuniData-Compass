# ============================================================
# merge_into_production.py
# Run this ONCE locally before deploying.
# Merges your new scraped+processed CSV into the existing
# production jobs.csv, deduplicates, and saves the result.
# ============================================================

import pandas as pd
import ast

# ─────────────────────────────────────────────────────────────
# PATHS  — adjust as needed
# ─────────────────────────────────────────────────────────────
OLD_CSV = "data/jobs.csv"                          # current production file
NEW_CSV = "final_dataset.csv"       # output of your notebook pipeline
OUT_CSV = "data/jobs.csv"                          # overwrite in place (or use a new name)

# ─────────────────────────────────────────────────────────────
# 1. LOAD BOTH FILES
# ─────────────────────────────────────────────────────────────
df_old = pd.read_csv(OLD_CSV)
df_new = pd.read_csv(NEW_CSV)

print(f"Old dataset : {len(df_old)} rows")
print(f"New dataset : {len(df_new)} rows")
print(f"Old columns : {df_old.columns.tolist()}")
print(f"New columns : {df_new.columns.tolist()}")

# ─────────────────────────────────────────────────────────────
# 2. ALIGN COLUMNS
#    Both files must have the same columns before concat.
#    The production CSV needs at minimum:
#      title, company, location, date, job_link,
#      extracted_skills, final_category
#    Add any missing columns with empty defaults.
# ─────────────────────────────────────────────────────────────
REQUIRED_COLS = [
    "title", "company", "location", "date", "job_link",
    "extracted_skills", "final_category", "source"
]

for col in REQUIRED_COLS:
    if col not in df_old.columns:
        df_old[col] = ""
    if col not in df_new.columns:
        df_new[col] = ""

# Keep only the shared useful columns (drop notebook-only columns
# like relevant_section, extracted_skills_list, num_skills —
# recommender.py rebuilds skills_list from extracted_skills at startup)
KEEP = [
    "title", "company", "location", "date", "job_link",
    "extracted_skills", "final_category", "source",
    # optional but harmless to keep:
    "required_skills", "description",
]
KEEP = [c for c in KEEP if c in df_old.columns or c in df_new.columns]

df_old = df_old[[c for c in KEEP if c in df_old.columns]]
df_new = df_new[[c for c in KEEP if c in df_new.columns]]

# ─────────────────────────────────────────────────────────────
# 3. TAG SOURCE IF MISSING
# ─────────────────────────────────────────────────────────────
if "source" not in df_old.columns or df_old["source"].isna().all():
    df_old["source"] = "legacy"

# ─────────────────────────────────────────────────────────────
# 4. CONCAT
# ─────────────────────────────────────────────────────────────
df = pd.concat([df_old, df_new], ignore_index=True)
print(f"\nAfter concat: {len(df)} rows")

# ─────────────────────────────────────────────────────────────
# 5. DEDUPLICATE
#    Primary key  : job_link
#    Fallback     : title + company
#    On collision : keep the NEWER row (i.e. from df_new)
#    Strategy     : keep='last' after sorting old→new
# ─────────────────────────────────────────────────────────────
df["_link_norm"] = (
    df["job_link"].astype(str).str.strip().str.lower().str.rstrip("/")
)

# Rows with a real link
has_link = df["_link_norm"].notna() & ~df["_link_norm"].isin(["", "nan", "none"])
df_linked    = df[has_link].drop_duplicates(subset=["_link_norm"], keep="last")
df_no_link   = df[~has_link].drop_duplicates(subset=["title", "company"], keep="last")

df = pd.concat([df_linked, df_no_link], ignore_index=True)
df = df.drop(columns=["_link_norm"])

print(f"After dedup : {len(df)} rows")

# ─────────────────────────────────────────────────────────────
# 6. VALIDATE  — warn if anything looks broken
# ─────────────────────────────────────────────────────────────
missing_skills   = (df["extracted_skills"].isna() | (df["extracted_skills"] == "")).sum()
missing_category = (df["final_category"].isna()   | (df["final_category"]   == "")).sum()

print(f"\nRows missing extracted_skills : {missing_skills}")
print(f"Rows missing final_category   : {missing_category}")

if missing_category > 0:
    print("  ⚠ These rows will be dropped by recommender._consolidate_categories()")
    print("  Sample titles without category:")
    print(df[df["final_category"].isna() | (df["final_category"] == "")]["title"].head(5).tolist())

# ─────────────────────────────────────────────────────────────
# 7. FINAL SUMMARY
# ─────────────────────────────────────────────────────────────
print("\n" + "="*55)
print("FINAL MERGED DATASET")
print("="*55)
print(f"Total rows     : {len(df)}")
print(f"Source breakdown:\n{df['source'].value_counts().to_string()}")
print(f"Category breakdown:\n{df['final_category'].value_counts().head(15).to_string()}")

# ─────────────────────────────────────────────────────────────
# 8. SAVE
# ─────────────────────────────────────────────────────────────
df.to_csv(OUT_CSV, index=False)
print(f"\n✓ Saved merged dataset to '{OUT_CSV}'")
print("  Deploy this file → restart FastAPI → recommender reloads automatically.")