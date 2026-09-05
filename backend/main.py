import logging
import os
from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.gemini_client import gemini
from backend.routers import chat, sessions, summarize, insights, security
from backend.secret_manager import fetch_gemini_key

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("journal-api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        api_key = fetch_gemini_key()
        gemini.initialize(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to initialize Gemini: {e}")
    yield

app = FastAPI(
    title="Personal Gemini Journal API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: Only allow the actual frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://darshanideathon.web.app", "https://darshanideathon.firebaseapp.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# Request logging middleware - logs every request to a file
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response
import traceback as tb_module

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        import datetime
        path = request.url.path
        method = request.method
        with open("request_log.txt", "a") as f:
            f.write(f"[{datetime.datetime.now()}] {method} {path}\n")
        try:
            response = await call_next(request)
            with open("request_log.txt", "a") as f:
                f.write(f"  -> {response.status_code}\n")
            return response
        except Exception as e:
            with open("request_log.txt", "a") as f:
                f.write(f"  -> EXCEPTION: {e}\n{tb_module.format_exc()}\n")
            raise

app.add_middleware(RequestLoggingMiddleware)

# Health Check (No auth)
@app.get("/health")
async def health():
    return {"status": "ok"}

# Include Routers
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(sessions.router, prefix="/api", tags=["sessions"])
app.include_router(summarize.router, prefix="/api", tags=["summarize"])
app.include_router(insights.router, prefix="/api", tags=["insights"])
app.include_router(security.router, prefix="/api/security", tags=["security"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
