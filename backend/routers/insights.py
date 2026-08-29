import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from backend.models import LookbackRequest, LookbackResponse, LookbackSummary
from backend.auth import verify_token
from backend.firestore_client import get_user_summaries
from backend.gemini_client import get_embedding, synthesize_insight
from backend.encryption import decrypt
import logging

logger = logging.getLogger("journal-api.insights")
router = APIRouter()

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

@router.post("/insights", response_model=LookbackResponse)
async def get_insights(request: LookbackRequest, uid: str = Depends(verify_token)):
    try:
        # Embed the query
        query_embedding = get_embedding(request.query)
        
        # Fetch summaries and their embeddings
        summaries = get_user_summaries(uid, limit=100)
        
        if not summaries:
            return LookbackResponse(
                insight="You don't have enough journal entries yet for pattern analysis. Keep journaling!",
                relatedSummaries=[]
            )
            
        # Compute similarities
        scored_summaries = []
        for s in summaries:
            emb = s.get("embedding")
            if emb:
                sim = cosine_similarity(query_embedding, emb)
                scored_summaries.append((sim, s))
                
        # Sort and take top 5
        scored_summaries.sort(key=lambda x: x[0], reverse=True)
        top_matches = [s for _, s in scored_summaries[:5]]
        
        # Decrypt matches and build context
        context_lines = []
        related_summaries = []
        
        for s in top_matches:
            try:
                plaintext = decrypt(s.get("summary"))
                tags = s.get("tags", [])
                mood = s.get("mood", "")
                
                context_lines.append(f"- [{mood}] {plaintext} (tags: {', '.join(tags)})")
                
                related_summaries.append(LookbackSummary(
                    id=s["id"],
                    summary=plaintext,
                    mood=mood,
                    tags=tags
                ))
            except Exception as e:
                logger.error(f"Failed to decrypt summary for insights: {e}")
                continue
                
        if not related_summaries:
             raise HTTPException(status_code=500, detail="Failed to read journal entries")
             
        context = "\n".join(context_lines)
        
        # Synthesize insight
        insight_text = synthesize_insight(request.query, context)
        
        return LookbackResponse(
            insight=insight_text,
            relatedSummaries=related_summaries
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Insights failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
