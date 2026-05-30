"""
女娲蒸馏引擎 — Method B: full 6-dimension cognitive framework distillation.

Pipeline (mirrors nuwa SKILL.md phases):
  Phase 1   — fetch Wikipedia + X posts  (data gathering)
  Phase 1.5 — 6 parallel LLM dimension calls  (nuwa's 6 agent swarm)
  Phase 2-3 — synthesis LLM call → cognitive_framework JSON
  Phase 4   — quality check  (simplified nuwa quality_check.py)
  Finalize  — embed into Chroma, generate briefing, persist
"""

from __future__ import annotations

import asyncio
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

import httpx
import yaml
from openai import OpenAI

DATA_DIR = Path(os.getenv("DATA_DIR", ".data"))
CHROMA_DIR = DATA_DIR / "chroma_db"
PERSONAS_DATA_DIR = DATA_DIR / "personas"
PERSONA_CONFIG = Path(os.getenv("PERSONA_CONFIG", "data/personas/config.yml"))

NEBIUS_BASE_URL = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1")
NEBIUS_API_KEY = os.getenv("NEBIUS_API_KEY", "")
NEBIUS_MODEL = os.getenv("NEBIUS_MODEL", "Qwen/Qwen3-235B-A22B-Instruct-2507")

WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"

_AVATAR_COLORS = [
    "from-rose-600 to-pink-900",
    "from-cyan-600 to-sky-900",
    "from-amber-600 to-yellow-900",
    "from-teal-600 to-emerald-900",
    "from-indigo-600 to-violet-900",
    "from-red-600 to-rose-900",
    "from-lime-600 to-green-900",
    "from-fuchsia-600 to-purple-900",
]

# ── 6 Research dimensions (nuwa Phase 1 agent swarm) ────────────────────────
# Each: (id, chinese_label, english_focus)
DIMENSIONS = [
    ("01-writings",      "著作与系统思考", "books, essays, long-form writings, systematic beliefs that appear 3+ times"),
    ("02-conversations", "对话与即兴思考", "interview style, how they handle pushback, impromptu analogies, topics they dodge"),
    ("03-expression-dna","表达DNA",       "Twitter/X vocabulary patterns, sentence structure, humor, rhetorical moves"),
    ("04-external-views","他者视角",       "external critiques, how peers describe them, blind spots, controversies"),
    ("05-decisions",     "决策模式",       "major life/career decisions, risk logic, cases where words and actions diverged"),
    ("06-timeline",      "人生轨迹",       "key milestones, intellectual turning points, how thinking evolved, recent focus"),
]

_embed_model = None


def _get_embed_model():
    global _embed_model
    if _embed_model is None:
        from sentence_transformers import SentenceTransformer
        _embed_model = SentenceTransformer(EMBED_MODEL_NAME)
    return _embed_model


def _llm() -> OpenAI:
    return OpenAI(api_key=NEBIUS_API_KEY, base_url=NEBIUS_BASE_URL)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_persona_id(display_name: str) -> str:
    slug = display_name.lower()
    slug = re.sub(r"[^a-z0-9\s]", "", slug)
    slug = re.sub(r"\s+", "_", slug.strip())
    return slug


def _pick_avatar_color(existing_configs: list[dict]) -> str:
    used = {p.get("avatar_color", "") for p in existing_configs}
    for color in _AVATAR_COLORS:
        if color not in used:
            return color
    return _AVATAR_COLORS[len(existing_configs) % len(_AVATAR_COLORS)]


# ── Phase 1: data gathering ─────────────────────────────────────────────────

def _fetch_wikipedia(url: str) -> dict:
    title = url.rstrip("/").split("/wiki/")[-1]
    resp = httpx.get(WIKIPEDIA_API.format(title=title), timeout=15)
    resp.raise_for_status()
    data = resp.json()
    return {
        "summary": data.get("extract", ""),
        "key_facts": [],
        "last_fetched": _utc_now(),
    }


# ── Phase 1.5: 6-dimension research (nuwa agent swarm) ──────────────────────

