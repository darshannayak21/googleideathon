from typing import List, Optional
from pydantic import BaseModel, Field
from backend.config import MAX_MESSAGE_LENGTH, MAX_HISTORY_TURNS

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|model)$")
    content: str = Field(..., max_length=MAX_MESSAGE_LENGTH)

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_LENGTH)
    history: List[ChatMessage] = Field(default_factory=list, max_length=MAX_HISTORY_TURNS)
    session_id: Optional[str] = Field(None, max_length=64)
    persona: Optional[str] = Field("Empathic Listener", max_length=64)

class ChatResponse(BaseModel):
    reply: str
    mood: Optional[str] = None
    stress_level: Optional[int] = None
    session_id: str

class SummarizeRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=64)

class SummarizeResponse(BaseModel):
    id: str
    session_id: str
    summary: str
    mood: str
    tags: List[str]

class LookbackRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)

class LookbackSummary(BaseModel):
    id: str
    summary: str
    mood: str
    tags: List[str]

class LookbackResponse(BaseModel):
    insight: str
    relatedSummaries: List[LookbackSummary]

class SynthesisSummary(BaseModel):
    mood: str
    summary: str

class SynthesisRequest(BaseModel):
    summaries: List[SynthesisSummary]

class SynthesisResponse(BaseModel):
    advice: str
