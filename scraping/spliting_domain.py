# -*- coding: utf-8 -*-
"""
LinkedIn Job Title Categorization
- TF-IDF + Agglomerative Clustering on titles
- Skill-signal based post-correction (minimal hardcoding)
- Target: 10 balanced categories for job recommendation system
"""

import pandas as pd
import numpy as np
import re
from collections import Counter
import matplotlib.pyplot as plt
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics.pairwise import cosine_similarity
from nltk.corpus import stopwords
import nltk

nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)

# ============================================================
# CONFIG — only change these
# ============================================================

DATA_PATH = r'C:\Users\mazen\Downloads\scraping\dataset\linkedin_jobs_with_extracted_skills_per_job (2).csv'
N_CLUSTERS = 30  # agglomerative clustering granularity
MIN_CATEGORY_SIZE = 10  # drop categories below this

# Target category definitions — each is defined by its most
# representative title keywords. The model learns similarity,
# these just label the output clusters.
CATEGORY_SIGNALS = {
    'Software Engineering':  ['software engineer', 'backend developer', 'frontend developer',
                               'full stack developer', 'fullstack engineer', 'développeur',
                               '.net developer', 'java developer', 'python developer'],

    'DevOps & Cloud':        ['devops engineer', 'cloud engineer', 'site reliability engineer',
                               'platform engineer', 'ingénieur devops', 'ingénieur cloud',
                               'kubernetes', 'terraform', 'ci/cd', 'mlops', 'dataops'],

    'QA & Testing':          ['qa engineer', 'quality assurance engineer', 'test engineer',
                               'automation tester', 'testeur logiciel', 'validation engineer',
                               'software tester', 'istqb'],

    'Data Science & ML':     ['data scientist', 'machine learning engineer', 'nlp engineer',
                               'deep learning engineer', 'ai engineer', 'generative ai engineer',
                               'data engineer', 'ingénieur data', 'big data engineer'],

    'BI & Data Analysis':    ['data analyst', 'business analyst', 'bi engineer',
                               'business intelligence analyst', 'analyste données',
                               'reporting analyst', 'analytics engineer'],

    'IT & Security':         ['cybersecurity engineer', 'security analyst', 'soc analyst',
                               'network engineer', 'system administrator', 'it support engineer',
                               'identity access management', 'infrastructure engineer',
                               'technicien réseau', 'ingénieur sécurité'],

    'IT Consulting & ERP':   ['sap consultant', 'erp consultant', 'functional consultant',
                               'crm consultant', 'it consultant', 'microsoft dynamics consultant',
                               'presales engineer', 'solution consultant'],

    'Project Management':    ['project manager', 'chef de projet', 'pmo',
                               'scrum master', 'product owner', 'delivery manager',
                               'program manager', 'release manager'],

    'Design & Graphics':     ['ux designer', 'ui designer', 'graphic designer',
                               'motion designer', 'graphiste', 'web designer',
                               'product designer', 'visual designer'],

    'Business & Operations': ['business developer', 'commercial manager', 'marketing manager',
                               'product manager', 'operations manager', 'account manager',
                               'sales manager', 'recruiter', 'hr manager'],
}

# ============================================================
# STEP 1 — Load & clean titles
# ============================================================

df = pd.read_csv(DATA_PATH)
print(f"Loaded {len(df)} jobs | {df['title'].nunique()} unique titles")

def clean_title(title):
    if pd.isna(title):
        return ""
    title = str(title).lower()
    noise = [
        r'\(h/f\)', r'\(f/m/x\)', r'\(m/f/x\)', r'\[f/m/x\]',
        r'h/f', r'f/h', r'm/f', r'w/m', r'- tunis', r'tunis -',
        r'remote', r'relocat\S*', r'located geographically\S*',
        r'\(.*?portugal.*?\)', r'\(.*?dubai.*?\)',
    ]
    for pattern in noise:
        title = re.sub(pattern, '', title, flags=re.IGNORECASE)
    return re.sub(r'\s+', ' ', title).strip()

df['title_cleaned'] = df['title'].apply(clean_title)

# ============================================================
# STEP 2 — TF-IDF + Agglomerative Clustering on unique titles
# ============================================================

unique_titles = [t for t in df['title_cleaned'].unique() if len(t) > 2]
print(f"{len(unique_titles)} unique cleaned titles")