def _research_one_dimension(
    name: str,
    source_text: str,
    dim_id: str,
    dim_label: str,
    dim_focus: str,
) -> tuple[str, str]:
    """
    Single dimension research call.
    Returns (dim_id, markdown_notes).
    Mirrors one nuwa subagent (e.g. 01-writings.md).
    """
    prompt = f"""You are a researcher building a cognitive profile of {name}.

Your dimension: {dim_label} — {dim_focus}

Available source text:
{source_text[:3000]}

Using both the source text above and your training knowledge about {name}, write focused research notes covering:
- Key patterns, beliefs, or behaviors in this dimension
- Specific examples, quotes, or concrete evidence
- Contradictions or surprising elements (do NOT smooth them over)
- Distinguish: what {name} said themselves vs. what others say about them

Research notes ({dim_label}), max 250 words, markdown:"""

    resp = _llm().chat.completions.create(
        model=NEBIUS_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=350,
    )
    return dim_id, resp.choices[0].message.content.strip()


def _run_all_dimensions(name: str, source_text: str) -> dict[str, str]:
    """
    Run all 6 dimension research calls in parallel (ThreadPoolExecutor).
    Returns {dim_id: markdown_notes}.
    Mirrors nuwa Phase 1 parallel agent swarm.
    """
    notes: dict[str, str] = {}

    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {
            pool.submit(_research_one_dimension, name, source_text, *dim): dim[0]
            for dim in DIMENSIONS
        }
        for future in as_completed(futures):
            try:
                dim_id, text = future.result(timeout=60)
                notes[dim_id] = text
            except Exception as e:
                dim_id = futures[future]
                notes[dim_id] = f"(research failed: {e})"

    return notes


# ── Phase 2-3: synthesis → cognitive_framework ──────────────────────────────

_SYNTHESIS_PROMPT = """\
You are synthesizing multi-dimensional research on {name} into a precise cognitive framework for an AI persona.

## Research Notes (6 Dimensions)

### 01 著作与系统思考
{d01}

### 02 对话与即兴思考
{d02}

### 03 表达DNA
{d03}

### 04 他者视角
{d04}

### 05 决策模式
{d05}

### 06 人生轨迹
{d06}

## Instructions

Produce a JSON object with EXACTLY this schema. Fill every field with specific, non-generic content about {name}.

{{
  "mental_models": [
    {{
      "name": "model name (3-5 words)",
      "description": "how {name} applies this lens — be specific",
      "signature_phrase": "a typical sentence {name} would say using this model",
      "limitation": "when this model fails {name} or creates blind spots"
    }}
  ],
  "decision_heuristics": [
    "concrete rule {name} uses when deciding — 5-8 items, specific"
  ],
  "expression_dna": {{
    "tone": "one or two words",
    "sentence_style": "short description of how they write/speak",
    "signature_phrases": ["phrase 1", "phrase 2", "phrase 3", "phrase 4"],
    "argument_structure": "how they typically open and build an argument",
    "humor_style": "description or null"
  }},
  "anti_patterns": [
    "what {name} would NEVER say or do — 4-6 items, specific and distinctive"
  ],
  "honest_boundaries": [
    "what this AI persona cannot reliably simulate about {name} — 3-5 items"
  ],
  "core_tensions": [
    "a genuine internal contradiction in {name}'s thinking — 2-3 items"
  ]
}}

Rules:
- 3-5 mental models (no more, no fewer)
- Every mental model MUST have a non-empty limitation field
- Return ONLY valid JSON. No markdown fences, no explanation, no commentary.
"""


def _synthesize_framework(name: str, dimension_notes: dict[str, str]) -> dict:
    """
    Phase 2-3: synthesize 6 dimension notes into a structured cognitive framework.
    Equivalent to nuwa Phases 2-3 (心智模型 + 表达DNA + 诚实边界).
    """
    prompt = _SYNTHESIS_PROMPT.format(
        name=name,
        d01=dimension_notes.get("01-writings", "(not available)"),
        d02=dimension_notes.get("02-conversations", "(not available)"),
        d03=dimension_notes.get("03-expression-dna", "(not available)"),
        d04=dimension_notes.get("04-external-views", "(not available)"),
        d05=dimension_notes.get("05-decisions", "(not available)"),
        d06=dimension_notes.get("06-timeline", "(not available)"),
    )

    resp = _llm().chat.completions.create(
        model=NEBIUS_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=1200,
    )
    raw = resp.choices[0].message.content.strip()

    # Strip markdown fences if LLM adds them anyway
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Best-effort partial extraction
        return {
            "mental_models": [],
            "decision_heuristics": [],
            "expression_dna": {"tone": "", "signature_phrases": [], "sentence_style": "", "argument_structure": ""},
            "anti_patterns": [],
            "honest_boundaries": [f"Full framework synthesis failed — raw output: {raw[:200]}"],
            "core_tensions": [],
            "_synthesis_error": raw[:500],
        }


