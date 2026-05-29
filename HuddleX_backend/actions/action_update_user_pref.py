"""
action_update_user_pref
────────────────────────
Called by:  update_user_preference flow
Frontend:   UserInfoPanel  →  POST /webhooks/rest/webhook  (voice or text)
            "I'm a founder", "remember I work in AI", "my name is Alex"

Updates .data/users/{user_id}.json with the new preference text.
Also regenerates global_summary if enough messages have accumulated.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Text

from openai import OpenAI
from rasa_sdk import Action, Tracker
from rasa_sdk.events import SlotSet
from rasa_sdk.executor import CollectingDispatcher

from actions.store import load_thread, load_user, save_user, list_threads

NEBIUS_BASE_URL = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1")
NEBIUS_API_KEY = os.getenv("NEBIUS_API_KEY", "")
NEBIUS_MODEL = os.getenv("NEBIUS_MODEL", "Qwen/Qwen3-235B-A22B-Instruct-2507")


def _extract_context_fields(text: str, client: OpenAI) -> dict:
    """Ask the LLM to parse the user's free text into structured fields."""
    prompt = f"""Extract structured user context from this text.
Return JSON with keys: name (str), role (str), interests (list of strings).
If a field is not mentioned, return an empty string or empty list.
Text: "{text}"
JSON:"""
    resp = client.chat.completions.create(
        model=NEBIUS_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=200,
    )
    import json, re
    raw = resp.choices[0].message.content.strip()
    # Extract JSON from response
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    return {}


def _regenerate_global_summary(user_id: str, client: OpenAI) -> str:
    """Compress all thread histories into a single ~100-word summary."""
    threads = list_threads()
    snippets = []
    for t in threads[:10]:   # cap at 10 threads to avoid token explosion
        thread = load_thread(t["thread_id"])
        last_msgs = thread.get("thread_history", [])[-6:]
        text = " ".join(m["content"] for m in last_msgs if m["role"] != "system_event")
        if text:
            snippets.append(f"[{t.get('title') or t['thread_id']}]: {text[:300]}")

    if not snippets:
        return ""

    prompt = f"""Summarize in ~100 words what this user has discussed across conversations.
Focus on their goals, interests, and recurring topics.
Conversations:
{chr(10).join(snippets)}
Summary:"""
    resp = client.chat.completions.create(
        model=NEBIUS_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=150,
    )
    return resp.choices[0].message.content.strip()


class ActionUpdateUserPref(Action):
    def name(self) -> Text:
        return "action_update_user_pref"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        user_id = tracker.sender_id
        pref_text = tracker.get_slot("user_preference_text") or ""

        user = load_user(user_id)
        ctx = user["user_context"]
        ctx["raw_description"] = (
            (ctx.get("raw_description", "") + " " + pref_text).strip()
        )

        client = OpenAI(api_key=NEBIUS_API_KEY, base_url=NEBIUS_BASE_URL)
        fields = _extract_context_fields(pref_text, client)
        if fields.get("name"):
            ctx["name"] = fields["name"]
        if fields.get("role"):
            ctx["role"] = fields["role"]
        if fields.get("interests"):
            existing = set(ctx.get("interests", []))
            existing.update(fields["interests"])
            ctx["interests"] = list(existing)

        from actions.store import _utc_now
        ctx["updated_at"] = _utc_now()
        user["user_context"] = ctx

        # Regenerate global summary periodically (every 5 saves)
        thread_count = len(list_threads())
        if thread_count % 5 == 0 or not user.get("global_summary", {}).get("text"):
            summary = _regenerate_global_summary(user_id, client)
            user["global_summary"] = {
                "text": summary,
                "generated_at": _utc_now(),
                "thread_count": thread_count,
            }

        save_user(user)
        return [SlotSet("user_preference_text", None)]