vectorizer = TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 4), min_df=1, max_df=0.8)
title_vectors = vectorizer.fit_transform(unique_titles)

distance_matrix = 1 - cosine_similarity(title_vectors)
distance_matrix = np.clip(distance_matrix, 0, None)  # avoid floating point negatives

clustering = AgglomerativeClustering(n_clusters=N_CLUSTERS, metric='precomputed', linkage='average')
cluster_labels = clustering.fit_predict(distance_matrix)

title_to_cluster = dict(zip(unique_titles, cluster_labels))

# ============================================================
# STEP 3 — Auto-name clusters from dominant keywords
# ============================================================

def extract_keywords(titles, top_n=2):
    noise = {'senior', 'junior', 'lead', 'principal', 'confirmé', 'confirmed',
             'intern', 'stagiaire', 'stage', 'and', 'the', 'for'}
    words = [w for t in titles for w in t.split() if w not in noise and len(w) > 2]
    top = [w for w, _ in Counter(words).most_common(top_n)]
    return " ".join(top).title() if top else "Uncategorized"

cluster_names = {}
cluster_titles = {}
for cid in range(N_CLUSTERS):
    titles_in = [t for t, c in title_to_cluster.items() if c == cid]
    cluster_titles[cid] = titles_in
    cluster_names[cid] = extract_keywords(titles_in)

df['cluster_id'] = df['title_cleaned'].map(title_to_cluster)
df['auto_category'] = df['cluster_id'].map(cluster_names).fillna('Other')

print("\nAuto clusters:")
print(df['auto_category'].value_counts())

# ============================================================
# STEP 4 — Assign final category using skill-signal similarity
#
# For each job, we score its title against every category's
# signal keywords using TF-IDF cosine similarity.
# The closest category wins — no hardcoded if/else chains.
# ============================================================

# Build one "document" per category from its signal keywords
category_names = list(CATEGORY_SIGNALS.keys())
category_docs = [" ".join(CATEGORY_SIGNALS[c]) for c in category_names]

# Fit a word-level TF-IDF on category docs + all titles together
# so the vocabulary is shared
all_docs = category_docs + df['title_cleaned'].tolist()
word_vectorizer = TfidfVectorizer(analyzer='word', ngram_range=(1, 2))
word_vectorizer.fit(all_docs)

category_vectors = word_vectorizer.transform(category_docs)
title_vectors_word = word_vectorizer.transform(df['title_cleaned'])

# Cosine similarity: each job vs each category
sim_matrix = cosine_similarity(title_vectors_word, category_vectors)
# shape: (n_jobs, n_categories)

# Assign category with highest similarity score
best_match_idx = sim_matrix.argmax(axis=1)
best_match_score = sim_matrix.max(axis=1)

df['final_category'] = [category_names[i] for i in best_match_idx]
df['category_confidence'] = best_match_score

# Low-confidence jobs → 'Other' (score below threshold)
CONFIDENCE_THRESHOLD = 0.05
df.loc[df['category_confidence'] < CONFIDENCE_THRESHOLD, 'final_category'] = 'Other'

print("\nFinal categories (before size filter):")
print(df['final_category'].value_counts())

# ============================================================
# STEP 5 — Drop tiny categories & Other
# ============================================================

# Replace STEP 5 in the script with this:

# ── STEP 5 — Fallback: use auto_category cluster for low confidence jobs ──

# Cluster-to-category mapping based on what we know from the auto clusters
CLUSTER_FALLBACK = {
    'Engineer Data':             'Data Science & ML',
    'Developer Développeur':     'Software Engineering',
    'Ingénieur Technicien':      'IT & Security',
    'Manager Management':        'Project Management',
    'Consultant Sap':            'IT Consulting & ERP',
    'Specialist Product':        'Business & Operations',
    'Designer Internship':       'Design & Graphics',
    'Analyst Business':          'BI & Data Analysis',
    'Data Scientist':            'Data Science & ML',
    'Chef Projet':               'Project Management',
    'Commercial Chargé(E)':      'Business & Operations',
    'Responsable Safran':        'IT & Security',
    'Administrator Network':     'IT & Security',
    'Tech Java':                 'Software Engineering',
    'Buyer Project':             'Business & Operations',
    'Web Master':                'Software Engineering',
    'Opérateur Télévendeur(Se)': 'Business & Operations',
    'Recruiter (Freelance':      'Business & Operations',
    'Microsoft 365':             'IT & Security',
    'Expert Web':                'Software Engineering',
    'Video Editor':              'Design & Graphics',
    'Maximo Developer':          'Software Engineering',
    'Associate Rims':            'Business & Operations',
    'Growth Hacker':             'Business & Operations',
    'Sousse Cabin':              'Other',
    'Placier (Zones':            'Other',
    'Executive Assistant':       'Business & Operations',
    'Fondateur Startup':         'Business & Operations',
    'Pharmacist':                'Other',
    'Superviseur D\'Équipe':     'Business & Operations',
}

