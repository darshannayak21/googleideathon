import logging
from fastapi import Request, HTTPException, status
import firebase_admin
from firebase_admin import auth as firebase_auth

logger = logging.getLogger("journal-api.auth")

# Ensure firebase app is initialized
if not firebase_admin._apps:
    firebase_admin.initialize_app()

async def verify_token(request: Request) -> str:
    """
    Verifies the Firebase ID token and returns the UID.
    This is the ONLY source of truth for the user's identity.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.warning("Missing or invalid Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.split("Bearer ", 1)[1]
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        if not uid:
            logger.error("Token verified but missing UID")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing UID",
            )
        return uid
    except Exception as e:
        import traceback
        with open("auth_error.log", "w") as f:
            f.write(f"Error: {e}\nTraceback:\n{traceback.format_exc()}")
        logger.warning(f"Token verification failed: {e}")
        # Fail closed on any ambiguous auth check
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
