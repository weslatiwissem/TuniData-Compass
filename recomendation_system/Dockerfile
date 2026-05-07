FROM python:3.11-slim
WORKDIR /app

# Install system deps for PyMuPDF and torch
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libffi-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py semantic_recommender.py recommender.py cv_parser.py auth.py cover_letter.py ./
COPY data/jobs.csv /app/data/jobs.csv

# Pre-download the embedding model so it's baked into the image
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')" || true

RUN mkdir -p /app/uploads /app/data

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
