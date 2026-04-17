FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py recommender.py cv_parser.py auth.py ./
COPY data/jobs.csv /app/data/jobs.csv

RUN mkdir -p /app/uploads

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
