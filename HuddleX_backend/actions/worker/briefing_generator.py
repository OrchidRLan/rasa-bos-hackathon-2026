"""Generate a ~100-word today's briefing for a persona using the LLM."""

from __future__ import annotations

import os

from openai import OpenAI

NEBIUS_BASE_URL = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1")
NEBIUS_API_KEY = os.getenv("NEBIUS_API_KEY", "")
NEBIUS_MODEL = os.getenv("NEBIUS_MODEL", "Qwen/Qwen3-235B-A22B-Instruct-2507")


def generate_briefing(persona_data: dict) -> str:
    """
    Given a fully seeded persona dict (with x_posts and wikipedia),
    produce a short briefing summarising recent focus topics.
    Stored in persona_data['briefing']['text'] by the caller.
    """
    name = persona_data.get("display_name", "this person")
    recent_posts = persona_data.get("x_posts", [])[-30:]  # last 30 posts
    post_texts = "\n".join(f"- {p['text']}" for p in recent_posts)

    prompt = f"""You are summarising what {name} has been thinking about recently.
Based on these recent X posts, write a 2-3 sentence briefing (max 100 words) of
their current focus topics and opinions. Write in third person.

Recent posts:
{post_texts or '(no posts available)'}

Briefing:"""

    client = OpenAI(api_key=NEBIUS_API_KEY, base_url=NEBIUS_BASE_URL)
    resp = client.chat.completions.create(
        model=NEBIUS_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=150,
    )
    return resp.choices[0].message.content.strip()
