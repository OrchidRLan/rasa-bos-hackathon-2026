"""
Always-On background worker — runs inside the action server process.

Schedule: every WORKER_INTERVAL_HOURS (default 6h).
On each run:
  1. Re-reads each persona's x_posts JSON for new content
  2. Incremental embed of new posts into Chroma
  3. Re-generates briefing via LLM
  4. Updates .data/personas/{id}.json and worker_state.json

Startup: call start_scheduler() from actions/__init__.py when the action
server boots (Rasa SDK calls __init__.py on startup via the actions module).
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

import chromadb
from apscheduler.schedulers.background import BackgroundScheduler
from sentence_transformers import SentenceTransformer

from actions.persona_store import load_persona_configs
from actions.worker.briefing_generator import generate_briefing

logger = logging.getLogger(__name__)

DATA_DIR = Path(os.getenv("DATA_DIR", ".data"))
CHROMA_DIR = DATA_DIR / "chroma_db"
PERSONAS_DATA_DIR = DATA_DIR / "personas"
WORKER_STATE = DATA_DIR / "worker_state.json"
INTERVAL_HOURS = int(os.getenv("WORKER_INTERVAL_HOURS", "6"))

_scheduler: BackgroundScheduler | None = None
_embed_model: SentenceTransformer | None = None


def _get_embed_model() -> SentenceTransformer:
    global _embed_model
    if _embed_model is None:
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embed_model


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_persona_data(persona_id: str) -> dict | None:
    path = PERSONAS_DATA_DIR / f"{persona_id}.json"
    return json.loads(path.read_text()) if path.exists() else None


def _save_persona_data(persona_id: str, data: dict) -> None:
    PERSONAS_DATA_DIR.mkdir(parents=True, exist_ok=True)
    (PERSONAS_DATA_DIR / f"{persona_id}.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2)
    )


def _embed_persona(persona_id: str, persona_data: dict) -> int:
    """Embed all posts + Wikipedia into Chroma. Returns total doc count."""
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    collection = client.get_or_create_collection(f"persona_{persona_id}")
    model = _get_embed_model()

    existing_ids = set(collection.get()["ids"])
    docs, ids, metas = [], [], []

    for post in persona_data.get("x_posts", []):
        pid = f"tweet_{post['id']}"
        if pid not in existing_ids:
            docs.append(post["text"])
            ids.append(pid)
            metas.append({
                "type": "tweet",
                "date": post.get("date", ""),
                "topics": ",".join(post.get("topics", [])),
                "likes": post.get("likes", 0),
            })

    wiki = persona_data.get("wikipedia", {})
    wiki_summary = wiki.get("summary", "")
    if wiki_summary and "wiki_summary" not in existing_ids:
        docs.append(wiki_summary)
        ids.append("wiki_summary")
        metas.append({"type": "wikipedia", "section": "summary"})

    for fact in wiki.get("key_facts", []):
        fid = f"wiki_fact_{hash(fact) & 0xFFFFFF}"
        if fid not in existing_ids:
            docs.append(fact)
            ids.append(fid)
            metas.append({"type": "wikipedia", "section": "key_fact"})

    if docs:
        embeddings = model.encode(docs).tolist()
        collection.add(documents=docs, ids=ids, metadatas=metas, embeddings=embeddings)
        logger.info("  [%s] embedded %d new docs", persona_id, len(docs))

    return collection.count()


def run_refresh(persona_id: str | None = None) -> None:
    """Run one refresh cycle. Called by scheduler and /worker/trigger."""
    configs = load_persona_configs()
    if persona_id:
        configs = [c for c in configs if c["id"] == persona_id]

    state: dict = json.loads(WORKER_STATE.read_text()) if WORKER_STATE.exists() else {}
    if "personas" not in state:
        state["personas"] = {}

    for cfg in configs:
        pid = cfg["id"]
        logger.info("Worker: refreshing %s", pid)
        data = _load_persona_data(pid)
        if data is None:
            logger.warning("  %s not seeded yet, skipping", pid)
            continue
        try:
            doc_count = _embed_persona(pid, data)
            briefing_text = generate_briefing(data)
            data["briefing"] = {
                "text": briefing_text,
                "generated_at": _utc_now(),
                "source_post_count": doc_count,
            }
            _save_persona_data(pid, data)
            state["personas"][pid] = {
                "embed_status": "ok",
                "last_embed_at": _utc_now(),
                "doc_count": doc_count,
                "last_briefing_at": _utc_now(),
            }
        except Exception as exc:
            logger.exception("Worker error for %s: %s", pid, exc)
            state["personas"][pid] = {"embed_status": "error", "error": str(exc)}

    state["last_full_run"] = _utc_now()
    state["interval_hours"] = INTERVAL_HOURS
    WORKER_STATE.parent.mkdir(parents=True, exist_ok=True)
    WORKER_STATE.write_text(json.dumps(state, indent=2))


def start_scheduler() -> None:
    """Start the background scheduler. Call once at action server startup."""
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(run_refresh, "interval", hours=INTERVAL_HOURS, id="persona_refresh")
    _scheduler.start()
    logger.info("Always-On worker started (interval: %dh)", INTERVAL_HOURS)
