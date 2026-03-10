import os
import tempfile
import traceback
import uuid
import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from pydantic import BaseModel
from supabase import create_client, Client

from transcription import transcribe_video
from groq_client import generate_summary_and_actions
from chroma_db import store_transcript, delete_meeting_vectors
from video_processor import extract_keyframes_and_ocr

router = APIRouter()

ALLOWED_EXTENSIONS = {".mp4", ".mp3", ".wav", ".mkv", ".avi", ".mov", ".webm", ".m4a"}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB


def get_supabase() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )


def get_user_from_token(token: str) -> dict:
    """Validate JWT token and return user info"""
    supabase = get_supabase()
    try:
        user = supabase.auth.get_user(token)
        return {"id": user.user.id, "email": user.user.email}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/upload")
async def upload_meeting(
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    """
    Main upload endpoint. Full pipeline:
    1. Validate file
    2. Upload original to Supabase Storage
    3. Create meeting record in DB
    4. Transcribe with Whisper
    5. Generate summary + action items with Groq
    6. Store embeddings in ChromaDB
    7. Mark meeting as ready
    """

    # Auth check
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")
    token = authorization.split(" ")[1]
    user = get_user_from_token(token)

    # Validate file type
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Generate a unique meeting ID upfront
    meeting_id = str(uuid.uuid4())

    # Save uploaded file to a temp location on disk
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Max size is 500MB.")
        tmp.write(content)
        tmp_path = tmp.name

    try:
        supabase = get_supabase()

        # ── Step 1: Upload original file to Supabase Storage ──────────────
        storage_path = f"{user['id']}/{meeting_id}{ext}"
        with open(tmp_path, "rb") as f:
            supabase.storage.from_("meeting-recordings").upload(
                storage_path,
                f,
                {"content-type": file.content_type or "video/mp4"}
            )
        video_url = supabase.storage.from_("meeting-recordings").get_public_url(storage_path)

        # ── Step 2: Create meeting row in DB (status: processing) ──────────
        title = (
            file.filename
            .rsplit(".", 1)[0]       # remove extension
            .replace("-", " ")
            .replace("_", " ")
            .title()
        )
        supabase.table("meetings").insert({
            "id": meeting_id,
            "user_id": user["id"],
            "title": title,
            "video_url": video_url,
            "status": "processing"
        }).execute()

        # ── Step 3: Transcribe with Whisper (runs locally) ────────────────
        transcript_result = transcribe_video(tmp_path)
        full_text = transcript_result["text"]

        # Store raw transcript
        supabase.table("transcripts").insert({
            "meeting_id": meeting_id,
            "text": full_text
        }).execute()

        # ── Step 3.5: Extract OCR from Video (if applicable) ──────────────
        ocr_text = ""
        if ext in [".mp4", ".mkv", ".avi", ".mov", ".webm"]:
            try:
                print(f"Starting OCR extraction on {tmp_path}...")
                ocr_text = extract_keyframes_and_ocr(tmp_path)
                print(f"OCR Extraction COMPLETE: Extracted {len(ocr_text)} characters.")
                if ocr_text:
                    print(f"OCR Preview: {ocr_text[:100]}...")
            except Exception as e:
                print(f"OCR Extraction Warning: {e}")

        # ── Step 4: Generate Summary + Action Items + Decisions via Groq ──
        ai_result = generate_summary_and_actions(full_text, ocr_text)
        summary = ai_result.get("summary", "")
        action_items = ai_result.get("action_items", [])
        decisions = ai_result.get("decisions", [])

        # Note: Added 'decisions' column to summaries table requirements.
        # TODO (TOMORROW): Once your friend runs the SQL command in Supabase to add the 'decisions' column:
        # ALTER TABLE summaries ADD COLUMN IF NOT EXISTS decisions JSONB DEFAULT '[]';
        # You MUST uncomment the line below to start saving decisions!
        supabase.table("summaries").insert({
            "meeting_id": meeting_id,
            "summary": summary,
            "action_items": json.dumps(action_items),
            "decisions": json.dumps(decisions)  
        }).execute()

        # ── Step 5: Embed transcript and OCR chunks into ChromaDB ─────────
        num_chunks = store_transcript(meeting_id, full_text, ocr_text)

        # ── Step 6: Mark meeting as ready ─────────────────────────────────
        supabase.table("meetings").update(
            {"status": "ready"}
        ).eq("id", meeting_id).execute()

        return {
            "meeting_id": meeting_id,
            "title": title,
            "summary": summary,
            "action_items": action_items,
            "decisions": decisions,
            "transcript_length": len(full_text),
            "ocr_length": len(ocr_text),
            "chunks_stored": num_chunks,
            "status": "ready"
        }

    except Exception as e:
        traceback.print_exc()  
        try:
            get_supabase().table("meetings").update({"status": "failed"}).eq("id", meeting_id).execute()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

    finally:
        # Always clean up the temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.get("/list")
async def list_meetings(authorization: str = Header(None)):
    """Return all meetings for the logged-in user, newest first"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")
    token = authorization.split(" ")[1]
    user = get_user_from_token(token)

    supabase = get_supabase()
    result = supabase.table("meetings") \
        .select("id, title, created_at, status") \
        .eq("user_id", user["id"]) \
        .order("created_at", desc=True) \
        .execute()

    return {"meetings": result.data}


@router.get("/{meeting_id}")
async def get_meeting(meeting_id: str, authorization: str = Header(None)):
    """Get full meeting details — summary, action items, transcript"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")
    token = authorization.split(" ")[1]
    user = get_user_from_token(token)

    supabase = get_supabase()

    # Fetch meeting (must belong to this user)
    meeting = supabase.table("meetings") \
        .select("*") \
        .eq("id", meeting_id) \
        .eq("user_id", user["id"]) \
        .single() \
        .execute()

    if not meeting.data:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Fetch summary + action items
    summary_row = supabase.table("summaries") \
        .select("*") \
        .eq("meeting_id", meeting_id) \
        .maybe_single() \
        .execute()

    # Fetch transcript
    transcript_row = supabase.table("transcripts") \
        .select("text") \
        .eq("meeting_id", meeting_id) \
        .maybe_single() \
        .execute()

    summary_text = ""
    action_items = []
    decisions = []
    if summary_row.data:
        summary_text = summary_row.data.get("summary", "")
        try:
            action_items = json.loads(summary_row.data.get("action_items", "[]"))
        except Exception:
            action_items = []
        try:
            decisions = json.loads(summary_row.data.get("decisions", "[]"))
        except Exception:
            decisions = []

    return {
        **meeting.data,
        "summary": summary_text,
        "action_items": action_items,
        "decisions": decisions,
        "transcript": transcript_row.data.get("text", "") if transcript_row.data else ""
    }


@router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: str, authorization: str = Header(None)):
    """Delete a meeting, its vectors, and its file from storage"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")
    token = authorization.split(" ")[1]
    user = get_user_from_token(token)

    supabase = get_supabase()

    # 1. Fetch meeting to ensure it exists and belongs to user
    meeting = supabase.table("meetings").select("video_url").eq("id", meeting_id).eq("user_id", user["id"]).maybe_single().execute()
    if not meeting.data:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # 2. Extract filename from video_url to delete from storage
    # The actual path in the bucket is: user['id']/meeting_id.ext
    video_url = meeting.data.get("video_url")
    if video_url:
        try:
            file_name = video_url.split('/')[-1]
            storage_path = f"{user['id']}/{file_name}"
            supabase.storage.from_("meeting-recordings").remove([storage_path])
        except Exception as e:
            print(f"Error deleting from storage: {e}")

    # 3. Delete from database
    # Cascades to summaries and transcripts
    supabase.table("meetings").delete().eq("id", meeting_id).eq("user_id", user["id"]).execute()

    # 4. Delete vectors from ChromaDB
    try:
        delete_meeting_vectors(meeting_id)
    except Exception as e:
        print(f"Error deleting vectors: {e}")

    return {"status": "success", "message": "Meeting deleted"}