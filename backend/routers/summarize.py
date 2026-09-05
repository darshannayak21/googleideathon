from fastapi import APIRouter, Depends, HTTPException
from backend.models import SummarizeRequest, SummarizeResponse, FavoriteToggleRequest
from backend.auth import verify_token
from backend.firestore_client import get_session_messages, save_summary, get_user_summaries, toggle_summary_favorite
from backend.gemini_client import summarize_conversation, get_embedding
from backend.encryption import encrypt, decrypt
import logging
import traceback

logger = logging.getLogger("journal-api.summarize")
router = APIRouter()

def _log_debug(msg: str):
    """Write debug info to a file for diagnosing issues."""
    with open("summarize_debug.log", "a") as f:
        f.write(msg + "\n")

@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(request: SummarizeRequest, uid: str = Depends(verify_token)):
    _log_debug(f"=== Summarize called for session_id={request.session_id}, uid={uid}")
    try:
        messages = get_session_messages(uid, request.session_id)
        _log_debug(f"Messages fetched: {len(messages)} messages found")
        if not messages:
            _log_debug("No messages found — returning 404")
            raise HTTPException(status_code=404, detail="Session not found or has no messages")
            
        transcript = "\n".join([f"{m.get('role', 'user')}: {m.get('content', '')}" for m in messages])
        _log_debug(f"Transcript built: {len(transcript)} chars")
        
        # Call Gemini
        summary_data = summarize_conversation(transcript)
        plaintext_summary = summary_data["summary"]
        _log_debug(f"Summary generated: {plaintext_summary[:100]}...")
        
        # Encrypt the summary
        encrypted_summary = encrypt(plaintext_summary)
        _log_debug(f"Encryption OK: {len(encrypted_summary)} bytes")
        
        # Generate Embedding for Enhancement B
        embedding = get_embedding(plaintext_summary)
        _log_debug(f"Embedding OK: {len(embedding)} dims")
        
        # Save
        summary_id = save_summary(
            uid=uid,
            session_id=request.session_id,
            encrypted_summary=encrypted_summary,
            mood=summary_data["mood"],
            tags=summary_data["tags"],
            embedding=embedding
        )
        _log_debug(f"Saved to Firestore with id={summary_id}")
        
        return SummarizeResponse(
            id=summary_id,
            session_id=request.session_id,
            summary=plaintext_summary, # Return plaintext to caller who just authored it
            mood=summary_data["mood"],
            tags=summary_data["tags"],
            isFavorite=False
        )
    except HTTPException as e:
        _log_debug(f"HTTPException: {e.status_code} {e.detail}")
        raise
    except Exception as e:
        tb = traceback.format_exc()
        _log_debug(f"EXCEPTION: {e}\n{tb}")
        with open("backend_error.log", "w") as f:
            f.write(tb)
        logger.error(f"Summarize failed: {e}")
        raise HTTPException(status_code=500, detail=f"API Error: {str(e)}")

@router.get("/summaries")
async def list_summaries(uid: str = Depends(verify_token)):
    try:
        summaries = get_user_summaries(uid)
        formatted = []
        for s in summaries:
            try:
                # Decrypt before returning
                plaintext = decrypt(s.get("summary"))
                formatted.append({
                    "id": s["id"],
                    "sessionId": s.get("sessionId"),
                    "summary": plaintext,
                    "mood": s.get("mood"),
                    "tags": s.get("tags", []),
                    "isFavorite": s.get("isFavorite", False),
                    "createdAt": str(s.get("createdAt", "")),
                })
            except Exception as e:
                logger.error(f"Failed to decrypt summary {s['id']}: {e}")
                # Fail closed on a per-item basis or skip
                continue
                
        return {"summaries": formatted}
    except Exception as e:
        logger.error(f"Failed to list summaries: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/summaries/{summary_id}/favorite")
async def toggle_favorite(summary_id: str, request: FavoriteToggleRequest, uid: str = Depends(verify_token)):
    try:
        toggle_summary_favorite(uid, summary_id, request.isFavorite)
        return {"status": "success", "isFavorite": request.isFavorite}
    except Exception as e:
        logger.error(f"Failed to toggle favorite for {summary_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
