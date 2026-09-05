from fastapi import APIRouter, Depends, HTTPException
from backend.auth import verify_token
from backend.firestore_client import delete_user_data
import logging

logger = logging.getLogger("journal-api.security")
router = APIRouter()

@router.delete("/nuke")
async def crypto_nuke(uid: str = Depends(verify_token)):
    """
    Deletes all user data from Firestore for the authenticated user.
    """
    try:
        logger.warning(f"Initiating Crypto-Nuke for UID: {uid}")
        delete_user_data(uid)
        logger.warning(f"Crypto-Nuke completed successfully for UID: {uid}")
        return {"status": "success", "message": "All user data successfully wiped."}
    except Exception as e:
        logger.error(f"Failed to execute Crypto-Nuke for UID {uid}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during Crypto-Nuke")
