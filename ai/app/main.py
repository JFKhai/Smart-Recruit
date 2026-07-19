import os
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

from app.services.embedding_service import generate_embedding
from app.services.matching_service import calculate_cosine_similarity

app = FastAPI(
    title="Smart Recruit AI Service",
    description="AI embedding & matching service. Powered by Gemini text-embedding-004 (768 dims).",
    version="2.0.0",
)


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    """Endpoint cho Render uptime monitor và Backend kiểm tra AI còn sống không."""
    api_key_set = bool(os.environ.get("GEMINI_API_KEY"))
    return {
        "status": "ok" if api_key_set else "degraded",
        "model": "gemini/text-embedding-004",
        "dimensions": 768,
        "gemini_key_configured": api_key_set,
    }


@app.get("/")
def read_root():
    return {"status": "AI Service is online", "version": "2.0.0 (Gemini API)"}


# ─── Request Models ───────────────────────────────────────────────────────────
class TextRequest(BaseModel):
    text: str


class MatchingRequest(BaseModel):
    cv_vector: List[float]
    job_vector: List[float]


# ─── Endpoints ────────────────────────────────────────────────────────────────
@app.post("/get-embedding")
async def get_embedding_endpoint(request: TextRequest):
    """
    Tạo vector embedding từ text.
    
    - Trả về list 768 float nếu thành công.
    - Trả về {"embedding": null, "error": "..."} nếu Gemini rate limit hoặc lỗi.
    - Không tính phí khi rate limit — chỉ báo lỗi 429.
    """
    vector = generate_embedding(request.text)
    if vector is None:
        return {"embedding": None, "error": "Embedding thất bại. Có thể do rate limit hoặc GEMINI_API_KEY chưa cấu hình."}
    return {"embedding": vector, "dimensions": len(vector)}


@app.post("/calculate-matching")
async def calculate_matching_endpoint(request: MatchingRequest):
    """Tính cosine similarity giữa vector CV và vector Job Description."""
    score = calculate_cosine_similarity(request.cv_vector, request.job_vector)
    return {"score": score}