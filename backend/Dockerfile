FROM python:3.11-slim

# Install system dependencies (e.g. libgomp1 for XGBoost OpenMP)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install python dependencies first for caching
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend code, artifacts, and data preserving local project structure
COPY backend/ /app/backend/
COPY artifacts/ /app/artifacts/
COPY data/ /app/data/

WORKDIR /app/backend

ENV PYTHONPATH=/app/backend/src:/app/backend
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
