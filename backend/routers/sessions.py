from fastapi import APIRouter, Depends, HTTPException
from backend.auth import verify_token
from backend.firestore_client import get_user_sessions, get_session_messages
import logging

logger = logging.getLogger("journal-api.sessions")
router = APIRouter()

@router.get("/sessions")
async def list_sessions(uid: str = Depends(verify_token)):
    try:
        sessions = get_user_sessions(uid)
        
        # Format for output
        formatted = []
        for s in sessions:
            formatted.append({
                "id": s["id"],
                "title": s.get("title", "Untitled"),
                "createdAt": str(s.get("createdAt", "")),
                "updatedAt": str(s.get("updatedAt", "")),
                "messageCount": s.get("messageCount", 0),
            })
        return {"sessions": formatted}
    except Exception as e:
        logger.error(f"Failed to list sessions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/sessions/{session_id}/messages")
async def list_messages(session_id: str, uid: str = Depends(verify_token)):
    try:
        # uid scoping naturally ensures 404 behavior if session belongs to someone else
        messages = get_session_messages(uid, session_id)
        if not messages:
            # We treat empty as 404 since a valid session would have messages
            raise HTTPException(status_code=404, detail="Session not found")
        
        formatted = [
            {
                "role": m.get("role"), 
                "content": m.get("content"),
                "mood": m.get("mood"),
                "stressLevel": m.get("stress_level")
            } 
            for m in messages
        ]
        return {"messages": formatted}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list messages: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
