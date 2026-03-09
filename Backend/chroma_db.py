import chromadb
import os
from chromadb.utils import embedding_functions


# ChromaDB persists locally to this folder
CHROMA_PATH = "./chroma_data"


def get_chroma_client():
    return chromadb.PersistentClient(path=CHROMA_PATH)


def get_or_create_collection(meeting_id: str):
    """
    Each meeting gets its own ChromaDB collection.
    Collection name: meeting_<uuid>
    """
    client = get_chroma_client()

    # DefaultEmbeddingFunction uses sentence-transformers locally — fully free
    ef = embedding_functions.DefaultEmbeddingFunction()

    collection = client.get_or_create_collection(
        name=f"meeting_{meeting_id}",
        embedding_function=ef
    )
    return collection


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """
    Split transcript into overlapping word chunks.

    Why overlap?
    If a sentence spans two chunks, overlap ensures
    neither chunk loses that context at the boundary.

    chunk_size = 500 words  (~3-4 minutes of speech per chunk)
    overlap    = 50 words   (boundary context preserved)
    """
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


def store_transcript(meeting_id: str, transcript_text: str) -> int:
    """
    Chunk the transcript and store embeddings in ChromaDB.
    Returns number of chunks stored.
    """
    collection = get_or_create_collection(meeting_id)

    # Clear any existing chunks if re-uploading same meeting
    try:
        existing = collection.get()
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception:
        pass

    chunks = chunk_text(transcript_text)
    if not chunks:
        return 0

    ids = [f"{meeting_id}_chunk_{i}" for i in range(len(chunks))]

    collection.add(
        documents=chunks,
        ids=ids
    )

    return len(chunks)


def retrieve_relevant_chunks(meeting_id: str, question: str, n_results: int = 5) -> list[str]:
    """
    Embed the user's question and find the most
    semantically similar transcript chunks.
    These chunks are then passed to Groq as context.
    """
    collection = get_or_create_collection(meeting_id)

    total = collection.count()
    if total == 0:
        return []

    results = collection.query(
        query_texts=[question],
        n_results=min(n_results, total)
    )

    if results and results["documents"]:
        return results["documents"][0]
    return []


def delete_meeting_vectors(meeting_id: str):
    """
    Delete all vectors for a meeting.
    Called if a meeting is deleted by the user.
    """
    client = get_chroma_client()
    try:
        client.delete_collection(f"meeting_{meeting_id}")
    except Exception:
        pass