# ── Phase 4: quality check (nuwa quality_check.py equivalent) ──────────────

def _quality_check(framework: dict, name: str) -> tuple[bool, list[str]]:
    """
    Simplified mirror of nuwa's quality_check.py.
    Returns (passed, list_of_issues).
    """
    issues: list[str] = []

    models = framework.get("mental_models", [])
    if not (3 <= len(models) <= 5):
        issues.append(f"mental_models: got {len(models)}, need 3-5")
    for m in models:
        if not m.get("limitation", "").strip():
            issues.append(f"mental model '{m.get('name')}' missing limitation")

    dna = framework.get("expression_dna", {})
    if len(dna.get("signature_phrases", [])) < 2:
        issues.append("expression_dna.signature_phrases: need ≥2")

    if len(framework.get("anti_patterns", [])) < 3:
        issues.append("anti_patterns: need ≥3")

    if len(framework.get("honest_boundaries", [])) < 3:
        issues.append("honest_boundaries: need ≥3")

    return len(issues) == 0, issues


# ── Chroma embedding ────────────────────────────────────────────────────────

def _embed(persona_id: str, persona_data: dict) -> int:
    import chromadb
    model = _get_embed_model()
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    collection = client.get_or_create_collection(f"persona_{persona_id}")
    existing_ids = set(collection.get()["ids"])

    docs, ids, metas = [], [], []

    for post in persona_data.get("x_posts", []):
        pid = f"tweet_{post['id']}"
        if pid not in existing_ids:
            docs.append(post["text"])
            ids.append(pid)
            metas.append({
                "type": "tweet",
                "date": str(post.get("date", post.get("created_at", ""))),
                "topics": ",".join(post.get("topics", [])),
                "likes": int(post.get("likes", post.get("metrics", {}).get("like_count", 0))),
            })

    wiki = persona_data.get("wikipedia", {})
    if wiki.get("summary") and "wiki_summary" not in existing_ids:
        docs.append(wiki["summary"])
        ids.append("wiki_summary")
        metas.append({"type": "wikipedia", "section": "summary"})

    # Also embed the cognitive framework text so it's RAG-retrievable
    framework = persona_data.get("cognitive_framework", {})
    if framework and "framework_summary" not in existing_ids:
        framework_text = _framework_to_text(framework, persona_data.get("display_name", ""))
        if framework_text:
            docs.append(framework_text)
            ids.append("framework_summary")
            metas.append({"type": "cognitive_framework", "section": "full"})

    if docs:
        embeddings = model.encode(docs).tolist()
        collection.add(documents=docs, ids=ids, metadatas=metas, embeddings=embeddings)

    return collection.count()


def _framework_to_text(framework: dict, name: str) -> str:
    """Flatten framework dict to plain text for embedding."""
    parts = [f"Cognitive framework of {name}:"]
    for m in framework.get("mental_models", []):
        parts.append(f"Mental model: {m.get('name')}: {m.get('description')}")
    for h in framework.get("decision_heuristics", []):
        parts.append(f"Decision rule: {h}")
    dna = framework.get("expression_dna", {})
    if dna.get("signature_phrases"):
        parts.append("Signature phrases: " + "; ".join(dna["signature_phrases"]))
    for a in framework.get("anti_patterns", []):
        parts.append(f"Anti-pattern: {a}")
    return "\n".join(parts)


# ── X posts loading ─────────────────────────────────────────────────────────

