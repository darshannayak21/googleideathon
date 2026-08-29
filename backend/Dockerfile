FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . /app/backend

# Run the web service on container startup
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
