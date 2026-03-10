from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from auth import router as auth_router
from upload import router as upload_router
from rag import router as rag_router
from live_stream import router as live_stream_router

app = FastAPI(title="MeetMind API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(upload_router, prefix="/meetings", tags=["meetings"])
app.include_router(rag_router, prefix="/chat", tags=["chat"])
app.include_router(live_stream_router, tags=["live"])


@app.get("/")
def root():
    return {"status": "MeetMind API is running"}