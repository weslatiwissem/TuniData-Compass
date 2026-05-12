"""
preload_embeddings.py
Runs at Docker build time to pre-compute the embedding cache.
Called by Dockerfile RUN step — not needed at runtime.
"""
import os
import sys
import time

os.environ["SENTENCE_TRANSFORMERS_HOME"] = "/app/models"
CSV = "/app/data/jobs.csv"

if not os.path.exists(CSV):
    print(f"No jobs.csv at {CSV} — skipping pre-build.")
    sys.exit(0)

print(f"Pre-building embeddings from {CSV} ...")
t0 = time.time()

from semantic_recommender import SemanticRecommender

engine = SemanticRecommender(CSV, cache_dir="/app/data")

# Background thread is building embeddings; wait up to 3 minutes
for i in range(180):
    if engine._embedding_ready:
        break
    time.sleep(1)
    if i % 20 == 0:
        print(f"  Still building... {i}s elapsed")

if engine._embedding_ready:
    print(f"Done! Embedding cache built in {time.time() - t0:.0f}s")
else:
    print("Warning: embeddings did not finish in time — will build in background at runtime.")
