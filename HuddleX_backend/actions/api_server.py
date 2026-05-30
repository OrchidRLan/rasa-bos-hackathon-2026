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

from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from actions.services.email_client import SMTPEmailClient, EmailClientError
from actions.persona_store import list_personas_for_api, load_persona_data
from actions.distillation import distill_expert, make_persona_id
from actions.store import load_thread, load_user, save_user, list_threads

app = FastAPI(title="HuddleX API", version="0.1.0")

# Debug: tracks currently-open /api/transcript/ws sessions by session_id
_active_transcript_sessions: set[str] = set()

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


# ── Speech-to-text (Speechmatics real-time) ───────────────────────────────────

@app.websocket("/api/transcript/ws")
async def transcript_stream(websocket: WebSocket):
    """
    Bridges the browser's audio_chunk/audio_stop protocol to the Speechmatics
    real-time WebSocket API (wss://eu.rt.speechmatics.com/v2).

    Browser sends: audio_chunk events with base64-encoded pcm_s16le audio +
                   audio_stop to signal end of utterance.
    We forward:    raw PCM bytes to Speechmatics, relay AddPartialTranscript /
                   AddTranscript back to the browser as transcript.partial /
                   transcript.final events.
    """
    import asyncio
    import base64
    import websockets as _ws

    await websocket.accept()
    _session_id = websocket.query_params.get("session_id", "<unknown>")
    _active_transcript_sessions.add(_session_id)
    print(
        f"[transcript_ws] connected session={_session_id} "
        f"active_local={sorted(_active_transcript_sessions)}",
        flush=True,
    )

    api_key = os.getenv("SPEECHMATICS_API_KEY", "")
    language = os.getenv("SPEECHMATICS_LANGUAGE", "en")
    operating_point = os.getenv("SPEECHMATICS_OPERATING_POINT", "enhanced")

    if not api_key:
        await websocket.send_json({
            "type": "transcript.error",
            "error": "SPEECHMATICS_API_KEY not configured",
        })
        await websocket.close()
        return

    # sm_ws is opened lazily — only when the first audio_chunk arrives.
    # Opening it immediately on browser connect wastes quota if the user
    # toggles voice on/off without speaking.
    sm_ws = None
    relay_task = None
    recognition_started = False
    last_utterance_id = None
    last_seq_no = 0

    async def relay_sm_to_browser() -> None:
        try:
            async for message in sm_ws:
                if isinstance(message, bytes):
                    continue
                data = json.loads(message)
                msg_type = data.get("message")

                if msg_type == "AddPartialTranscript":
                    text = data.get("transcript", "").strip()
                    if text:
                        await websocket.send_json({
                            "type": "transcript.partial",
                            "utterance_id": last_utterance_id,
                            "text": text,
                            "is_final": False,
                        })
                elif msg_type == "AddTranscript":
                    text = data.get("transcript", "").strip()
                    if text:
                        await websocket.send_json({
                            "type": "transcript.final",
                            "utterance_id": last_utterance_id,
                            "text": text,
                            "is_final": True,
                        })
                elif msg_type == "EndOfTranscript":
                    break
                elif msg_type == "Error":
                    await websocket.send_json({
                        "type": "transcript.error",
                        "utterance_id": last_utterance_id,
                        "error": data.get("reason", "Speechmatics error"),
                    })
                    break
                # AudioAdded / RecognitionStarted acks are silently ignored
        except Exception as exc:
            print(f"[transcript_ws] relay error: {exc}", flush=True)

    try:
        while True:
            try:
                raw = await websocket.receive_text()
            except WebSocketDisconnect:
                break

            event = json.loads(raw)
            event_type = event.get("type")
            utterance_id = event.get("utterance_id")
            if utterance_id:
                last_utterance_id = utterance_id

            if event_type == "audio_chunk":
                # Open Speechmatics connection on the first audio chunk only.
                if sm_ws is None:
                    sm_ws = await _ws.connect(
                        "wss://eu.rt.speechmatics.com/v2",
                        extra_headers={"Authorization": f"Bearer {api_key}"},
                    )

                if not recognition_started:
                    sample_rate = int(event.get("sample_rate", 16000))
                    await sm_ws.send(json.dumps({
                        "message": "StartRecognition",
                        "audio_format": {
                            "type": "raw",
                            "encoding": "pcm_s16le",
                            "sample_rate": sample_rate,
                        },
                        "transcription_config": {
                            "language": language,
                            "operating_point": operating_point,
                            "enable_partials": True,
                            "max_delay": 2,
                        },
                    }))
                    resp = json.loads(await sm_ws.recv())
                    if resp.get("message") != "RecognitionStarted":
                        raise RuntimeError(
                            f"Speechmatics handshake failed: {resp.get('reason', resp)}"
                        )
                    recognition_started = True
                    relay_task = asyncio.create_task(relay_sm_to_browser())
                    print(
                        f"[transcript_ws] RecognitionStarted sample_rate={sample_rate}",
                        flush=True,
                    )

                audio_b64 = event.get("audio", "")
                if audio_b64:
                    await sm_ws.send(base64.b64decode(audio_b64))
                last_seq_no = event.get("seq", last_seq_no)

            elif event_type == "audio_stop":
                if recognition_started and sm_ws is not None:
                    await sm_ws.send(json.dumps({
                        "message": "EndOfStream",
                        "last_seq_no": last_seq_no,
                    }))
                    if relay_task:
                        await asyncio.wait_for(relay_task, timeout=10.0)
                break

    except Exception as exc:
        print(f"[transcript_ws] error: {exc}", flush=True)
        try:
            await websocket.send_json({
                "type": "transcript.error",
                "error": str(exc),
            })
        except Exception:
            pass

    finally:
        if relay_task and not relay_task.done():
            relay_task.cancel()
            try:
                await relay_task
            except asyncio.CancelledError:
                pass
        if sm_ws is not None:
            # Ensure Speechmatics session is cleanly terminated so quota is
            # released immediately, even if the browser closed without audio_stop.
            if recognition_started:
                try:
                    await sm_ws.send(json.dumps({
                        "message": "EndOfStream",
                        "last_seq_no": last_seq_no,
                    }))
                except Exception:
                    pass
            try:
                await sm_ws.close()
            except Exception:
                pass

    _active_transcript_sessions.discard(_session_id)
    print(
        f"[transcript_ws] disconnected session={_session_id} "
        f"active_local={sorted(_active_transcript_sessions)}",
        flush=True,
    )


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