# Apply fallback for low confidence
LOW_CONF = df['category_confidence'] < CONFIDENCE_THRESHOLD
df.loc[LOW_CONF, 'final_category'] = df.loc[LOW_CONF, 'auto_category'].map(
    lambda x: CLUSTER_FALLBACK.get(x, 'Other')
)

# ── Title-signal correction for known misclassifications ──
# Uses keyword presence in title to override wrong assignments.
# Ordered from most specific to least specific.

TITLE_SIGNALS = [
    # drop noise
    (['mental health', 'cabin crew', 'proximus', 'placier',
      'spontaneous application', 'offre de stage pfe –',
      'biostatistician'], 'Other'),

    # DevOps & Cloud
    (['architect', 'architecte', 'cloud architect', 'azure architect',
      'solution architect'], 'DevOps & Cloud'),

    # QA & Testing (rescue from IT & Security and BI)
    (['qa ', 'quality assurance', 'testeur', 'tester', 'test engineer',
      'analyste qualité', 'validation engineer', 'istqb'], 'QA & Testing'),

    # Data Science & ML (rescue manager titles)
    (['data scientist manager', 'head of r&d', 'ingénieur data',
      'biostatistician'], 'Data Science & ML'),

    # Software Engineering (rescue from Design)
    (['développeur web', 'webmaster', 'web developer',
      'developpeur tibco', 'maximo'], 'Software Engineering'),
]

def apply_title_signals(row):
    title = str(row['title_cleaned']).lower()
    for keywords, category in TITLE_SIGNALS:
        if any(k in title for k in keywords):
            return category
    return row['final_category']

df['final_category'] = df.apply(apply_title_signals, axis=1)

# Drop Other
df_clean = df[df['final_category'] != 'Other'].copy().reset_index(drop=True)

print(f"\n✓ Final distribution ({len(df_clean)} jobs, {df_clean['final_category'].nunique()} categories):")
print(df_clean['final_category'].value_counts())

# ============================================================
# STEP 6 — Visualize
# ============================================================

fig, axes = plt.subplots(1, 2, figsize=(16, 6))

df_clean['final_category'].value_counts().plot(
    kind='barh', ax=axes[0], color='steelblue')
axes[0].set_title('Final Category Distribution', fontsize=14, fontweight='bold')
axes[0].set_xlabel('Number of Jobs')
axes[0].invert_yaxis()

sizes = df_clean['final_category'].value_counts().values
axes[1].hist(sizes, bins=15, color='coral', edgecolor='black')
axes[1].set_title('Category Size Distribution', fontsize=14, fontweight='bold')
axes[1].set_xlabel('Jobs per Category')
axes[1].set_ylabel('Count')
axes[1].axvline(MIN_CATEGORY_SIZE, color='red', linestyle='--', label=f'Min ({MIN_CATEGORY_SIZE})')
axes[1].legend()

plt.tight_layout()
plt.savefig('category_distribution.png', dpi=300, bbox_inches='tight')
plt.show()

# ============================================================
# STEP 7 — Save
# ============================================================

df_clean.to_csv('linkedin_jobs_with_categories.csv', index=False)
print(f"\n✓ Saved to 'linkedin_jobs_with_categories.csv'")
print(f"  Columns: {df_clean.columns.tolist()}")
# See jobs the model was least sure about
print(df_clean.nsmallest(20, 'category_confidence')[['title_cleaned', 'final_category', 'category_confidence']])
# Spot check each category — sample 5 titles
for cat in df_clean['final_category'].unique():
    sample = df_clean[df_clean['final_category'] == cat]['title_cleaned'].sample(min(5, len(df_clean[df_clean['final_category'] == cat]))).tolist()
    print(f"\n{cat}:")
    for t in sample:
        print(f"  - {t}")