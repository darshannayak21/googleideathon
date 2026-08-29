import os
import logging
from typing import Optional
from google.cloud import secretmanager
from backend.config import PROJECT_ID, GEMINI_SECRET_ID

logger = logging.getLogger("journal-api.secrets")

def fetch_gemini_key() -> Optional[str]:
    """
    Fetches the Gemini API key from Google Cloud Secret Manager.
    Returns None if fetching fails.
    """
    try:
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{PROJECT_ID}/secrets/{GEMINI_SECRET_ID}/versions/latest"
        response = client.access_secret_version(request={"name": name})
        key = response.payload.data.decode("UTF-8").strip()
        if key:
            logger.info("Successfully fetched Gemini API key from Secret Manager")
            return key
    except Exception as e:
        logger.error(f"Failed to fetch secret from Secret Manager: {e}")

    # Fallback for local development if allowed
    env_key = os.getenv("GEMINI_API_KEY")
    if env_key:
        logger.info("Using GEMINI_API_KEY from environment variable (local dev)")
        return env_key

    return None
