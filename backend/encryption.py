import logging
from google.cloud import kms
from backend.config import PROJECT_ID, KMS_LOCATION, KMS_KEY_RING, KMS_CRYPTO_KEY

logger = logging.getLogger("journal-api.encryption")

client = kms.KeyManagementServiceClient()

def _get_key_name() -> str:
    return client.crypto_key_path(PROJECT_ID, KMS_LOCATION, KMS_KEY_RING, KMS_CRYPTO_KEY)

def encrypt(plaintext: str) -> bytes:
    """Encrypts plaintext using Google Cloud KMS."""
    try:
        key_name = _get_key_name()
        response = client.encrypt(
            request={"name": key_name, "plaintext": plaintext.encode("utf-8")}
        )
        return response.ciphertext
    except Exception as e:
        logger.error(f"KMS encryption failed: {e}")
        # Fail closed on encryption failure
        raise ValueError("Failed to encrypt data") from e

def decrypt(ciphertext: bytes) -> str:
    """Decrypts ciphertext using Google Cloud KMS."""
    try:
        key_name = _get_key_name()
        response = client.decrypt(
            request={"name": key_name, "ciphertext": ciphertext}
        )
        return response.plaintext.decode("utf-8")
    except Exception as e:
        logger.error(f"KMS decryption failed: {e}")
        # Fail closed on decryption failure
        raise ValueError("Failed to decrypt data") from e
