# 🤖 Always-On AI Coworker — Starter Template

A best-of-breed scaffold for the hackathon. It gives you a working **Rasa** coworker
with **voice** and **agentic** capabilities out of the box, so you can spend your time
on *your* idea instead of plumbing.

```
              ears                  brain                 voice
  user  --> Speechmatics ASR --> Rasa CALM (agent) --> Rime TTS --> user
                                      |
                                      +-- Nebius Token Factory (LLM inference)
                                      +-- MCP tools (your APIs)   [Level 2]
```

**Rasa is the brain.** Speechmatics is the ears, Rime is the voice, Nebius runs the
models. The voice client just calls Rasa's REST API, so the stack is fully swappable —
and there's no orchestration framework competing with Rasa.

## What you get

- **Two deterministic CALM flows** — `log_support_ticket` and `check_ticket_status`.
  Reliable, validated, won't hallucinate balances or facts.
- **Cross-session memory** — tickets persist to `.data/tickets.json`, so the coworker
  remembers them after a restart. (Point this at a real DB for production.)
- **A voice loop** — Speechmatics ASR + Rime agent voice, deterministic demo audio.
- **An optional agentic level** (`agentic/`) — a native Rasa **ReAct sub-agent** that
  uses **MCP tools** to research internal runbooks. No LangGraph.

## Prerequisites

- Python **3.10 or 3.11**
- [`uv`](https://github.com/astral-sh/uv)
- `ffmpeg` (for audio playback; the voice demo also has a `--text` fallback)
- API keys (free/trial tiers are fine for the hackathon): Rasa Pro license, Nebius,
  Speechmatics, Rime — see `.env.example`.

## Quickstart (Level 1 — flows + voice)

```bash
cp .env.example .env      # then paste your keys
make install
make verify               # full pre-flight: python, keys, deps, files, services
make train

# 3 terminals:
make run-actions          # tab 1
make run-rasa             # tab 2
make demo-text            # tab 3 — live chat (rich CLI, no audio needed)
```

Try: *"I need to open a support ticket."* → it walks you through the flow, logs a
ticket, and gives you a `TCK-####`. Then: *"What's the status of TCK-####?"*

### Add voice

```bash
make generate-audio       # pre-generate the scripted user clips (Speechmatics TTS)
make demo                 # live voice loop: ASR -> Rasa -> Rime, streamed in the CLI
```

Use `make demo --tts speechmatics` to hear the reply in a Speechmatics voice instead
of Rime. Prefer a **free, self-hosted** voice? Neuphonic's NeuTTS runs locally —
swap it into `voice/rime_service.py`: https://github.com/neuphonic/neutts

Both `make demo` and `make demo-text` are **live CLI runners** (like the heist demo): a `rich` view streams the transcript as colored bubbles with listening / transcribing / thinking / speaking spinners. `make verify` is a full heist-style pre-flight that checks your Python version, keys, dependencies, project files, demo audio, partner connectivity, and whether Rasa / the action server / the MCP server are up.

## Level up (Level 2 — agentic)

A native Rasa ReAct sub-agent + MCP tools. See [`agentic/README.md`](agentic/README.md).

```bash
make install-agentic
make train-agentic
make run-mcp              # tab 0   (then run-actions, run-rasa-agentic, demo-text)
```

Ask: *"How do I investigate wrong invoice totals?"* → the sub-agent searches the
runbooks, pulls the right one, and answers from it.

## Make it yours (ideas that map to the prizes)

- **Most Resilient Long-Term Agent** — back the ticket store with Postgres/Redis,
  add a tracker store in `endpoints.yml`, and keep context across long sessions.
- **Best Voice Coworker** — wire `voice/demo.py` to a live mic or a phone/meeting
  channel; tune Rime latency and Speechmatics endpointing.
- **Most Creative Enterprise Use Case** — replace the support flows + MCP tools with
  *your* workflow (onboarding, on-call triage, back-office ops...).

## Layout

```
config.yml / endpoints.yml / credentials.yml   Rasa configuration (Nebius wired in)
domain/        slots + responses
data/flows/    Level 1 flows
actions/       custom actions + the persistent ticket store
voice/         Speechmatics + Rime + the REST orchestrator
agentic/       Level 2: ReAct sub-agent + MCP tool server
scripts/       verify_setup.py
tests/e2e/     an end-to-end test (stubbed actions)
```

## Notes

- Model ids and regions on Nebius change. If a model fails, copy the exact id and
  base URL from your Token Factory console into `endpoints.yml`.
- `flow_retrieval` is off for speed; turn it on + add an embeddings model group once
  you have many flows.
