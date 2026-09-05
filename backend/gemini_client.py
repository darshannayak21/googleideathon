import logging
import json
from typing import List, Dict, Tuple, Optional, Any
from google import genai
from backend.config import PROJECT_ID, MAX_HISTORY_TURNS

logger = logging.getLogger("journal-api.gemini")

class GeminiClientWrapper:
    def __init__(self):
        self._client: Optional[genai.Client] = None

    def initialize(self, api_key: str):
        self._client = genai.Client(api_key=api_key)
        logger.info("AI Studio Gemini client successfully initialized")

    @property
    def client(self) -> genai.Client:
        if not self._client:
            raise RuntimeError("Gemini client not initialized. Is the API key loaded?")
        return self._client

gemini = GeminiClientWrapper()

def chat_turn(history: List[Dict[str, str]], message: str, persona: str = "Empathic Listener") -> Tuple[str, str, int]:
    """
    Sends a message to Gemini and returns the reply, mood, and stress level.
    """
    contents = []
    for msg in history[-MAX_HISTORY_TURNS:]:
        contents.append(
            genai.types.Content(
                role=msg["role"],
                parts=[genai.types.Part(text=msg["content"])],
            )
        )
    contents.append(
        genai.types.Content(
            role="user",
            parts=[genai.types.Part(text=message)],
        )
    )

    persona_prompts = {
        "Empathic Listener": "You are a thoughtful, empathetic journaling assistant. Help the user reflect on their thoughts, brainstorm ideas, and process their feelings. Be supportive but honest.",
        "Socratic Coach": "You are a Socratic Coach. Do not just agree with the user. Ask probing questions, challenge their underlying assumptions, and force them to think critically and deeply about their situation.",
        "Devil's Advocate": "You are a Devil's Advocate. You safely but firmly critique the user's ideas, especially regarding startups, projects, or plans. Point out blind spots, risks, and counter-arguments.",
        "Executive Summarizer": "You are an Executive Summarizer. You are extremely direct and concise. Respond mostly with bullet points, actionable items, and high-level summaries. Cut the fluff."
    }

    base_instruction = persona_prompts.get(persona, persona_prompts["Empathic Listener"])

    system_instruction = f"""{base_instruction}

IMPORTANT: Do not use markdown bolding (asterisks like **) anywhere in your response to keep the text clean. You may use bullet points (-) for lists.
IMPORTANT: The app has a native reminder/timer system. If the user asks you to remind them of something, DO NOT say you cannot do it. Instead, enthusiastically confirm that their reminder has been set!

After your response, on a new line, output a JSON block with exactly this format:
{{"mood": "<single word emotion>", "stress_level": <integer 1-10>}}

The mood should be one word like: Calm, Anxious, Joyful, Reflective, Frustrated, Hopeful, Sad, Energized, Grateful, Overwhelmed.
Stress level: 1 = very relaxed, 10 = extremely stressed.

IMPORTANT: Output your conversational response first, then the JSON on its own line at the very end."""

    response = gemini.client.models.generate_content(
        model="gemini-3.6-flash",
        contents=contents,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.7,
            max_output_tokens=1024,
        ),
    )

    raw_text = response.text.strip() if response.text else "I'm here to listen. Could you tell me more?"
    return _parse_chat_response(raw_text)

def summarize_conversation(transcript: str) -> Dict[str, Any]:
    """Asks Gemini to summarize a session transcript."""
    prompt = f"""Summarize this journal conversation concisely. Include:
1. A brief summary (2-3 sentences)
2. The dominant mood
3. Up to 3 topic tags

Output as JSON:
{{"summary": "...", "mood": "...", "tags": ["...", "..."]}}

Conversation:
{transcript}"""

    response = gemini.client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
        config=genai.types.GenerateContentConfig(temperature=0.3),
    )

    raw = response.text.strip() if response.text else "{}"
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        raw = raw.rsplit("```", 1)[0].strip()

    try:
        data = json.loads(raw)
        return {
            "summary": data.get("summary", raw),
            "mood": data.get("mood", "Unknown"),
            "tags": data.get("tags", []),
        }
    except json.JSONDecodeError:
        return {"summary": raw, "mood": "Unknown", "tags": []}

def get_embedding(text: str) -> List[float]:
    """Generates an embedding for the given text."""
    if not gemini.client:
        raise RuntimeError("Gemini client not initialized. Is the API key loaded?")
        
    response = gemini.client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
    )
    return response.embeddings[0].values

def synthesize_insight(query: str, context: str) -> str:
    """Asks Gemini to synthesize an insight based on past journal entries."""
    prompt = f"""The user asked: "{query}"

Here are their recent journal summaries (private, from their own data only):
{context}

Based on these entries, provide a thoughtful, pattern-level insight. What recurring themes, 
emotional patterns, or growth areas do you see? Ground your answer in the specific entries above.
Be empathetic and constructive. 2-4 sentences."""

    response = gemini.client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
        config=genai.types.GenerateContentConfig(temperature=0.5),
    )
    return response.text.strip() if response.text else "I couldn't generate an insight right now."

def _parse_chat_response(raw: str) -> Tuple[str, str, int]:
    mood = "Neutral"
    stress_level = 5

    lines = raw.strip().split("\n")
    for i in range(len(lines) - 1, max(len(lines) - 4, -1), -1):
        line = lines[i].strip()
        if line.startswith("{") and line.endswith("}"):
            try:
                data = json.loads(line)
                mood = data.get("mood", mood)
                stress_level = int(data.get("stress_level", stress_level))
                stress_level = max(1, min(10, stress_level))
                reply = "\n".join(lines[:i]).strip()
                return reply, mood, stress_level
            except (json.JSONDecodeError, ValueError):
                continue

    return raw, mood, stress_level

def synthesize_trends(summaries: List[Dict[str, str]]) -> Dict[str, Any]:
    """Synthesizes temporal-aware mood analysis and growth advice from past summaries."""
    context = "\n".join(
        f"- Date: {s.get('createdAt', 'unknown')}, Mood: {s['mood']}, Summary: {s['summary']}"
        for s in summaries
    )

    prompt = f"""You are an expert behavioral analyst and empathetic journal companion.
Analyze the following timestamped journal summaries. Your goal:
1. Identify temporal patterns (e.g. "You tend to express higher anxiety on weekday evenings" or "Your mood lifts when you talk about creative projects").
2. Spot recurring emotional themes and shifts over time.
3. Offer a concise, warm, 2-paragraph growth reflection.

Output as JSON:
{{"advice": "<your 2-paragraph advice, no markdown>", "patterns": [{{"observation": "<pattern>", "confidence": "high" | "medium" | "low"}}]}}

Past Summaries:
{context}"""

    response = gemini.client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
        config=genai.types.GenerateContentConfig(temperature=0.7),
    )
    raw = response.text.strip() if response.text else "{}"
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        raw = raw.rsplit("```", 1)[0].strip()
    try:
        data = json.loads(raw)
        return {
            "advice": data.get("advice", raw),
            "patterns": data.get("patterns", []),
        }
    except json.JSONDecodeError:
        return {"advice": raw, "patterns": []}

