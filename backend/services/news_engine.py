import json
import re
from openai import AsyncOpenAI
from config import settings


client = AsyncOpenAI(
    api_key=settings.DASHSCOPE_API_KEY,
    base_url=settings.DASHSCOPE_BASE_URL,
)

SYSTEM_PROMPT = """You are a professional news expert. Generate news about current events based on the user's question.
Respond ONLY with valid JSON containing:
{
  "headline": "A concise news headline",
  "summary": "A 2-3 sentence summary of the news",
  "key_facts": ["fact 1", "fact 2", "fact 3"],
  "video_search_term": "A YouTube search term to find a relevant video",
  "sources": ["source 1", "source 2"],
  "confidence": 0.85,
  "speaking_script": "A natural 2-3 sentence script for a news presenter to read aloud. Starts with a conversational hook. Written to sound natural when spoken, not read."
}

Rules:
- headline should be attention-grabbing and concise
- summary should be informative and factual
- key_facts should have 3-5 bullet points
- video_search_term should be specific enough to find a relevant YouTube video
- sources should reference credible news outlets
- confidence should be between 0 and 1 based on how certain you are about the information
- speaking_script should be conversational and engaging, suitable for a TV news presenter to speak aloud
- Respond with ONLY the JSON object, no additional text"""


async def generate_news(query: str, context: str = "") -> dict:
    """Generate news content using Qwen-Max via DashScope."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    user_content = f"Question: {query}"
    if context:
        user_content += f"\nAdditional context: {context}"

    messages.append({"role": "user", "content": user_content})

    try:
        response = await client.chat.completions.create(
            model=settings.MODEL_TEXT,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )

        content = response.choices[0].message.content.strip()

        # Handle markdown code block wrapping
        if content.startswith("```"):
            # Remove ```json or ``` at start and ``` at end
            content = re.sub(r"^```(?:json)?\s*\n?", "", content)
            content = re.sub(r"\n?```\s*$", "", content)

        result = json.loads(content)

        # Validate and provide defaults
        return {
            "headline": result.get("headline", "News Update"),
            "summary": result.get("summary", ""),
            "key_facts": result.get("key_facts", []),
            "video_search_term": result.get("video_search_term", query),
            "sources": result.get("sources", []),
            "confidence": float(result.get("confidence", 0.5)),
            "speaking_script": result.get("speaking_script", f"Here's the latest: {result.get('headline', 'News Update')}. {result.get('summary', '')}"),
        }

    except json.JSONDecodeError:
        # If JSON parsing fails, return a structured fallback
        return {
            "headline": f"News about: {query}",
            "summary": "Unable to parse structured news response.",
            "key_facts": ["Information is being processed"],
            "video_search_term": query,
            "sources": [],
            "confidence": 0.3,
            "speaking_script": f"Here's an update on {query}. We're gathering the details for you now.",
        }
    except Exception as e:
        return {
            "headline": f"News about: {query}",
            "summary": f"Error generating news: {str(e)}",
            "key_facts": [],
            "video_search_term": query,
            "sources": [],
            "confidence": 0.0,
            "speaking_script": f"We're looking into {query} for you. Stay tuned for more details.",
        }
