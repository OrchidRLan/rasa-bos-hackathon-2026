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
import os
from actions.services.x_client import XClient, XApiError
import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from actions.services.email_client import SMTPEmailClient, EmailClientError
from actions.persona_store import list_personas_for_api, load_persona_data
from actions.distillation import distill_expert, make_persona_id
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

@app.get("/api/x/creator/{handle}")
async def get_x_creator(handle: str, max_results: int = 20):
    try:
        client = XClient()
        data = await client.fetch_creator_posts_by_handle(
            handle=handle,
            max_results=max_results,
        )
        return data
    except XApiError as e:
        raise HTTPException(status_code=502, detail=str(e))
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


class AddExpertRequest(BaseModel):
    display_name: str
    x_handle: str = ""
    wikipedia_url: str = ""


@app.post("/api/experts")
def add_expert(body: AddExpertRequest):
    """
    女娲蒸馏: distill a new expert into the team.
    Fetches Wikipedia, embeds into Chroma, generates LLM briefing,
    and appends to config.yml.  Returns the new expert card.
    """
    if not body.display_name.strip():
        raise HTTPException(status_code=422, detail="display_name is required")

    persona_id = make_persona_id(body.display_name)
    from actions.persona_store import load_persona_configs
    if any(p["id"] == persona_id for p in load_persona_configs()):
        raise HTTPException(status_code=409, detail=f"Expert '{body.display_name}' already exists")

    try:
        expert = distill_expert(
            display_name=body.display_name.strip(),
            x_handle=body.x_handle.strip(),
            wikipedia_url=body.wikipedia_url.strip(),
        )
        return expert
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Distillation failed: {e}")


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





class EmailSendRequest(BaseModel):
    to: str
    subject: str
    body: str
    html: str | None = None


@app.post("/api/notifications/email/send")
async def send_email_notification(req: EmailSendRequest):
    try:
        client = SMTPEmailClient()
        result = client.send_email(
            to=req.to,
            subject=req.subject,
            body=req.body,
            html=req.html,
        )

        return result

    except EmailClientError as e:
        raise HTTPException(status_code=502, detail=str(e))


# ── Speech-to-text (Speechmatics) ─────────────────────────────────────────────

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """VoiceCenter: transcribe a .webm audio blob via Speechmatics batch API."""
    import httpx

    api_key = os.getenv("SPEECHMATICS_API_KEY", "")
    language = os.getenv("SPEECHMATICS_LANGUAGE", "en")
    operating_point = os.getenv("SPEECHMATICS_OPERATING_POINT", "enhanced")

    if not api_key:
        raise HTTPException(status_code=503, detail="SPEECHMATICS_API_KEY not configured")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    config = {
        "type": "transcription",
        "transcription_config": {
            "language": language,
            "operating_point": operating_point,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            # Submit job
            submit = await client.post(
                "https://asr.api.speechmatics.com/v2/jobs/",
                headers={"Authorization": f"Bearer {api_key}"},
                files={"data_file": (file.filename or "audio.webm", audio_bytes, "audio/webm")},
                data={"config": json.dumps(config)},
            )
            if submit.status_code not in (200, 201):
                raise HTTPException(status_code=502, detail=f"Speechmatics submit error: {submit.text}")

            job_id = submit.json()["id"]

            # Poll until done (max ~30s)
            import asyncio
            for _ in range(30):
                await asyncio.sleep(1)
                status_res = await client.get(
                    f"https://asr.api.speechmatics.com/v2/jobs/{job_id}",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                job = status_res.json().get("job", {})
                if job.get("status") == "done":
                    break
                if job.get("status") == "rejected":
                    raise HTTPException(status_code=502, detail="Speechmatics job rejected")

            # Fetch transcript
            transcript_res = await client.get(
                f"https://asr.api.speechmatics.com/v2/jobs/{job_id}/transcript",
                headers={"Authorization": f"Bearer {api_key}"},
                params={"format": "txt"},
            )
            if not transcript_res.is_success:
                raise HTTPException(status_code=502, detail="Failed to fetch transcript")

            return {"transcript": transcript_res.text.strip()}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))