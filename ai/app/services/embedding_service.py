import os
import google.generativeai as genai

# ─── Cấu hình Gemini Embedding API ────────────────────────────────────────────
# Lưu ý: Gemini 3.6 Flash (gemini-3.6-flash) là model SINH NỘI DUNG / agent —
# KHÔNG dùng được cho embedContent. Matching CV↔Job cần model embedding riêng.
#
# Model hiện tại: gemini-embedding-001 (text embedding ổn định)
#   - Giữ 768 dims (Matryoshka) để nhẹ storage, tương thích code cũ kỳ vọng 768
# Alternative mới hơn: gemini-embedding-2 (multimodal) — đổi EMBEDDING_MODEL nếu cần
#
# text-embedding-004 đã 404 trên API hiện tại → không dùng nữa.
#
# ─── [LEGACY - Local SentenceTransformer model] ───────────────────────────────
# from sentence_transformers import SentenceTransformer
# model = SentenceTransformer('all-MiniLM-L6-v2')  # 384 chiều
#
# def generate_embedding(text: str):
#     try:
#         embedding = model.encode(text, convert_to_numpy=True)
#         return embedding.tolist()
#     except Exception as e:
#         print(f"Lỗi khi tạo embedding (local): {e}")
#         return None
# ─────────────────────────────────────────────────────────────────────────────

EMBEDDING_MODEL = os.environ.get("GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001")
EMBEDDING_DIMS = int(os.environ.get("GEMINI_EMBEDDING_DIMS", "768"))

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("WARNING: GEMINI_API_KEY is not set. Embedding will not work.")


def generate_embedding(text: str):
    """
    Tạo vector embedding từ Gemini Embedding API (mặc định 768 chiều).

    - Khi đạt rate limit (429): trả về None, không tính phí thêm.
    - Khi thành công: trả về list float (len ~= EMBEDDING_DIMS).
    """
    if not GEMINI_API_KEY:
        print("Error: GEMINI_API_KEY is not set.")
        return None

    try:
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="retrieval_document",
            output_dimensionality=EMBEDDING_DIMS,
        )
        embedding = result.get("embedding") if isinstance(result, dict) else None
        if not embedding:
            print(f"Error: empty embedding response from {EMBEDDING_MODEL}")
            return None
        return embedding
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            print(f"WARNING: Gemini rate limit reached. Try again later: {e}")
        else:
            print(f"Error creating embedding (Gemini): {e}")
        return None