def _load_x_posts(persona_id: str, x_handle: str) -> list[dict]:
    """Load X posts for a persona.

    Priority:
      1. Live X API if X_API_MODE=live and x_handle is set.
      2. Local pre-fetched JSON at data/personas/raw/{persona_id}_tweets.json.
      3. Empty list (graceful fallback).
    """
    mode = os.getenv("X_API_MODE", "mock").lower()
    max_results = int(os.getenv("X_POSTS_MAX_RESULTS", "30"))
    handle = x_handle.lstrip("@") if x_handle else ""

    if mode == "live" and handle:
        try:
            from actions.services.x_client import XClient

            async def _fetch() -> list[dict]:
                client = XClient()
                bundle = await client.fetch_creator_posts_by_handle(
                    handle=handle, max_results=max_results
                )
                username = bundle["profile"]["username"]
                posts = []
                for post in bundle.get("posts", []):
                    metrics = post.get("public_metrics", {}) or {}
                    post_id = post.get("id")
                    posts.append({
                        "id": post_id,
                        "text": post.get("text", ""),
                        "created_at": post.get("created_at"),
                        "lang": post.get("lang"),
                        "url": f"https://x.com/{username}/status/{post_id}" if post_id else None,
                        "metrics": {
                            "like_count": metrics.get("like_count", 0),
                            "reply_count": metrics.get("reply_count", 0),
                            "retweet_count": metrics.get("retweet_count", 0),
                            "quote_count": metrics.get("quote_count", 0),
                        },
                        "source": "x_api_v2",
                    })
                return posts

            posts = asyncio.run(_fetch())
            print(f"[distill] Fetched {len(posts)} live X posts for @{handle}")
            return posts
        except Exception as e:
            print(f"[distill] Live X fetch failed for @{handle}: {e} — trying local file")

    local_path = Path(f"data/personas/raw/{persona_id}_tweets.json")
    if local_path.exists():
        try:
            posts = json.loads(local_path.read_text())
            print(f"[distill] Loaded {len(posts)} X posts from {local_path}")
            return posts
        except Exception as e:
            print(f"[distill] Failed to load {local_path}: {e}")

    print(f"[distill] No X posts available for {persona_id}")
    return []


# ── Briefing generation ─────────────────────────────────────────────────────

def _generate_briefing(persona_data: dict) -> str:
    """Short ~100-word briefing of current focus. Falls back gracefully."""
    nebius_key = os.getenv("NEBIUS_API_KEY", "")
    if not nebius_key:
        return _fallback_briefing(persona_data)
    try:
        from actions.worker.briefing_generator import generate_briefing
        # Provide wiki summary as synthetic post if no X posts
        if not persona_data.get("x_posts"):
            summary = persona_data.get("wikipedia", {}).get("summary", "")
            if summary:
                persona_data = {**persona_data, "x_posts": [{"text": summary, "id": "wiki_seed"}]}
        return generate_briefing(persona_data)
    except Exception:
        return _fallback_briefing(persona_data)


def _fallback_briefing(persona_data: dict) -> str:
    name = persona_data.get("display_name", "this expert")
    summary = persona_data.get("wikipedia", {}).get("summary", "")
    if summary:
        return summary[:200].rstrip() + ("…" if len(summary) > 200 else "")
    return f"Expert profile for {name} has been added to your team."


# ── Main entry point ────────────────────────────────────────────────────────

