import pandas as pd
from collections import Counter

# ── Change this to your actual CSV path ──────────────────────
CSV_PATH = r"C:\Users\mazen\Downloads\scraping\dataset\linkedin_jobs_cleaned_skills (1).csv"
DOMAIN   = "QA & Testing"
# ─────────────────────────────────────────────────────────────

df = pd.read_csv(CSV_PATH)

# Consolidate categories same way as recommender
counts = df["final_category"].value_counts()
rare   = counts[counts < 10].index.tolist()
df["domain"] = df["final_category"].apply(lambda x: "Other" if x in rare else x)
df = df[df["domain"] != "Other"].reset_index(drop=True)

# Filter to target domain
domain_df = df[df["domain"] == DOMAIN].copy()
print(f"\nDomain: {DOMAIN}")
print(f"Total jobs: {len(domain_df)}\n")

# Parse skills
def split_skills(val):
    if pd.isna(val) or str(val).strip() == "":
        return []
    return [s.strip().lower() for s in str(val).split(",") if s.strip()]

domain_df["skills_list"] = domain_df["extracted_skills"].apply(split_skills)

# Count all skills
all_skills = []
for skills in domain_df["skills_list"]:
    all_skills.extend(skills)
counts = Counter(all_skills)

print("=" * 55)
print(f"{'Skill':<30} {'Count':>6}  {'% of jobs':>10}")
print("=" * 55)
for skill, count in counts.most_common(40):
    pct = count / len(domain_df) * 100
    print(f"{skill:<30} {count:>6}  {pct:>9.1f}%")

