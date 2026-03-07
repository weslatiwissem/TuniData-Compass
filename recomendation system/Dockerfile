

# Base image: slim Python 3.11
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Copy requirements first (layer cache: only re-installs if requirements change)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .
COPY recommender.py .

# Copy the CSV dataset into the image under /app/data/
# Rename your CSV file to jobs.csv before building, OR
# change the filename below to match yours.
COPY data/jobs.csv /app/data/jobs.csv

# Expose port 8000
EXPOSE 8000

# Start the FastAPI server with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]