"""
action_persona_chat
────────────────────
Called by:  general_chat flow  (default fallback for all messages)
Frontend:   VoiceCenter mic button  →  POST /webhooks/rest/webhook  (voice path)
            VoiceCenter keyboard    →  POST /webhooks/rest/webhook  (text path)
            ChatPreview             →  read-only (polls GET /api/threads/{id})

Flow:
  1. Resolve active persona + load Chroma collection
  2. Load thread history + user global summary
  3. Query Chroma top-5 chunks for current user message
  4. Assemble system prompt (5 blocks, see DATABASE.md §6)
  5. Call Nebius LLM via OpenAI-compatible client
  6. Persist message pair to thread JSON
  7. Return text reply + custom payload with retrieved chunk ids
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Text

import chromadb
from openai import OpenAI
from rasa_sdk import Action, Tracker
from rasa_sdk.events import SlotSet
from rasa_sdk.executor import CollectingDispatcher

from actions.persona_store import load_persona_data
from actions.store import append_message, load_thread, load_user, save_thread_summary

NEBIUS_BASE_URL = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1")
NEBIUS_API_KEY = os.getenv("NEBIUS_API_KEY", "")
NEBIUS_MODEL = os.getenv("NEBIUS_MODEL", "Qwen/Qwen3-235B-A22B-Instruct-2507")
DATA_DIR = os.getenv("DATA_DIR", ".data")
CHROMA_DIR = f"{DATA_DIR}/chroma_db"
THREAD_HISTORY_WINDOW = int(os.getenv("THREAD_HISTORY_WINDOW", "12"))  # last N msgs shown verbatim
TOP_K = 5                     # Chroma retrieval count
# L4 fallback: max L2 distance for a chunk to count as "relevant".
# Measured on the seeded corpus: on-topic best matches land < 1.2,
# off-topic / gibberish land > 1.55. 1.5 (~cosine 0.25) separates them.
MAX_DISTANCE = float(os.getenv("RAG_MAX_DISTANCE", "1.5"))


def _get_collection(persona_id: str):
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    try:
        return client.get_collection(f"persona_{persona_id}")
    except Exception:
        return None


def _retrieve(persona_id: str, query: str) -> tuple[list[str], list[str], list[float]]:
    collection = _get_collection(persona_id)
    if collection is None:
        return [], [], []
    results = collection.query(query_texts=[query], n_results=TOP_K)
    docs = results["documents"][0] if results["documents"] else []
    ids = results["ids"][0] if results["ids"] else []
    dists = results["distances"][0] if results.get("distances") else []
    return docs, ids, dists


def _rewrite_query(history_text: str, user_message: str) -> str:
    """Conversation-aware query rewriting for multi-turn persona chat.

    Follow-ups in a persona conversation lean on context: after the persona
    discusses a topic, the user asks "why do you think that?", "say more", or
    "what about for founders?" — pronouns and an elided topic that retrieve
    poorly on their own. Using the recent thread history, rewrite the message
    into a self-contained, topic-explicit query before hitting Chroma.

    Falls back to the original message when there's no history or on any error,
    so a rewrite failure can never block the reply. Skipped on the first turn
    (no history) to avoid an extra LLM round-trip.
    """
    if not history_text.strip():
        return user_message

    prompt = (
        "You rewrite the user's latest message into a standalone search query "
        "for retrieving an expert's past posts.\n"
        "Using the conversation so far, resolve pronouns (it, that, this) and "
        "fill in the elided topic so the query stands on its own. Focus on the "
        "TOPIC under discussion, not the speaker. Keep it short and "
        "keyword-focused. If the message is already self-contained, return it "
        "unchanged. Output ONLY the rewritten query.\n\n"
        f"Conversation so far:\n{history_text}\n\n"
        f"Latest message: {user_message}\n\n"
        "Standalone query:"
    )
    try:
        client = OpenAI(api_key=NEBIUS_API_KEY, base_url=NEBIUS_BASE_URL)
        resp = client.chat.completions.create(
            model=NEBIUS_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=80,
        )
        rewritten = (resp.choices[0].message.content or "").strip()
        return rewritten or user_message
    except Exception as e:  # network/LLM error — degrade gracefully
        print(f"[persona_chat] query rewrite failed, using raw message: {e}", flush=True)
        return user_message


def _fallback_reply(persona_data: dict) -> str:
    """L4: honest, in-character refusal when no sufficiently relevant knowledge
    was retrieved. Returned WITHOUT an LLM call, so it can never hallucinate."""
    name = persona_data.get("display_name", "I")
    return (
        f"That's not something I've talked about in my posts, so I'd be guessing — "
        f"and I'd rather not put words in {name}'s mouth. Ask me about something "
        f"I've actually weighed in on and I'll give you the real take."
    )


def _format_history(messages: list[dict]) -> str:
    lines = []
    for m in messages[-THREAD_HISTORY_WINDOW:]:
        role = m["role"]
        persona = m.get("persona_id") or ""
        prefix = f"[{persona}] " if role == "assistant" else "[User] "
        lines.append(f"{prefix}{m['content']}")
    return "\n".join(lines)


def _summarize_turns(prev_summary: str, turns: list[dict]) -> str:
    """Fold a batch of older turns into the running conversation summary."""
    convo = "\n".join(
        f"[{'User' if m['role'] == 'user' else m.get('persona_id') or 'assistant'}] {m['content']}"
        for m in turns
    )
    prompt = (
        "Maintain a running summary of a conversation. Update the existing summary "
        "to incorporate the new messages. Keep it concise (a few sentences). "
        "Preserve concrete facts, the user's stated preferences/situation, topics "
        "discussed, and any commitments — these must survive even after the raw "
        "messages scroll away. Output ONLY the updated summary.\n\n"
        f"Existing summary:\n{prev_summary or '(none yet)'}\n\n"
        f"New messages to fold in:\n{convo}\n\n"
        "Updated summary:"
    )
    client = OpenAI(api_key=NEBIUS_API_KEY, base_url=NEBIUS_BASE_URL)
    resp = client.chat.completions.create(
        model=NEBIUS_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=256,
    )
    return (resp.choices[0].message.content or "").strip()


def _maybe_update_summary(thread_id: str, thread: dict) -> None:
    """Rolling summarization: when turns scroll past the live window, fold the
    newly-evicted ones into thread_summary so long conversations keep early
    context. Mutates `thread` in place and persists. Fail-safe: on error it
    leaves summarized_count unchanged so the same turns are retried next turn
    (never silently lost)."""
    history = thread.get("thread_history", [])
    summarized = thread.get("summarized_count", 0)
    cutoff = max(0, len(history) - THREAD_HISTORY_WINDOW)  # keep last WINDOW verbatim
    if cutoff <= summarized:
        return  # nothing new has scrolled out of the window

    new_old_turns = history[summarized:cutoff]
    try:
        new_summary = _summarize_turns(thread.get("thread_summary", ""), new_old_turns)
    except Exception as e:
        print(f"[persona_chat] summary update failed (will retry): {e}", flush=True)
        return

    thread["thread_summary"] = new_summary
    thread["summarized_count"] = cutoff
    save_thread_summary(thread_id, new_summary, cutoff)
    print(f"[persona_chat] rolled {len(new_old_turns)} turns into summary "
          f"(summarized_count={cutoff})", flush=True)


def _format_cognitive_framework(framework: dict, name: str) -> str:
    """
    Render the cognitive_framework dict (produced by distillation.py) as
    a structured system-prompt block.  Returns "" if no framework exists.
    """
    if not framework or framework.get("_synthesis_error"):
        return ""

    lines: list[str] = [f"\n[COGNITIVE FRAMEWORK — How {name} Thinks]"]

    models = framework.get("mental_models", [])
    if models:
        lines.append("Mental Models (use these lenses when reasoning):")
        for m in models:
            lines.append(f"  • {m.get('name', '')}: {m.get('description', '')}")
            sig = m.get("signature_phrase", "")
            if sig:
                lines.append(f'    Signature: "{sig}"')
            limit = m.get("limitation", "")
            if limit:
                lines.append(f"    Limitation: {limit}")

    heuristics = framework.get("decision_heuristics", [])
    if heuristics:
        lines.append("Decision Heuristics (how you make judgments):")
        for h in heuristics:
            lines.append(f"  • {h}")

    dna = framework.get("expression_dna", {})
    if dna:
        lines.append("Expression DNA (your voice — stay true to this):")
        lines.append(f"  Tone: {dna.get('tone', '')}")
        lines.append(f"  Style: {dna.get('sentence_style', '')}")
        phrases = dna.get("signature_phrases", [])
        if phrases:
            lines.append(f"  Signature phrases: {', '.join(repr(p) for p in phrases)}")
        arg = dna.get("argument_structure", "")
        if arg:
            lines.append(f"  Argument structure: {arg}")

    anti = framework.get("anti_patterns", [])
    if anti:
        lines.append("Anti-patterns (NEVER do these — they break character):")
        for a in anti:
            lines.append(f"  ✗ {a}")

    tensions = framework.get("core_tensions", [])
    if tensions:
        lines.append("Core Tensions (embody these contradictions naturally):")
        for t in tensions:
            lines.append(f"  ⟷ {t}")

    return "\n".join(lines)


def _build_prompt(persona_data: dict, user: dict, thread: dict,
                  chunks: list[str], user_message: str) -> str:
    ctx = user.get("user_context", {})
    global_summary = user.get("global_summary", {}).get("text", "")
    thread_history_text = _format_history(thread.get("thread_history", []))
    thread_summary = thread.get("thread_summary", "")
    earlier_block = (
        f"\n[EARLIER IN THIS CONVERSATION]\n"
        f"Summary of earlier turns no longer shown verbatim below:\n{thread_summary}\n"
        if thread_summary else ""
    )

    p = persona_data
    traits = ", ".join(p.get("personality_traits", []))
    style = p.get("speaking_style", "")
    briefing = p.get("briefing", {}).get("text", "")
    chunks_text = "\n---\n".join(chunks) if chunks else "(no relevant knowledge found)"
    interests = ", ".join(ctx.get("interests", []))

    framework_block = _format_cognitive_framework(
        p.get("cognitive_framework", {}), p["display_name"]
    )

    return f"""[PERSONA DEFINITION]
