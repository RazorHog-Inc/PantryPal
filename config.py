import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Firebase Configuration
config = {
    "apiKey": os.environ.get("FIREBASE_API_KEY"),
    "authDomain": os.environ.get("FIREBASE_AUTH_DOMAIN"),
    "databaseURL": os.environ.get("FIREBASE_DATABASE_URL"),
    "projectId": os.environ.get("FIREBASE_PROJECT_ID"),
    "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET"),
    "messagingSenderId": os.environ.get("FIREBASE_MESSAGING_SENDER_ID"),
    "appId": os.environ.get("FIREBASE_APP_ID")
}

# Email Configuration
email_config = {
    "smtp_server": os.environ.get("EMAIL_SMTP_SERVER"),
    "smtp_port": int(os.environ.get("EMAIL_SMTP_PORT", 587)),
    "email": os.environ.get("EMAIL_USERNAME"),
    "password": os.environ.get("EMAIL_PASSWORD")
}