def distill_expert(
    display_name: str,
    x_handle: str = "",
    wikipedia_url: str = "",
) -> dict:
    """
    女娲蒸馏完整流程 (Method B):

    Phase 1   → fetch Wikipedia
    Phase 1.5 → 6-dimension parallel LLM research (nuwa agent swarm)
    Phase 2-3 → synthesis → cognitive_framework JSON
    Phase 4   → quality check
    Finalize  → Chroma embed + briefing + persist

    Returns API-ready dict (same shape as list_personas_for_api entries).
    Raises ValueError if expert already exists.
    """
    from actions.persona_store import load_persona_configs

    persona_id = make_persona_id(display_name)
    configs = load_persona_configs()

    if any(p["id"] == persona_id for p in configs):
        raise ValueError(f"Expert '{display_name}' already exists (id={persona_id})")

    color = _pick_avatar_color(configs)
    initials = "".join(w[0].upper() for w in display_name.split()[:2])

    # ── Phase 1: knowledge gathering ────────────────────────────────────────
    persona_data: dict = {
        "id": persona_id,
        "display_name": display_name,
        "handle": x_handle,
        "description": "",
        "wikipedia_url": wikipedia_url,
        "rime_voice_id": "",
        "personality_traits": [],
        "speaking_style": "",
        "x_posts": [],
    }

    wiki_summary = ""
    if wikipedia_url:
        try:
            persona_data["wikipedia"] = _fetch_wikipedia(wikipedia_url)
            wiki_summary = persona_data["wikipedia"].get("summary", "")
        except Exception:
            persona_data["wikipedia"] = {"summary": "", "key_facts": [], "last_fetched": _utc_now()}
    else:
        persona_data["wikipedia"] = {"summary": "", "key_facts": [], "last_fetched": _utc_now()}

    # Load X posts (live API or local pre-fetched file)
    persona_data["x_posts"] = _load_x_posts(persona_id, x_handle)

    # Build source text for dimension research (Wikipedia is the main source)
    source_text = wiki_summary or f"No Wikipedia text available. Use your knowledge about {display_name}."

    # ── Phase 1.5: 6-dimension parallel research ─────────────────────────────
    framework: dict = {}
    if NEBIUS_API_KEY:
        try:
            dimension_notes = _run_all_dimensions(display_name, source_text)

            # ── Phase 2-3: synthesis ─────────────────────────────────────────
            framework = _synthesize_framework(display_name, dimension_notes)

            # ── Phase 4: quality check ───────────────────────────────────────
            passed, issues = _quality_check(framework, display_name)
            if not passed:
                # Annotate but don't block — hackathon tolerance
                framework["_quality_issues"] = issues

            # Store dimension research notes for traceability
            framework["_dimension_notes"] = dimension_notes
            framework["generated_at"] = _utc_now()

        except Exception as e:
            framework = {"_synthesis_error": str(e), "generated_at": _utc_now()}

    persona_data["cognitive_framework"] = framework

    # Update personality_traits and speaking_style from framework
    if framework.get("mental_models"):
        persona_data["personality_traits"] = [
            m["name"] for m in framework["mental_models"][:3]
        ]
    dna = framework.get("expression_dna", {})
    if dna.get("tone"):
        persona_data["speaking_style"] = (
            f"{dna.get('tone', '')}. {dna.get('sentence_style', '')}".strip(". ")
        )

    # ── Finalize: embed + briefing + persist ────────────────────────────────
    doc_count = _embed(persona_id, persona_data)

    briefing_text = _generate_briefing(persona_data)
    generated_at = _utc_now()
    persona_data["briefing"] = {
        "text": briefing_text,
        "generated_at": generated_at,
        "source_post_count": doc_count,
    }

    # Persist persona JSON
    PERSONAS_DATA_DIR.mkdir(parents=True, exist_ok=True)
    (PERSONAS_DATA_DIR / f"{persona_id}.json").write_text(
        json.dumps(persona_data, ensure_ascii=False, indent=2)
    )

    # Append to config.yml
    cfg = {
        "id": persona_id,
        "display_name": display_name,
        "x_handle": x_handle or f"@{persona_id}",
        "x_posts_file": f"data/personas/raw/{persona_id}_tweets.json",
        "wikipedia_url": wikipedia_url,
        "rime_voice_id": "",
        "avatar_color": color,
        "initials": initials,
    }
    configs.append(cfg)
    PERSONA_CONFIG.write_text(
        yaml.dump({"personas": configs}, allow_unicode=True, default_flow_style=False, sort_keys=False)
    )

    return {
        "id": persona_id,
        "display_name": display_name,
        "x_handle": x_handle,
        "x_source": x_handle or f"@{persona_id}",
        "wikipedia": wikipedia_url,
        "avatar_color": color,
        "initials": initials,
        "rime_voice_id": "",
        "briefing": briefing_text,
        "last_updated": generated_at,
        "subtitle": dna.get("tone", "") if framework else "",
    }
