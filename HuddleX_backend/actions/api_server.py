"""
FastAPI REST server — run with: make run-api  (port 8080)

Frontend ↔ Backend mapping
──────────────────────────
GET  /api/experts              ExpertsLibrary       list all 5 persona cards
POST /api/experts/trigger-seed ExpertsLibrary       "+" button → trigger re-seed (dev only)
GET  /api/experts/{id}         ExpertsLibrary       single expert detail
GET  /api/user/{user_id}       UserInfoPanel        load user profile
PUT  /api/user/{user_id}       UserInfoPanel        update user profile
GET  /api/threads              TasksPanel           list all thread summaries
GET  /api/threads/{thread_id}  ChatPreview          full thread with message history
GET  /worker/health            (debug)              worker last-run status
POST /worker/trigger           (debug / demo)       manually kick the scheduler

All chat messages go through Rasa:
POST /webhooks/rest/webhook    VoiceCenter          main chat + persona switching
"""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv(Path(__file__).parent.parent / ".env")

from actions.persona_store import list_personas_for_api, load_persona_data
from actions.store import load_thread, load_user, save_user, list_threads

app = FastAPI(title="HuddleX API", version="0.1.0")

# Allow the Next.js frontend (any localhost port) during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(os.getenv("DATA_DIR", ".data"))
WORKER_STATE = DATA_DIR / "worker_state.json"


# ── Experts (personas) ─────────────────────────────────────────────────────────

@app.get("/api/experts")
def get_experts():
    """ExpertsLibrary: loads all persona cards with briefing and metadata."""
    return list_personas_for_api()


@app.get("/api/experts/{persona_id}")
def get_expert(persona_id: str):
    """ExpertsLibrary detail / VoiceCenter context."""
    data = load_persona_data(persona_id)
    if data is None:
        raise HTTPException(404, f"Persona '{persona_id}' not found or not seeded yet")
    return data


@app.post("/api/experts/trigger-seed")
def trigger_seed(persona_id: str | None = None):
    """Dev helper: kick seed_personas for one or all personas."""
    import subprocess, sys
    cmd = [sys.executable, "scripts/seed_personas.py"]
    if persona_id:
        cmd += ["--persona", persona_id]
    subprocess.Popen(cmd)
    return {"status": "seed job started", "persona_id": persona_id or "all"}


# ── User profile ───────────────────────────────────────────────────────────────

@app.get("/api/user/{user_id}")
def get_user(user_id: str):
    """UserInfoPanel: user profile, interests, global summary."""
    return load_user(user_id)


class UserContextUpdate(BaseModel):
    name: str = ""
    role: str = ""
    interests: list[str] = []
    raw_description: str = ""


@app.put("/api/user/{user_id}")
def update_user(user_id: str, body: UserContextUpdate):
    """UserInfoPanel: save edited user profile (non-chat path)."""
    user = load_user(user_id)
    ctx = user["user_context"]
    if body.name:
        ctx["name"] = body.name
    if body.role:
        ctx["role"] = body.role
    if body.interests:
        existing = set(ctx.get("interests", []))
        existing.update(body.interests)
        ctx["interests"] = list(existing)
    if body.raw_description:
        ctx["raw_description"] = body.raw_description
    from actions.store import _utc_now
    ctx["updated_at"] = _utc_now()
    user["user_context"] = ctx
    save_user(user)
    return user


# ── Threads ────────────────────────────────────────────────────────────────────

@app.get("/api/threads")
def get_threads():
    """TasksPanel: lightweight list of all conversation threads."""
    return list_threads()


@app.get("/api/threads/{thread_id}")
def get_thread(thread_id: str):
    """ChatPreview: full thread including message history."""
    return load_thread(thread_id)


# ── Speech-to-text (Speechmatics batch API) ───────────────────────────────────

_SM_BASE = "https://asr.api.speechmatics.com/v2"


@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    api_key = os.getenv("SPEECHMATICS_API_KEY", "")
    if not api_key:
        raise HTTPException(500, "SPEECHMATICS_API_KEY not configured")

    language = os.getenv("SPEECHMATICS_LANGUAGE", "en")
    operating_point = os.getenv("SPEECHMATICS_OPERATING_POINT", "enhanced")

    audio_data = await file.read()
    config_payload = json.dumps({
        "type": "transcription",
        "transcription_config": {
            "language": language,
            "operating_point": operating_point,
        },
    })
    headers = {"Authorization": f"Bearer {api_key}"}

    async with httpx.AsyncClient(timeout=90.0) as client:
        submit = await client.post(
            f"{_SM_BASE}/jobs/",
            headers=headers,
            files={
                "config": (None, config_payload, "application/json"),
                "data_file": (
                    file.filename or "audio.webm",
                    audio_data,
                    file.content_type or "audio/webm",
                ),
            },
        )
        if submit.status_code != 201:
            raise HTTPException(502, f"Speechmatics submit failed: {submit.text}")
        job_id = submit.json()["id"]

        for _ in range(60):
            await asyncio.sleep(1)
            poll = await client.get(f"{_SM_BASE}/jobs/{job_id}", headers=headers)
            status = poll.json()["job"]["status"]
            if status == "done":
                break
            if status in ("rejected", "deleted"):
                raise HTTPException(502, f"Speechmatics job {status}")
        else:
            raise HTTPException(504, "Speechmatics transcription timed out")

        tx = await client.get(
            f"{_SM_BASE}/jobs/{job_id}/transcript?format=json-v2",
            headers=headers,
        )
        results = tx.json().get("results", [])

    words = [
        r["alternatives"][0]["content"]
        for r in results
        if r.get("type") == "word" and r.get("alternatives")
    ]
    return {"transcript": " ".join(words)}


# ── Worker status ──────────────────────────────────────────────────────────────

@app.get("/worker/health")
def worker_health():
    """Debug: check last worker run per persona."""
    if WORKER_STATE.exists():
        return json.loads(WORKER_STATE.read_text())
    return {"status": "no state yet — run make seed-personas first"}


@app.post("/worker/trigger")
def worker_trigger(persona_id: str | None = None):
    """Debug / demo: manually trigger a worker refresh cycle."""
    try:
        from actions.worker.scheduler import run_refresh
        run_refresh(persona_id)
        return {"status": "triggered", "persona_id": persona_id or "all"}
    except Exception as e:
        raise HTTPException(500, str(e))
