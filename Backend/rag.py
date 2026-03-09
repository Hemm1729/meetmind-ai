from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import os
from supabase import create_client

from chroma_db import retrieve_relevant_chunks
from groq_client import answer_question

router = APIRouter()


def get_supabase():
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )


def get_user_from_token(token: str) -> dict:
    """Validate JWT and return user"""
    supabase = get_supabase()
    try:
        user = supabase.auth.get_user(token)
        return {"id": user.user.id, "email": user.user.email}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


class ChatRequest(BaseModel):
    meeting_id: str
    question: str


@router.post("/ask")
async def ask_question(req: ChatRequest, authorization: str = Header(None)):
    """
    RAG pipeline endpoint. Called on every chat message.

    Flow:
    1. Validate user token
    2. Verify meeting belongs to user and is ready
    3. Embed question + retrieve relevant transcript chunks from ChromaDB
    4. Send chunks + question to Groq Llama3
    5. Return answer + source chunks
    """

    # ── Auth ──────────────────────────────────────────────────────────────
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")
    token = authorization.split(" ")[1]
    user = get_user_from_token(token)

    # ── Verify meeting exists and belongs to this user ────────────────────
    supabase = get_supabase()
    meeting = supabase.table("meetings") \
        .select("id, title, status") \
        .eq("id", req.meeting_id) \
        .eq("user_id", user["id"]) \
        .maybe_single() \
        .execute()

    if not meeting.data:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.data.get("status") != "ready":
        raise HTTPException(
            status_code=400,
            detail="Meeting is still being processed. Please wait."
        )

    # ── Step 1: Retrieve relevant chunks from ChromaDB ────────────────────
    chunks = retrieve_relevant_chunks(
        meeting_id=req.meeting_id,
        question=req.question,
        n_results=5
    )

    if not chunks:
        return {
            "answer": "I couldn't find relevant information in this meeting's transcript to answer your question. Try rephrasing or ask something else.",
            "sources": []
        }

    # ── Step 2: Generate answer with Groq using chunks as context ─────────
    answer = answer_question(
        question=req.question,
        context_chunks=chunks,
        transcript_title=meeting.data["title"]
    )

    return {
        "answer": answer,
        "sources": chunks[:2]   # Return top 2 source chunks for transparency
    }
