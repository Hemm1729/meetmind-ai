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
    Use Groq Llama3 to generate a profound, highly structured meeting intelligence brief.
    Called once after transcription and OCR is done.
    """
    client = get_groq_client()

    prompt = f"""You are an elite Executive Meeting Analyst for a Fortune 500 company. 
Your goal is to extract the absolute best, most profound intelligence from this meeting transcript and visual slide data. Make your analysis better, more structured, and more detailed than platforms like Spinach.ai or Otter.ai.

Transcript (Spoken words):
{transcript[:8000]}

Slide Text (Shown on screen):
{ocr_text[:4000] if ocr_text else 'No visual slides presented.'}

Respond in this exact JSON format. The "summary" field must be a heavily detailed, beautifully formatted Markdown string containing these specific sections: 🎯 Executive Goal, 🧠 Deep Insights & Sentiments, 📊 Visual/Slide Analysis (if slides exist), and 📝 Comprehensive Notes. 

{{
  "summary": "### 🎯 Executive Goal\\n...\\n\\n### 🧠 Deep Insights & Sentiments\\n...\\n\\n### 📊 Visual & Slide Analysis\\n...\\n\\n### 📝 Comprehensive Notes\\n- Point 1\\n- Point 2",
  "action_items": [
    {{"task": "Highly detailed task description...", "assignee": "...", "deadline": "..."}}
  ],
  "decisions": [
    "Decision 1 with rich contextual reasoning behind it.",
    "Decision 2..."
  ]
}}

Ensure your "summary" Markdown uses bolding, bullet points, and emojis to make it highly readable and visually impressive. 
If no assignee/deadline, write "Unassigned" / "Not specified".
Return ONLY valid JSON, absolutely no extra text before or after."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=2500,
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


def generate_live_answer(context: str, question: str) -> str:
    """
    Answers a question based on a live rolling context window of the meeting.
    """
    client = get_groq_client()

    prompt = f"""You are the MeetMind Live Assistant. A meeting is currently active.
Here is the raw context transcribed/OCRed from the past few minutes of the meeting:

{context}

User question: {question}

Answer the question based ONLY on the context excerpts provided above. 
If the information comes from a [SLIDE] block, explicitly mention that it was shown on a slide. 
If it comes from the spoken transcript, you can mention it was spoken.
Keep your answer concise and helpful."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=512,
    )

    return response.choices[0].message.content.strip()