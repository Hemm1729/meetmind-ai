import os
import json
from groq import Groq


def get_groq_client() -> Groq:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not set")
    return Groq(api_key=api_key)


def generate_summary_and_actions(transcript: str) -> dict:
    """
    Use Groq Llama3 to generate a summary + action items from transcript.
    Called once after transcription is done.
    """
    client = get_groq_client()

    prompt = f"""You are an expert meeting analyst. Analyze the following meeting transcript and provide:

1. A concise summary (3-5 sentences) of what was discussed
2. A list of action items with assignee and deadline if mentioned

Transcript:
{transcript[:8000]}

Respond in this exact JSON format:
{{
  "summary": "...",
  "action_items": [
    {{"task": "...", "assignee": "...", "deadline": "..."}}
  ]
}}

If no assignee or deadline is mentioned, use "Unassigned" and "Not specified".
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
            "action_items": []
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

Relevant transcript excerpts:
{context}

User question: {question}

Answer the question based only on the transcript context above. Be specific and reference what was actually said when possible. If the answer is not found in the transcript, clearly say so — do not make things up."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=512,
    )

    return response.choices[0].message.content.strip()