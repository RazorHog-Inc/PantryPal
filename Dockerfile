FROM python:3.9-slim

WORKDIR /app

# Install necessary packages and clean up
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    git \
    && rm -rf /var/lib/apt/lists/*

# Clone Flask project repository
RUN git clone https://github.com/phamofanthony/PantryPal.git .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Expose the default port Flask uses
EXPOSE 5000

# Healthcheck to ensure the container is healthy
HEALTHCHECK CMD curl --fail http://localhost:${PORT:-5000}/ || exit 1

# Start the Flask application
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=${PORT:-5000}

ENTRYPOINT ["flask", "run"]
