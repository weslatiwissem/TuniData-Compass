# Base image: slim Python 3.11
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Copy requirements first (layer cache)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt


# Copy application code
COPY main.py .
COPY recommender.py .
COPY cv_parser.py .

# Copy the CSV dataset
COPY data/jobs.csv /app/data/jobs.csv

# Expose port 8000
EXPOSE 8000

# Start FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

