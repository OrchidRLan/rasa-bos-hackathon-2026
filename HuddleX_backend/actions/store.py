"""Shared helpers for reading/writing thread and user JSON files."""

from __future__ import annotations

import json
import os
from pathlib import Path
from datetime import datetime, timezone

DATA_DIR = Path(os.getenv("DATA_DIR", ".data"))
THREADS_DIR = DATA_DIR / "threads"
USERS_DIR = DATA_DIR / "users"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


# ── Thread helpers ─────────────────────────────────────────────────────────────

def load_thread(thread_id: str) -> dict:
    path = _ensure(THREADS_DIR) / f"{thread_id}.json"
    if path.exists():
        return json.loads(path.read_text())
    return {
        "thread_id": thread_id,
        "user_id": thread_id,
        "title": "",
        "created_at": _utc_now(),
        "last_active": _utc_now(),
        "active_persona_id": None,
        "personas_involved": [],
        "thread_history": [],
        # Rolling summary of turns that have scrolled out of the live window,
        # so long conversations retain early context without unbounded tokens.
        "thread_summary": "",
        "summarized_count": 0,   # how many of the oldest turns are folded into the summary
    }


def save_thread(thread: dict) -> None:
    thread["last_active"] = _utc_now()
    path = _ensure(THREADS_DIR) / f"{thread['thread_id']}.json"
    path.write_text(json.dumps(thread, ensure_ascii=False, indent=2))


def save_thread_summary(thread_id: str, summary: str, summarized_count: int) -> None:
    """Update only the rolling-summary fields, re-reading the thread first so we
    never clobber concurrently-appended history."""
    thread = load_thread(thread_id)
    thread["thread_summary"] = summary
    thread["summarized_count"] = summarized_count
    save_thread(thread)


def append_message(thread_id: str, persona_id: str | None, role: str, content: str,
                   retrieved_chunks: list[str] | None = None, voice_input: bool = False) -> None:
    thread = load_thread(thread_id)
    msg: dict = {
        "id": f"msg_{len(thread['thread_history']):04d}",
        "timestamp": _utc_now(),
        "persona_id": persona_id,
        "role": role,
        "content": content,
    }
    if retrieved_chunks:
        msg["retrieved_chunks"] = retrieved_chunks
    if voice_input:
        msg["voice_input"] = True
    thread["thread_history"].append(msg)
    if persona_id and persona_id not in thread["personas_involved"]:
        thread["personas_involved"].append(persona_id)
    save_thread(thread)


# ── User helpers ───────────────────────────────────────────────────────────────

def load_user(user_id: str) -> dict:
    path = _ensure(USERS_DIR) / f"{user_id}.json"
    if path.exists():
        return json.loads(path.read_text())
    return {
        "user_id": user_id,
        "created_at": _utc_now(),
        "user_context": {
            "name": "",
            "role": "",
            "interests": [],
            "raw_description": "",
            "updated_at": _utc_now(),
        },
        "threads": [],
        "global_summary": {
            "text": "",
            "generated_at": _utc_now(),
            "thread_count": 0,
        },
    }


def save_user(user: dict) -> None:
    path = _ensure(USERS_DIR) / f"{user['user_id']}.json"
    path.write_text(json.dumps(user, ensure_ascii=False, indent=2))


def list_threads() -> list[dict]:
    """Return lightweight thread index (no history body) for all threads."""
    _ensure(THREADS_DIR)
    result = []
    for f in sorted(THREADS_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        t = json.loads(f.read_text())
        result.append({
            "thread_id": t["thread_id"],
            "title": t.get("title", ""),
            "created_at": t.get("created_at", ""),
            "last_active": t.get("last_active", ""),
            "active_persona_id": t.get("active_persona_id"),
            "personas_involved": t.get("personas_involved", []),
            "message_count": len(t.get("thread_history", [])),
        })
    return result
