import uuid
from fastapi import APIRouter, Depends, HTTPException
from backend.models import ChatRequest, ChatResponse, SynthesisRequest, SynthesisResponse
from backend.auth import verify_token
from backend.firestore_client import create_or_update_session, add_message_to_session, get_session_messages
from backend.gemini_client import chat_turn
import logging

logger = logging.getLogger("journal-api.chat")
router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, uid: str = Depends(verify_token)):
    session_id = request.session_id or str(uuid.uuid4())
    
    # Optional: fetch existing messages to reconstruct history if needed, 
    # but currently we trust the client's trimmed history array to avoid extra reads, 
    # except we could validate it. For now, use the client history.
    history = [{"role": msg.role, "content": msg.content} for msg in request.history]
    
    try:
        reply_text, mood, stress_level = chat_turn(history, request.message, request.persona)
        
        # Save to Firestore under /users/{uid}/...
        create_or_update_session(uid, session_id, request.message[:80])
        add_message_to_session(uid, session_id, "user", request.message)
        add_message_to_session(uid, session_id, "model", reply_text, mood, stress_level)
        
        return ChatResponse(
            reply=reply_text,
            mood=mood,
            stress_level=stress_level,
            session_id=session_id
        )
    except Exception as e:
        import traceback
        with open("backend_error.log", "w") as f:
            f.write(traceback.format_exc())
        logger.error(f"Chat failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to process chat")

@router.post("/chat/synthesis", response_model=SynthesisResponse)
async def synthesize_trends_endpoint(request: SynthesisRequest, uid: str = Depends(verify_token)):
    try:
        from backend.gemini_client import synthesize_trends
        
        # Convert list of Pydantic models to list of dicts including createdAt
        summaries_dict = [{"mood": s.mood, "summary": s.summary, "createdAt": s.createdAt} for s in request.summaries]
        
        result = synthesize_trends(summaries_dict)
        return SynthesisResponse(
            advice=result.get("advice", ""),
            patterns=[{"observation": p["observation"], "confidence": p["confidence"]} for p in result.get("patterns", [])]
        )
    except Exception as e:
        logger.error(f"Synthesis failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to synthesize trends")
