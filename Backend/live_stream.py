import os
import tempfile
import uuid
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from transcription import transcribe_audio
from video_processor import extract_keyframes_and_ocr
from chroma_db import store_live_chunk, retrieve_live_chunks
from groq_client import generate_live_answer
import asyncio
import subprocess
import imageio_ffmpeg

ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()

router = APIRouter()

# In-memory storage for active live sessions
active_sessions = {}

class AskLiveRequest(BaseModel):
    session_id: str
    question: str

def process_chunk_blocking(chunk_data: bytes, session_id: str, timestamp: str) -> tuple[str, str]:
    """
    Runs isolated FFmpeg, Whisper, and PyTesseract fully in an external thread
    so it doesn't freeze the FastAPI server.
    """
    temp_dir = tempfile.gettempdir()
    chunk_id = uuid.uuid4().hex[:8]
    webm_path = os.path.join(temp_dir, f"{session_id}_{chunk_id}.webm")
    wav_path = os.path.join(temp_dir, f"{session_id}_{chunk_id}.wav")
    
    chunk_text = ""
    ocr_text = ""
    
    try:
        # Save isolated 5-second chunk
        with open(webm_path, "wb") as f:
            f.write(chunk_data)

        # 1. Extract audio robustly (ignores missing video track if tab is static 0fps)
        # We use -fflags +genpts to regenerate missing timestamps from Chrome's WebM chunks
        subprocess.run([
            ffmpeg_path, "-y", "-err_detect", "ignore_err", "-loglevel", "error",
            "-fflags", "+genpts",
            "-i", webm_path,
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
            wav_path
        ], capture_output=True)

        # 4096 bytes is an arbitrarily small WAV file. A real 5s 16khz PCM WAV is ~160,000 bytes.
        # If it's smaller than 4KB, it's either an empty header or severely corrupted. Whisper will crash on it.
        if os.path.exists(wav_path) and os.path.getsize(wav_path) > 4096:
            try:
                # Transcribe solely this 5-second audio
                transcript_result = transcribe_audio(wav_path)
                chunk_text = transcript_result["text"].strip()
                if chunk_text:
                    print(f"Whisper transcript: '{chunk_text}' (wav size: {os.path.getsize(wav_path)})")
            except Exception as e:
                print(f"Transcription error: {e}")

        # 2. Extract OCR (if video frames exist in this 5-second window)
        try:
            if os.path.getsize(webm_path) > 1000:
                mp4_path = webm_path.replace(".webm", ".mp4")
                # Transcode WebM chunk to MP4 aggressively so OpenCV can read it without EBML index errors
                subprocess.run([
                    ffmpeg_path, "-y", "-err_detect", "ignore_err", "-loglevel", "error",
                    "-i", webm_path,
                    "-c:v", "libx264", "-preset", "ultrafast", "-an",
                    mp4_path
                ], capture_output=True)
                
                if os.path.exists(mp4_path) and os.path.getsize(mp4_path) > 1000:
                    ocr_text = extract_keyframes_and_ocr(mp4_path).strip()
                    os.remove(mp4_path)
        except Exception as e:
            pass # Expected if WebM has no video frames due to static screen

        # 3. Store to ChromaDB Memory
        if chunk_text or ocr_text:
            store_live_chunk(session_id, chunk_text, ocr_text, timestamp)

        return chunk_text, ocr_text

    finally:
        for p in [webm_path, wav_path]:
            if os.path.exists(p):
                try: os.remove(p)
                except: pass

@router.post("/live-stream")
async def receive_live_stream(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    timestamp: str = Form(...)
):
    """
    O(1) receiver for 5-second standalone WebM chunks from Chrome.
    """
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    if session_id not in active_sessions:
        active_sessions[session_id] = {"transcript": [], "ocr": []}

    chunk_data = await file.read()
    if not chunk_data:
        return {"status": "success", "extracted_text": "", "extracted_ocr": ""}

    # Hand off CPU-intensive task to an async threadpool 
    # ensuring the frontend UI polling logic doesn't freeze waiting for Whisper
    chunk_text, ocr_text = await asyncio.to_thread(
        process_chunk_blocking, chunk_data, session_id, timestamp
    )

    if chunk_text:
        active_sessions[session_id]["transcript"].append(chunk_text)
    if ocr_text:
        active_sessions[session_id]["ocr"].append(ocr_text)

    return {
        "status": "success",
        "extracted_text": chunk_text,
        "extracted_ocr": ocr_text
    }


@router.post("/ask-live")
async def ask_live_question(req: AskLiveRequest):
    """
    Query the live ChromaDB vector store for an active meeting session.
    """
    if not req.session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    if not req.question:
        raise HTTPException(status_code=400, detail="Missing question")

    try:
        # 1. Search ChromaDB for relevant live chunks
        relevant_chunks = retrieve_live_chunks(req.session_id, req.question)
        
        # Fallback to pure memory if ChromaDB fails or is empty initially
        if not relevant_chunks and req.session_id in active_sessions:
            memory_transcript = "\n".join(active_sessions[req.session_id]["transcript"][-10:])
            relevant_chunks = [memory_transcript] if memory_transcript else []

        if not relevant_chunks:
            return {"answer": "I haven't heard enough context yet to answer that.", "sources": []}

        # 2. Generate LLM answer
        context = "\n".join(relevant_chunks)
        
        # We reuse the Groq engine logic but customize the system prompt for live querying
        answer = generate_live_answer(context, req.question)

        return {
            "answer": answer,
            "sources": relevant_chunks
        }
    except Exception as e:
        print(f"Live RAG Error: {e}")
        raise HTTPException(status_code=500, detail="Error answering question")


@router.get("/live-transcript/{session_id}")
async def get_live_transcript(session_id: str):
    """
    Returns the accumulated transcript to display live on the frontend.
    """
    if session_id not in active_sessions:
        return {"transcript": [], "ocr": []}
    return active_sessions[session_id]


@router.get("/active-live-session")
async def get_active_live_session():
    """
    Returns the most recent active live session ID.
    Used by the frontend to auto-connect without manual input.
    """
    if not active_sessions:
        return {"session_id": None}
    
    # Return the most recently created session
    latest_session_id = list(active_sessions.keys())[-1]
    return {"session_id": latest_session_id}