You are {p['display_name']} ({p.get('handle', '')}).
Personality traits: {traits}.
Speaking style: {style}
Today's briefing (recent focus): {briefing}
{framework_block}

[USER CONTEXT]
You are talking with {ctx.get('name') or 'the user'}, who is {ctx.get('role') or 'someone'}.
Interests: {interests}.
Background: {ctx.get('raw_description', '')}

[GLOBAL HISTORY]
Summary of all past conversations with this user:
{global_summary or '(no prior conversations)'}
{earlier_block}
[THREAD HISTORY]
Current conversation thread (most recent at bottom):
{thread_history_text or '(start of conversation)'}

[RETRIEVED KNOWLEDGE]
Most relevant content from your X posts and Wikipedia:
{chunks_text}

[INSTRUCTION]
Respond as {p['display_name']}, in the first person and in character. Be concise.

GROUNDING RULES (these override staying in character):
- Any specific fact, number, date, event, product, or claim MUST come from
  [RETRIEVED KNOWLEDGE] above. Do NOT invent or guess specifics — no made-up
  policies, statistics, quotes, launches, or figures.
- You may speak in your characteristic voice and express your known opinions,
  but factual specifics must trace back to the retrieved posts.
- If [RETRIEVED KNOWLEDGE] does not actually address the question, say so
  honestly in your own voice (e.g. that you haven't posted about it) instead of
  fabricating an answer.
If a cognitive framework is present above, let it shape HOW you reason, not just what you say.
If the thread history mentions a previous persona's reply, you may acknowledge it naturally.
Match the user's language (Chinese or English).

User: {user_message}
{p['display_name']}:"""


class ActionPersonaChat(Action):
    def name(self) -> Text:
        return "action_persona_chat"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        thread_id = tracker.sender_id
        user_id = thread_id
        user_message = tracker.latest_message.get("text", "")
        # Prefer the persona the frontend selected (sent per-message as metadata),
        # then the active_persona_id slot, then a default. This keeps the answering
        # persona in sync with what the UI shows, without depending on a prior switch.
        metadata = tracker.latest_message.get("metadata") or {}
        persona_id = (
            metadata.get("persona_id")
            or tracker.get_slot("active_persona_id")
            or "elon_musk"  # last-resort default; matches the frontend's default selection
        )

        persona_data = load_persona_data(persona_id)
        if persona_data is None:
            dispatcher.utter_message(
                text=f"I don't have knowledge loaded for {persona_id} yet. "
                "Run `make seed-personas` first."
            )
            return []

        user = load_user(user_id)
        thread = load_thread(thread_id)

        # Rolling summarization (DISABLED): fold turns scrolled past the live
        # window into thread_summary so long conversations keep early context.
        # Parked until the Rasa command generator reliably routes follow-ups to
        # this action — see docs/CONVERSATION.md §6. Re-enable by uncommenting:
        # _maybe_update_summary(thread_id, thread)

        # Conversation history BEFORE this turn — used for both query rewriting
        # and the answer prompt (sliding window of THREAD_HISTORY_WINDOW turns).
        history_text = _format_history(thread.get("thread_history", []))

        # Persist user message before generating reply
        append_message(thread_id, None, "user", user_message)

        # Conversation-aware query rewriting: resolve pronouns/ellipsis in
        # follow-ups so retrieval isn't blind to context. Retrieve with the
        # rewritten query; the original message still drives the answer prompt.
        search_query = _rewrite_query(history_text, user_message)
        if search_query != user_message:
            print(f"[persona_chat] rewrite: {user_message!r} -> {search_query!r}", flush=True)

        docs, ids, dists = _retrieve(persona_id, search_query)

        # L4 — relevance gate: keep only chunks within MAX_DISTANCE.
        relevant = [(d, i) for d, i, dist in zip(docs, ids, dists) if dist <= MAX_DISTANCE]
        best = min(dists) if dists else None
        print(
            f"[persona_chat] persona={persona_id} best_dist={best} "
            f"kept={len(relevant)}/{len(docs)} (max={MAX_DISTANCE})",
            flush=True,
        )

        if not relevant:
            # Nothing relevant enough — refuse in-character instead of feeding
            # the LLM junk context (the root cause of hallucination).
            reply = _fallback_reply(persona_data)
            append_message(thread_id, persona_id, "assistant", reply, retrieved_chunks=[])
            dispatcher.utter_message(
                text=reply,
                custom={
                    "type": "persona_reply",
                    "persona_id": persona_id,
                    "retrieved_chunk_ids": [],
                    "grounded": False,
                    "search_query": search_query,
                },
            )
            return [SlotSet("active_persona_id", persona_id)]

        chunks = [d for d, _ in relevant]
        chunk_ids = [i for _, i in relevant]
        prompt = _build_prompt(persona_data, user, thread, chunks, user_message)

        client = OpenAI(api_key=NEBIUS_API_KEY, base_url=NEBIUS_BASE_URL)
        response = client.chat.completions.create(
            model=NEBIUS_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=512,
        )
        reply = response.choices[0].message.content.strip()

        # Persist assistant reply
        append_message(thread_id, persona_id, "assistant", reply,
                       retrieved_chunks=chunk_ids)

        dispatcher.utter_message(
            text=reply,
            custom={
                "type": "persona_reply",
                "persona_id": persona_id,
                "retrieved_chunk_ids": chunk_ids,
                "grounded": True,
                "search_query": search_query,
            },
        )
        return [SlotSet("active_persona_id", persona_id)]
