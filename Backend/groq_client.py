import os
import json
from groq import Groq


def get_groq_client() -> Groq:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not set")
    return Groq(api_key=api_key)


def generate_summary_and_actions(transcript: str, ocr_text: str = "") -> dict:
    """
    Use Groq Llama3 to generate a summary + action items + decisions from transcript and visual slides.
    Called once after transcription and OCR is done.
    """
    client = get_groq_client()

    prompt = f"""You are an expert meeting analyst. Analyze the following meeting transcript and presentation slide text, then provide:

1. A concise summary (3-5 sentences) of what was discussed.
2. A list of action items with assignee and deadline if mentioned.
3. A list of key decisions made during the meeting.

Transcript (Spoken words):
{transcript[:8000]}

Slide Text (Shown on screen):
{ocr_text[:4000] if ocr_text else 'No visual slides presented.'}

Respond in this exact JSON format:
{{
  "summary": "...",
  "action_items": [
    {{"task": "...", "assignee": "...", "deadline": "..."}}
  ],
  "decisions": [
    "Decision 1",
    "Decision 2"
  ]
}}

If no assignee or deadline is mentioned, use "Unassigned" and "Not specified".
If no decisions were explicitly made, return an empty array for decisions [].
Return ONLY valid JSON, no extra text."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",  # Free model on Groq
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1024,
    )

    text = response.choices[0].message.content.strip()

    # Strip markdown code fences if Groq wraps response in ```json ... ```
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Fallback: return raw text as summary if JSON parsing fails
        return {
            "summary": text,
            "action_items": [],
            "decisions": []
        }


def answer_question(question: str, context_chunks: list[str], transcript_title: str) -> str:
    """
    Answer a user question using retrieved transcript chunks as context.
    Called on every chat message.
    """
    client = get_groq_client()

    context = "\n\n---\n\n".join(context_chunks)

    prompt = f"""You are MeetMind, an AI assistant that helps users understand their meeting recordings.

Meeting: "{transcript_title}"

Relevant context excerpts (This may include Spoken Transcripts AND Visual Slide Text):
{context}

User question: {question}

Answer the question based ONLY on the context excerpts provided above. 
If the information comes from a [SLIDE X] block, explicitly mention that it was shown on a slide. 
If it comes from the spoken transcript, you can mention it was spoken.
If the answer is not found in the context provided, clearly say so — do not make things up."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=512,
    )

    return response.choices[0].message.content.strip()