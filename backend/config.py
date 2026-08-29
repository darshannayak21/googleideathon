import os
from dotenv import load_dotenv

load_dotenv()

# Project Configuration
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "darshanideathon")
REGION = os.getenv("GOOGLE_CLOUD_REGION", "asia-south1")

# Secret Manager
GEMINI_SECRET_ID = os.getenv("GEMINI_SECRET_ID", "gemini-api-key")

# KMS Configuration (Enhancement A)
KMS_KEY_RING = os.getenv("KMS_KEY_RING", "journal-key-ring")
KMS_CRYPTO_KEY = os.getenv("KMS_CRYPTO_KEY", "journal-crypto-key")
KMS_LOCATION = os.getenv("KMS_LOCATION", REGION)

# Application Limits
MAX_MESSAGE_LENGTH = 8000
MAX_HISTORY_TURNS = 20
