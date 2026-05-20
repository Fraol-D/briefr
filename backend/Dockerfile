FROM python:3.11.9-slim-bookworm AS build

ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies into a separate layer for a smaller runtime image
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir -r requirements.txt --target /opt/python

# Copy application files
COPY . .

FROM gcr.io/distroless/python3-debian12

ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1 \
  PYTHONPATH=/opt/python

WORKDIR /app

COPY --from=build /opt/python /opt/python
COPY --from=build /app /app

EXPOSE 8080

# Cloud Run listens on 8080 by default
CMD ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
