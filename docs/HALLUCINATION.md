# HALLUCINATION — HuddleX

> How HuddleX keeps persona replies grounded in the indexed knowledge and
> refuses to fabricate. Implementation lives in
> `HuddleX_backend/actions/action_persona_chat.py`.

---

## 1. Why it matters here

Each persona answers from a small per-persona Chroma collection (recent X posts,
plus Wikipedia when available). The failure mode is the LLM **inventing** specific
facts, numbers, events, or quotes that the persona never actually said — e.g. a
made-up product launch or a fabricated statistic delivered confidently "in voice".
For a demo judged on *staying grounded under pressure*, that is the thing to prevent.

The root cause is simple: the retriever used to pass the top-5 chunks to the LLM
**no matter how irrelevant they were**, so an off-topic question still got
"context" and the model filled the gaps from its own training.

---

## 2. The four-layer framework

A standard multi-layer defense, adapted from the customer-service RAG playbook to
a persona companion bot:

| Layer | Idea | Status in HuddleX |
|-------|------|-------------------|
| **L1 — Prompt engineering** | Constrain the LLM: answer only from context, cite sources, never fabricate | ✅ Implemented |
| **L2 — Retrieval quality** | Hybrid search (vector + keyword) + cross-encoder rerank | ⏸ Deferred (see §6) |
| **L3 — Output validation** | A second pass (LLM/rules) checks the answer's facts are in context | ⏸ Deferred (see §6) |
| **L4 — Fallback** | If similarity is below threshold, refuse instead of feeding weak context | ✅ Implemented |

We implemented **L1 + L4**: the highest safety-per-effort layers, with **no new
dependencies and no added latency** — important for the voice path.

> Adaptation note: this is a *persona* bot, not a factual help desk. "Cite the
> source" = expose the retrieved tweet IDs; "I can't confirm, contact support" =
> an honest, in-character refusal rather than a robotic handoff. We constrain
> fabricated *facts*, not the persona's voice.

---

## 3. L1 — Prompt grounding

The `[INSTRUCTION]` block in `_build_prompt()` enforces grounding and **overrides
"stay in character"** when the two conflict:

```
[INSTRUCTION]
Respond as {name}, in the first person and in character. Be concise.

GROUNDING RULES (these override staying in character):
- Any specific fact, number, date, event, product, or claim MUST come from
  [RETRIEVED KNOWLEDGE] above. Do NOT invent or guess specifics — no made-up
  policies, statistics, quotes, launches, or figures.
- You may speak in your characteristic voice and express your known opinions,
  but factual specifics must trace back to the retrieved posts.
- If [RETRIEVED KNOWLEDGE] does not actually address the question, say so
  honestly in your own voice instead of fabricating an answer.
...
```

The retrieved chunks are injected under a `[RETRIEVED KNOWLEDGE]` block earlier in
the prompt, so the model has an explicit, labeled source to ground against.

---

## 4. L4 — Relevance gate + fallback

### 4.1 How it works

`_retrieve()` now returns Chroma **distances** alongside the documents/ids. In
`run()`:

1. Keep only chunks with `distance <= MAX_DISTANCE`.
2. If **none** qualify → return an honest, in-character refusal from
   `_fallback_reply()` **without calling the LLM** (so it physically cannot
   hallucinate).
3. Otherwise → send only the relevant chunks to the LLM.

```python
docs, ids, dists = _retrieve(persona_id, user_message)
relevant = [(d, i) for d, i, dist in zip(docs, ids, dists) if dist <= MAX_DISTANCE]
if not relevant:
    reply = _fallback_reply(persona_data)   # no LLM call
    ...
    return []
```

### 4.2 Choosing the threshold

Chroma uses **L2 distance** (lower = more similar; embeddings are normalized, so
`L2² ≈ 2 − 2·cos`). Measured on the seeded `naval_ravikant` collection:

| Query | Type | Best-match distance |
|-------|------|---------------------|
| "Are 10x engineers real?" | on-topic | **0.481** |
| "Is starting a company worth it?" | on-topic | **1.191** |
| "What is your favorite pizza topping?" | off-topic | 1.643 |
| "What is the weather in Tokyo?" | off-topic | 1.666 |
| "asdf qwer zxcv" | gibberish | 1.559 |

On-topic lands **< 1.2**, off-topic/gibberish **> 1.55**. Default threshold:

```
MAX_DISTANCE = 1.5      # ≈ cosine 0.25; env-tunable via RAG_MAX_DISTANCE
```

Every query logs `best_dist` and `kept=N/total` from the action server, so the
threshold can be retuned against real traffic.

### 4.3 The fallback reply

`_fallback_reply()` returns a fixed, in-character, honest line (no LLM call):

> "That's not something I've talked about in my posts, so I'd be guessing — and
> I'd rather not put words in {name}'s mouth. Ask me about something I've actually
> weighed in on and I'll give you the real take."

---

## 5. Results

Before/after on the case that used to hallucinate:

| Question | Before | After |
|----------|--------|-------|
| "Are 10x engineers real?" (on-topic) | answered | ✅ `grounded=True`, cites real tweets, echoes *"10x engineers because there are 10x thinkers"* |
| "Favorite pizza topping?" (off-topic) | ❌ invented *"I don't eat pizza, longevity diet…"* | ✅ `grounded=False`, honest refusal, **zero LLM call** |

The chat response `custom` payload now carries a **`grounded`** boolean and the
`retrieved_chunk_ids` — the frontend can render a "grounded ✓ / can't confirm"
badge and a source list.

```json
{
  "type": "persona_reply",
  "persona_id": "naval_ravikant",
  "retrieved_chunk_ids": ["tweet_2060286038854054375", "..."],
  "grounded": true
}
```

---

## 6. Deferred layers (L2, L3)

Skipped intentionally for the hackathon scope:

- **L2 (hybrid + rerank)** — reranking pays off over a *large* candidate set. Each
  persona currently has ~30 tweets, so vector top-5 already sees most of the
  corpus. A cross-encoder adds an ~80MB model + 100–300 ms/reply for marginal gain
  at this size. Revisit if the corpus grows substantially.
- **L3 (LLM grounding check)** — strongest layer, but a second LLM call **doubles
  latency and cost per reply**, which directly hurts the voice path. It is the
  "production hardening" layer, not the demo layer.

---

## 7. Known limitations

1. **L4 only protects messages that reach `action_persona_chat`.** Some phrasings
   are routed elsewhere by the command generator (e.g. "what did the stock market
   do today?" → a safe generic decline, not our action). Those are still safe but
   bypass the gate. See routing in `data/flows/general_chat.yml`
   (`pattern_chitchat`).
2. **Threshold is tuned on the seeded corpus.** All personas share the same
   embedding model so 1.5 generalizes, but retune `RAG_MAX_DISTANCE` if you change
   the embedding model or see false refusals.
3. **Toxic source content.** Grounding faithfully reproduces whatever is indexed.
   L1/L4 reduce but do not eliminate the risk of a leading question surfacing a
   harmful tweet — pair with content filtering at seed time if needed.

---

## 8. Tuning & reference

| What | Where |
|------|-------|
| Threshold | `RAG_MAX_DISTANCE` env (default `1.5`) |
| Retrieval count | `TOP_K = 5` in `action_persona_chat.py` |
| Prompt rules | `_build_prompt()` → `[INSTRUCTION]` block |
| Gate + fallback | `ActionPersonaChat.run()` and `_fallback_reply()` |
| Per-query debug | action-server log: `[persona_chat] persona=… best_dist=… kept=N/total` |
| Grounding signal | chat reply `custom.grounded` + `custom.retrieved_chunk_ids` |
