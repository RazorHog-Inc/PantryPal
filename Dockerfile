FROM python:3.9-slim

WORKDIR /app

# Install necessary packages and clean up
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Clone Flask project repository
COPY . .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt


# Test for syntax errors
RUN python -m compileall .

# Expose the default port Flask uses
EXPOSE 8080

# Healthcheck to ensure the container is healthy
HEALTHCHECK CMD curl --fail http://localhost:${PORT:-8080}/ || exit 1

# Start the Flask application
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=${PORT:-8080}

ENTRYPOINT ["flask", "run"]
