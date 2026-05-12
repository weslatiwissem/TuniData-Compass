FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libffi-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py semantic_recommender.py recommender.py cv_parser.py auth.py cover_letter.py ./
COPY data/jobs.csv /app/data/jobs.csv

ENV SENTENCE_TRANSFORMERS_HOME=/app/models

# Pre-download SBERT model at build time so runtime never downloads it
RUN mkdir -p /app/models && \
    python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')" || true

# Pre-build embedding cache using the helper script
COPY preload_embeddings.py ./
RUN python preload_embeddings.py || true

RUN mkdir -p /app/uploads /app/data

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]