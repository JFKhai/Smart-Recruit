import os
import google.generativeai as genai

# ─── Cấu hình Gemini API ──────────────────────────────────────────────────────
# Sử dụng Gemini text-embedding-004 (768 chiều) thay cho local model
# để tiết kiệm RAM trên Render Free (512MB).
#
# Để rollback về local model cũ, uncomment phần bên dưới:
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

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("WARNING: GEMINI_API_KEY is not set. Embedding will not work.")


def generate_embedding(text: str):
    """
    Tạo vector embedding 768 chiều từ Gemini text-embedding-004 API.
    
    - Khi đạt rate limit (429): trả về None, không tính phí thêm.
    - Khi thành công: trả về list 768 float.
    - Để rollback: xem phần LEGACY comment ở trên.
    """
    if not GEMINI_API_KEY:
        print("Error: GEMINI_API_KEY is not set.")
        return None
    
    try:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document",  # Tối ưu cho tìm kiếm ngữ nghĩa
        )
        return result["embedding"]  # list of 768 floats
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            print(f"WARNING: Gemini rate limit reached. Try again later: {e}")
        else:
            print(f"Error creating embedding (Gemini): {e}")
        return None