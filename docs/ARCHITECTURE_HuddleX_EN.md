# ARCHITECTURE — HuddleX

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 15 + React 18)                          │
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐  ┌────────────────┐  │
│  │  ExpertsLibrary  │  │   ChatPanel      │  │UserInfo   │  │TasksPanel      │  │
│  │  + AddExpert     │  │ (main chat UI)   │  │Panel      │  │+ ChatPreview   │  │
│  │  Modal           │  │ ┌─────────────┐  │  │           │  │                │  │
│  │                  │  │ │VoiceCenter  │  │  │           │  │                │  │
│  │                  │  │ │(side panel) │  │  │           │  │                │  │
│  └────────┬─────────┘  │ └─────────────┘  │  └─────┬─────┘  └────────┬───────┘  │
│           │            └────────┬──────────┘        │                 │          │
└───────────┼─────────────────────┼────────────────────┼─────────────────┼──────────┘
            │  /api/*             │  /webhooks/*        │  /api/*         │
            │                    │                      │                 │
            ▼                    ▼                      ▼                 ▼
┌───────────────────────┐  ┌──────────────────────────────────────────────────────┐
│  FastAPI :8080        │  │  Rasa CALM :5005                                     │
│  (api_server.py)      │  │                                                      │
│                       │  │  Flows:                                              │
│  GET  /api/experts    │  │    switch_persona                                    │
│  POST /api/experts    │◄─│    update_user_preference                            │
│  GET  /api/experts/   │  │    general_chat (default)                            │
│       {id}            │  └──────────────────┬───────────────────────────────────┘
│  GET  /api/user/{id}  │                     │ calls actions
│  PUT  /api/user/{id}  │  ┌──────────────────▼───────────────────────────────────┐
│  GET  /api/threads    │  │  Action Server (Python :5055)                        │
│  GET  /api/threads/   │  │                                                      │
│       {id}            │  │  action_persona_chat    ← RAG + LLM + file context  │
│  GET  /api/x/creator/ │  │  action_switch_persona  ← slot update               │
│       {handle}        │  │  action_update_user_pref ← parse prefs              │
│  POST /api/files/     │  └──────────────────┬───────────────────────────────────┘
│       upload          │                     │
│  GET  /api/files      │      ┌──────────────▼────────────────────────────────┐  │
│  GET  /api/files/{id} │      │  Services                                     │  │
│  POST /api/transcribe │      │                                               │  │
│  POST /api/synthesize │      │  ChromaDB (.data/chroma_db/)                  │  │
│  POST /api/notif../   │      │    persona_{id}/                              │  │
│       email/send      │      │    → tweets + wiki + framework                │  │
│  GET  /worker/health  │      │                                               │  │
│  POST /worker/trigger │      │  Nebius LLM (OpenAI-compatible)              │  │
└───────────┬───────────┘      │    Qwen3-235B-A22B-Instruct-2507              │  │
            │                  │    (RAG chat + distillation ×7)              │  │
            │  persona_store   │                                               │  │
            │  distillation ──►│  Wikipedia REST API (distillation Phase 1)    │  │
            │  (Wiki+LLM×7     │    GET api.wikipedia.org/summary/{title}     │  │
            │   +Chroma embed) │                                               │  │
            │  store           │  X API (XClient)                             │  │
            │  file_service    │    fetch_creator_posts_by_handle             │  │
            └──────────────────│                                               │  │
                               │  ElevenLabs TTS (per-persona voice)          │  │
                               │    POST /v1/text-to-speech/{voice_id}        │  │
                               │                                               │  │
                               │  Speechmatics ASR (batch)                    │  │
                               │    submit job → poll → fetch transcript      │  │
                               └───────────────────────────────────────────────┘
                                               │
                            ┌──────────────────▼────────────────────────────┐
                            │  Always-On Worker (APScheduler)               │
                            │                                               │
                            │  every 6h:                                    │
                            │    re-fetch X posts (live or mock)            │
                            │    incremental embed → Chroma                 │
                            │    LLM → briefing.text (~100 words)           │
                            │    write .data/personas/{id}.json             │
                            │    update .data/worker_state.json             │
                            └───────────────────────────────────────────────┘
```

---

## Component Details

### 1. Frontend (Next.js 15 + React 18 + TypeScript + Tailwind CSS)

| Component | File | Responsibility |
|------|------|------|
| `ExpertsLibrary` | `components/dashboard/ExpertsLibrary.tsx` | Expert card list; the `+` button triggers distillation |
| `AddExpertModal` | `components/dashboard/AddExpertModal.tsx` | Nüwa distillation wizard: 3 steps, input → in progress → completed |
| `ChatPanel` | `components/dashboard/ChatPanel.tsx` | **Main chat interface**: thread sidebar, file upload, voice mode, and context metadata labels |
| `VoiceCenter` | `components/dashboard/VoiceCenter.tsx` | Side panel: expert-switching dropdown + voice mode toggle |
| `VoiceOrb` | `components/dashboard/VoiceOrb.tsx` | Voice-state visualization orb |
| `UserInfoPanel` | `components/dashboard/UserInfoPanel.tsx` | User profile display and editing |
| `TasksPanel` | `components/dashboard/TasksPanel.tsx` | List of all conversation threads |
| `ChatPreview` | `components/dashboard/ChatPreview.tsx` | Recent message preview, latest 40 messages |
| `GlowCard` | `components/ui/GlowCard.tsx` | Base UI component for glowing cards |
| `SectionTitle` | `components/ui/SectionTitle.tsx` | Section title component |
| `StatusPill` | `components/ui/StatusPill.tsx` | Status label component |

**Hooks:**

| Hook | File | Responsibility |
|------|------|------|
| `useVoiceInput` | `hooks/useVoiceInput.ts` | MediaRecorder + VAD, using AudioContext RMS silence detection, plus Speechmatics batch ASR |
| `useTTS` | `hooks/useTTS.ts` | ElevenLabs TTS: POST `/api/synthesize` → Blob → audio playback |
| `useTranscriptStream` | `hooks/useTranscriptStream.ts` | Rotating placeholder subtitles in the UI, used for demos |

**Proxy routes** (`next.config.ts`):
- `/api/*` → `localhost:8080` (FastAPI)
- `/webhooks/*` → `localhost:5005` (Rasa CALM)
- `/worker/*` → `localhost:8080` (Worker status)

---

### 2. ChatPanel — Main Chat Interface

`ChatPanel` is the current core chat component and integrates all interaction capabilities:

```
┌─────────────────────────────────────────────────────┐
│ Top Bar: [thread sidebar toggle] [expert dropdown]  │
│          [voice status badge]                       │
├────────────────┬────────────────────────────────────┤
│  Thread        │  Message bubble area                │
│  sidebar       │  ─ user bubble (right)              │
│  (collapsible) │  ─ assistant bubble (left)          │
│  ─ New Chat    │    └ context_meta labels:           │
│  ─ Thread list │      Brain: N chunks                │
│    double-click│      Users: team exchanges          │
│    to rename   │      UserCircle: profile loaded     │
│    hover to    │  ─ context loading animation        │
│    delete      │  ─ real-time transcript preview     │
│                │    in voice mode                    │
├────────────────┴────────────────────────────────────┤
│ Input Bar: [📎 attachment] [text input] [🎤 voice]   │
│            [send]                                   │
│  Attachment preview: file.pdf (12.3 KB) [×]          │
└─────────────────────────────────────────────────────┘
```

**File upload flow:**

```
User clicks 📎 → selects file → POST /api/files/upload
  → file_service.py:
      save_upload() → .data/uploads/{file_id}/
      extract_text() → .txt (PDF/DOCX/CSV/MD/TXT)
  → returns file_id
  → sendMessage(text, persona_id, file_ids=[file_id])
  → action_persona_chat injects the [UPLOADED FILES] block
```

---

### 3. FastAPI REST Server (api_server.py — port 8080)

| Endpoint | Module | Responsibility |
|------|------|------|
| `GET/POST /api/experts` | `persona_store`, `distillation` | Expert list / Nüwa distillation |
| `GET /api/experts/{id}` | `persona_store` | Single expert details |
| `GET/PUT /api/user/{id}` | `store` | Read/write user profile |
| `GET /api/threads[/{id}]` | `store` | Thread list / thread details |
| `GET /api/x/creator/{handle}` | `x_client` | Fetch X posts |
| `POST /api/files/upload` | `file_service` | File upload + text extraction |
| `GET /api/files[/{id}]` | `file_service` | File list / metadata |
| `POST /api/transcribe` | httpx → Speechmatics | Speech → text, batch processing |
| `POST /api/synthesize` | httpx → ElevenLabs | Text → speech, per-persona voice |
| `POST /api/notifications/email/send` | `email_client` | Send email via SMTP |
| `GET/POST /worker/*` | `worker/scheduler` | Worker status / manual trigger |

**New module:**

| Module | Responsibility |
|------|------|
| `services/file_service.py` | File upload storage, text extraction with pypdf / python-docx / pandas, and metadata JSON |

---

### 4. Voice Pipeline

#### ASR — Speech Recognition with Speechmatics Batch Mode

```
User speaks → MediaRecorder (webm/opus)
            → VAD: AudioContext + RMS silence detection
              (3s silence → automatically stop recording)
            → POST /api/transcribe {file: audio.webm}
            → Speechmatics batch API:
                1. POST /v2/jobs/ → job_id
                2. Poll GET /v2/jobs/{id} (max 30s)
                3. GET /v2/jobs/{id}/transcript?format=txt
            → { transcript: "..." }
            → submit(text)
```

#### TTS — Speech Synthesis with ElevenLabs, migrated from Rime

```
assistant reply → useTTS.speak(text, persona_id)
                → POST /api/synthesize {text, persona_id}
                → read config.yml: elevenlabs_voice_id (per-persona)
                → ElevenLabs POST /v1/text-to-speech/{voice_id}
                → return audio/mpeg Blob
                → URL.createObjectURL → new Audio().play()
```

**TTS-VAD coordination for echo suppression:**

```
isSpeaking=true  → cancelRecording()  (discard current recording to avoid echo)
isSpeaking=false → startRecording()   (automatically reopen microphone after TTS ends)
```

---

### 5. Nüwa Distillation Engine (distillation.py)

```
POST /api/experts  {display_name, x_handle, wikipedia_url}
        │
        ▼
Phase 1   _fetch_wikipedia()
        │   → Wikipedia REST API → wiki summary text
        ▼
Phase 1.5 _run_all_dimensions()          ← ThreadPoolExecutor(max_workers=6)
        │   6 parallel LLM calls:
        │     01-writings       writings and systematic thinking
        │     02-conversations  conversations and spontaneous thinking
        │     03-expression-dna expression DNA
        │     04-external-views external perspectives
        │     05-decisions      decision-making patterns
        │     06-timeline       life and career trajectory
        ▼
Phase 2-3 _synthesize_framework()
        │   → merge notes from 6 dimensions → LLM synthesis
        │   → cognitive_framework JSON:
        │       mental_models / decision_heuristics
        │       expression_dna / anti_patterns
        │       honest_boundaries / core_tensions
        ▼
Phase 4   _quality_check() + _embed()
        │   → validate field completeness
        │   → ChromaDB embedding (tweets + wiki + framework_summary)
        │   → append to config.yml
        │   → write to .data/personas/{id}.json
        ▼
Return Expert object, using the same format as GET /api/experts
```

---

### 6. Rasa CALM (port 5005)

| Flow | Trigger | Action |
|------|------|--------|
| `switch_persona` | UI `/switch_persona{...}` or voice command "switch to XXX" | `action_switch_persona` |
| `update_user_preference` | User self-introduction | `action_update_user_pref` |
| `general_chat` | Default fallback | `action_persona_chat` |

---

### 7. action_persona_chat — System Prompt Assembly

Each conversation dynamically assembles **7 blocks**, including the newly added TEAM INSIGHTS and UPLOADED FILES blocks:

```
[CONTEXT 1 — PERSONA DEFINITION]
  display_name + handle + traits + style + briefing

[COGNITIVE FRAMEWORK]            ← specific to distilled experts
  mental_models + heuristics + expression_dna + anti_patterns + tensions

[RETRIEVED KNOWLEDGE]            ← Chroma top-5 chunks, with query rewrite + distance gating
  tweets + wiki + framework_summary
  grounded=False → skip RAG and enter framework-only mode

[CONTEXT 2 — TEAM INSIGHTS]      ← latest 6 replies from other experts in the same thread
  [other_persona_id]: summary…

[CONTEXT 3 — USER PROFILE]
  name + role + interests + raw_description + global_summary

[THREAD HISTORY]                 ← latest 12 raw turns + rolling summary of evicted turns

[UPLOADED FILES]                 ← files uploaded in the current turn, max 4000 chars/file
  [Uploaded File] file_id / filename / content
```

**Query rewriting, newly added:**

```
follow-up: "What do you think about this?"
  → _rewrite_query(history_text, user_message)
  → LLM one-shot → "your view on [topic from previous context]"
  → rewritten query → Chroma.query()
```

**RAG relevance gating, newly added:**

```
Chroma returns top-5 chunks + L2 distances
  → filter out dist > MAX_DISTANCE (1.5)
  → if all chunks are filtered out → framework-only mode
     (do not refuse to answer; reason from the cognitive framework instead)
```

**Context metadata response, newly added:**

```python
custom={
    "grounded": True/False,
    "context": {
        "own_chunks": N,           # number of RAG chunks hit in this turn
        "other_expert_msgs": N,    # number of messages from other experts in the same thread
        "user_profile": bool,      # whether the user profile is loaded
    }
}
```

→ The frontend `ChatPanel` renders the context metadata labels under the assistant reply bubble.

---

### 8. ChromaDB (Local Persistence)

```
.data/chroma_db/
└── persona_{id}/
    ├── tweet_{post_id}      type=tweet
    ├── wiki_summary         type=wikipedia, section=summary
    └── framework_summary    type=cognitive_framework, section=full
                             ← newly added for distilled experts
```

---

### 9. File Service (file_service.py)

```
.data/uploads/
└── file_{hex12}/
    ├── {original_filename}  ← original file
    ├── extracted.txt        ← extracted plain text
    └── metadata.json        ← file_id, user_id, filename, size, created_at, …

Supported formats: .pdf (pypdf) / .docx (python-docx) / .csv (pandas → Markdown)
                   / .txt / .md (direct read)
```

---

### 10. Persona Configuration (data/personas/config.yml)

New fields added to each Persona, compared with the previous version:

| Field | Description |
|------|------|
| `elevenlabs_voice_id` | Independent ElevenLabs voice ID for each expert, migrated from `rime_voice_id` |
| `content_urls` | Additional article/blog URLs fetched during distillation |
| `youtube_video_ids` | Talk video IDs used for transcript fetching during distillation |

Current expert library includes **8 experts**: Elon Musk, Sam Altman, Paul Graham, Naval Ravikant, Jensen Huang, Donald J. Trump, Taylor Swift, and Katy Perry.

---

### 11. Always-On Worker (APScheduler)

```
On startup:
  scan config.yml → fully embed experts that have not been initialized

Every WORKER_INTERVAL_HOURS (default: 6h):
  for each persona:
    X_API_MODE=live  → fetch latest tweets (XClient)
    X_API_MODE=mock  → read data/personas/raw/{id}_tweets.json
    incrementally embed new content → Chroma
    LLM generates briefing (~100 words) → persona JSON
  update .data/worker_state.json
```

---

## Key Data Flows

### Nüwa Distillation Flow

```
User clicks "+" → enters Richard Feynman + Wikipedia URL
  → POST /api/experts
  → distillation.py Phase 1-4 (~35s)
  → write .data/personas/richard_feynman.json
  → append to data/personas/config.yml
  → return Expert object
  → frontend list updates immediately; user can start chatting directly
```

### RAG Conversation Flow with Query Rewrite + File Upload

```
User: "What do you think about the teaching style of quantum mechanics?" + attachment: lecture_notes.pdf
  → ChatPanel: POST /api/files/upload → file_id
  → POST /webhooks/rest/webhook {text, metadata: {persona_id, file_ids}}
  → action_persona_chat:
      search_query = _rewrite_query(history, user_message)
      docs, ids, dists = chroma["persona_..."].query(search_query, top_k=5)
      relevant = [d for d,i,dist in zip(...) if dist <= 1.5]
      if relevant:
          uploaded_ctx = build_uploaded_file_context(file_ids)
          prompt = [PERSONA DEF] + [COGNITIVE FW] + [RETRIEVED]
                 + [TEAM INSIGHTS] + [USER CTX] + [THREAD HIST] + [UPLOADED FILES]
          reply = Nebius LLM(prompt)
          grounded = True
      else:
          prompt = framework-only mode
          grounded = False
      → return {text, custom: {grounded, context: {own_chunks, …}}}
  → useTTS.speak(reply, persona_id) → ElevenLabs → playback
  → ChatPanel renders context metadata labels
```

### Full-Duplex Voice Flow

```
User speaks
  → useVoiceInput: MediaRecorder + VAD
  → 3s silence → stop → POST /api/transcribe → Speechmatics batch
  → transcript → submit(text) → sendMessage → Rasa → action_persona_chat
  → reply → useTTS.speak()
       ↓ isSpeaking=true → cancelRecording() (echo suppression)
       ↓ isSpeaking=false → startRecording() (automatically reopen microphone)
```

---

## Technology Stack Summary

| Layer | Technology | Version / Notes |
|----|------|---------|
| Frontend | Next.js + React + TypeScript | Next.js 15, React 18, Tailwind CSS |
| REST API | FastAPI + Pydantic | Python, port 8080 |
| Conversation engine | Rasa CALM | Rasa Pro, port 5005 |
| LLM inference | Nebius Token Factory | Qwen3-235B-A22B-Instruct-2507 |
| Vector database | ChromaDB | Local persistence |
| Embedding | sentence-transformers | all-MiniLM-L6-v2 |
| Distillation concurrency | Python ThreadPoolExecutor | max_workers=6, Phase 1.5 |
| Voice input | Speechmatics ASR, batch mode | Submit job → poll → fetch result; VAD driven by frontend AudioContext + RMS |
| Voice output | ElevenLabs TTS | Independent per-persona voice ID, replacing Rime |
| File service | pypdf + python-docx + pandas | PDF/DOCX/CSV/TXT/MD → extracted.txt |
| X data source | X API v2 | XClient, supports both live and mock modes |
| Background scheduling | APScheduler | Embedded inside the action server process |
| Python runtime | Python 3.11 | Dependencies managed with uv |
| Package management | uv (Python) + npm (frontend) | — |
