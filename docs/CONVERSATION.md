# CONVERSATION — HuddleX

> How HuddleX handles multi-turn conversation: where history is stored, and how
> follow-up questions are rewritten so retrieval stays accurate across turns.
> Implementation lives in `HuddleX_backend/actions/store.py` and
> `HuddleX_backend/actions/action_persona_chat.py`.

---

## 1. The problem

Conversations aren't single questions — they're chains of follow-ups that rely on
context:

```
User : What do you think about wealth?
Naval: Wealth is the ability to create value while you sleep...
User : Why do you believe that?        ← "that" = the previous answer's topic
User : What about for founders?         ← elided subject: wealth/leverage for founders
```

A follow-up like *"Why do you believe that?"* contains a pronoun with no standalone
meaning. Sent **as-is** to the vector store, it retrieves nothing relevant — the
retriever has no idea what "that" refers to. The result is weak context, which
either produces a vague answer or (with our [hallucination](HALLUCINATION.md) L4
gate) trips the "I haven't posted about that" fallback.

---

## 2. The strategy

Two parts, applied to the persona bot:

1. **Conversation Store** — persist the full per-session history (user + assistant
   turns) so later turns can be interpreted in context.
2. **Conversation-aware query rewriting** — before retrieval, combine the recent
   history with the current message and have an LLM rewrite it into a
   **self-contained, topic-explicit** query. The rewritten query drives retrieval;
   the original message still drives the answer.

History management: a **sliding window** keeps token usage bounded (and, optionally,
older turns can be compressed into a summary — see §6).

---

## 3. Conversation Store (already in place)

History is persisted per session as thread JSON in `actions/store.py`. The Rasa
`sender_id` is the session/thread key.

| Function | Role |
|----------|------|
| `load_thread(thread_id)` | read the thread (or a fresh skeleton) |
| `append_message(thread_id, persona_id, role, content, retrieved_chunks=…)` | append one turn and persist |
| `save_thread(thread)` | write back, bumping `last_active` |
| `list_threads()` | lightweight index for `GET /api/threads` (TasksPanel) |

Each turn records `id`, `timestamp`, `persona_id`, `role`, `content`, and (for
assistant turns) the `retrieved_chunks` that grounded it. Storage is local JSON
under `.data/threads/{thread_id}.json` — no external DB needed for the hackathon.

> This is also the cross-session memory the project is built around: restart the
> server and the history is still on disk.

---

## 4. Query rewriting (added)

`_rewrite_query(history_text, user_message)` in `action_persona_chat.py`:

- Takes the recent thread history (the sliding window) + the current message.
- Asks the LLM to resolve pronouns (`it`, `that`, `this`) and fill in the elided
  **topic**, producing a short, keyword-focused standalone query. It's told to
  focus on the *topic*, not the speaker — retrieval is already scoped to the
  persona's own collection.
- Returns the rewritten query; **falls back to the raw message** on the first turn
  (no history) or on any error, so it can never block a reply.

Wiring in `ActionPersonaChat.run()`:

```python
history_text = _format_history(thread.get("thread_history", []))   # pre-turn window
append_message(thread_id, None, "user", user_message)              # persist the turn
search_query = _rewrite_query(history_text, user_message)          # rewrite for retrieval
docs, ids, dists = _retrieve(persona_id, search_query)             # retrieve with rewrite
# ... the ORIGINAL user_message still goes into the answer prompt
```

The rewritten query is surfaced as `custom.search_query` in the chat response (and
logged server-side as `[persona_chat] rewrite: '<orig>' -> '<rewritten>'`) for
demo/debug visibility.

---

## 5. Verified behavior

Live multi-turn test (persona = Naval):

| Turn | User message | `search_query` sent to Chroma | Grounded |
|------|--------------|-------------------------------|----------|
| 1 | "What do you think about wealth?" | *unchanged* (already self-contained) | ✅ |
| 2 | "Why do you believe **that**?" | "Why believe wealth is about creating value while you sleep through leverage, ownership, and building lasting things?" | ✅ |

Turn 2 is the win: `"that"` was expanded into the actual topic from turn 1, so
retrieval found the relevant posts instead of being blind to the pronoun.

---

## 6. History management & deferred work

- **Sliding window** — `THREAD_HISTORY_WINDOW = 12` (last N messages) caps the
  context fed to both the rewriter and the answer prompt, bounding tokens/latency.
- **Summarization (deferred)** — `global_summary` exists in the user store but is
  not auto-generated. For very long sessions, compressing turns older than the
  window into a running summary would preserve context without unbounded tokens.
- **Store backend (deferred)** — local JSON is fine for the hackathon. For
  production, back the store with Redis (TTL auto-expiry) or a relational DB
  (durable history).

---

## 7. Cost & failure modes

- **Cost** — one extra short LLM call per *follow-up* turn (temperature 0,
  ≤80 tokens). First turns skip it.
- **Fail-safe** — rewrite errors degrade to the raw message; a bad rewrite can
  never drop a reply.
- **Interaction with grounding** — better queries mean the L4 relevance gate
  (see [HALLUCINATION.md](HALLUCINATION.md)) refuses *less* often on legitimate
  follow-ups, because retrieval now gets a query it can actually match.

---

## 8. Reference

| What | Where |
|------|-------|
| Conversation store | `actions/store.py` (`load_thread` / `append_message` / `list_threads`) |
| Stored files | `.data/threads/{thread_id}.json` |
| Query rewriting | `actions/action_persona_chat.py` → `_rewrite_query()` |
| Sliding window | `THREAD_HISTORY_WINDOW = 12` in `action_persona_chat.py` |
| Debug signal | server log `[persona_chat] rewrite: …` + chat reply `custom.search_query` |
