#!/usr/bin/env python3
"""Pre-flight diagnostics for the AI Coworker starter.

Checks, in order:
  - Python version (3.10 / 3.11)
  - API keys (.env)
  - Python dependencies
  - Project config files
  - Demo audio files
  - External service connectivity (Speechmatics, Rime, Nebius)
  - Running services at demo time (Rasa, action server, MCP)

Run:  make verify     (or: python scripts/verify_setup.py)
"""

from __future__ import annotations

import asyncio
import importlib.util
import os
import sys
from glob import glob
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

GREEN, YELLOW, RED, BLUE, MAGENTA, BOLD, DIM, RESET = (
    "\033[92m", "\033[93m", "\033[91m", "\033[94m", "\033[95m", "\033[1m", "\033[2m", "\033[0m"
)


def ok(m: str) -> None:   print(f"{GREEN}  \u2713  {m}{RESET}")
def warn(m: str) -> None: print(f"{YELLOW}  \u26a0  {m}{RESET}")
def fail(m: str) -> None: print(f"{RED}  \u2717  {m}{RESET}")
def hint(m: str) -> None: print(f"{DIM}       \u2192 {m}{RESET}")
def info(m: str) -> None: print(f"{BLUE}  \u2139  {m}{RESET}")


def section(t: str) -> None:
    print(f"\n{BLUE}{BOLD}{'-' * 60}{RESET}")
    print(f"{BLUE}{BOLD}  {t}{RESET}")
    print(f"{BLUE}{BOLD}{'-' * 60}{RESET}")


# ── checks ────────────────────────────────────────────────────────────────────

def check_python() -> bool:
    v = sys.version_info
    if v.major == 3 and v.minor in (10, 11):
        ok(f"Python {v.major}.{v.minor}.{v.micro}")
        return True
    fail(f"Python {v.major}.{v.minor} — requires 3.10 or 3.11 (Rasa constraint)")
    hint("pyenv install 3.11 && pyenv local 3.11")
    return False


def check_key(name: str, label: str) -> bool:
    val = os.getenv(name, "").strip()
    if val and not val.lower().startswith("your-"):
        masked = f"{val[:4]}...{val[-4:]}" if len(val) > 8 else "***"
        ok(f"{label}  {DIM}({name}={masked}){RESET}")
        return True
    fail(f"{label} not set  ({name})")
    hint(f"Add {name}=... to your .env file (copy from .env.example)")
    return False


def check_module(module: str, label: str, required: bool = True) -> bool:
    if importlib.util.find_spec(module) is not None:
        ok(label)
        return True
    if required:
        fail(f"{label}  ({module}) not installed")
        hint("Run: make install")
    else:
        warn(f"{label}  ({module}) not installed — optional")
    return not required


def check_file(path: str) -> bool:
    if Path(path).exists():
        ok(path)
        return True
    fail(f"{path} not found")
    return False


def check_audio() -> bool:
    clips = sorted(glob("voice/audio/user_*.wav"))
    if clips:
        ok(f"Demo audio present  {DIM}({len(clips)} clips in voice/audio/){RESET}")
        return True
    warn("No demo audio yet (voice loop needs it; text mode does not)")
    hint("Run: make generate-audio")
    return False


async def _post(session, name, url, ok_status_max=200, **kw):
    import aiohttp
    try:
        async with session.post(url, timeout=aiohttp.ClientTimeout(total=20), **kw) as r:
            if r.status == 200:
                ok(f"{name} reachable (key valid)")
                return True
            body = (await r.text())[:120]
            fail(f"{name} returned HTTP {r.status}")
            hint(body)
            return False
    except Exception as exc:  # noqa: BLE001
        fail(f"{name} unreachable: {exc}")
        return False


async def _get(session, name, url, warn_on_fail=False):
    import aiohttp
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as r:
            ok(f"{name} (HTTP {r.status})")
            return True
    except Exception:
        (warn if warn_on_fail else fail)(f"{name} not reachable")
        return not warn_on_fail


async def run() -> int:
    print(f"\n{BOLD}{BLUE}{'=' * 60}{RESET}")
    print(f"{BOLD}{BLUE}  \U0001F916  AI Coworker — Pre-flight Diagnostics{RESET}")
    print(f"{BOLD}{BLUE}{'=' * 60}{RESET}")

    errors = warnings = 0

    section("Python Environment")
    if not check_python():
        errors += 1

    section("API Keys (.env)")
    for n, l in [
        ("RASA_PRO_LICENSE", "Rasa Pro license"),
        ("NEBIUS_API_KEY", "Nebius Token Factory (LLM inference)"),
        ("SPEECHMATICS_API_KEY", "Speechmatics (ASR + TTS)"),
        ("RIME_API_KEY", "Rime (agent voice)"),
    ]:
        if not check_key(n, l):
            errors += 1

    section("Python Dependencies")
    core = [("rasa", "Rasa Pro"), ("rasa_sdk", "Rasa SDK"), ("aiohttp", "aiohttp"),
            ("dotenv", "python-dotenv"), ("rich", "rich"), ("speechmatics", "speechmatics-python")]
    for m, l in core:
        if not check_module(m, l):
            errors += 1
    for m, l in [("pydub", "pydub (audio playback)"), ("simpleaudio", "simpleaudio (audio playback)")]:
        if not check_module(m, l, required=False):
            warnings += 1
    check_module("fastmcp", "fastmcp (Level 2 only)", required=False)

    section("Project Files")
    files = ["config.yml", "endpoints.yml", "credentials.yml",
             "domain/shared.yml", "domain/support_triage.yml", "domain/ticket_status.yml",
             "data/flows/support_triage.yml", "data/flows/ticket_status.yml", ".env"]
    for f in files:
        if not check_file(f):
            errors += 1

    section("Demo Audio Files")
    if not check_audio():
        warnings += 1

    nebius = os.getenv("NEBIUS_API_KEY", "").strip()
    sm = os.getenv("SPEECHMATICS_API_KEY", "").strip()
    rime = os.getenv("RIME_API_KEY", "").strip()

    section("External Service Connectivity")
    import aiohttp
    async with aiohttp.ClientSession() as s:
        if sm:
            if not await _post(s, "Speechmatics TTS",
                               "https://preview.tts.speechmatics.com/generate/theo",
                               headers={"Authorization": f"Bearer {sm}"},
                               params={"output_format": "wav_16000"}, json={"text": "Test."}):
                errors += 1
        else:
            warn("Speechmatics: skipped (no key)")
        if rime:
            if not await _post(s, "Rime TTS", "https://users.rime.ai/v1/rime-tts",
                               headers={"Authorization": f"Bearer {rime}"},
                               json={"text": "Test.", "speaker": "cove", "modelId": "mistv2"}):
                errors += 1
        else:
            warn("Rime: skipped (no key)")
        if nebius:
            if not await _post(s, "Nebius Token Factory",
                               "https://api.tokenfactory.nebius.com/v1/chat/completions",
                               headers={"Authorization": f"Bearer {nebius}"},
                               json={"model": "Qwen/Qwen3-235B-A22B-Instruct-2507",
                                     "messages": [{"role": "user", "content": "ping"}],
                                     "max_tokens": 1}):
                errors += 1
                hint("If this fails, copy the exact model id/region from your "
                     "Nebius console into endpoints.yml")
        else:
            warn("Nebius: skipped (no key)")

        section("Running Services (start these at demo time)")
        if not await _get(s, "Rasa server :5005 (make run-rasa)", "http://localhost:5005/", warn_on_fail=True):
            warnings += 1
        if not await _get(s, "Action server :5055 (make run-actions)", "http://localhost:5055/health", warn_on_fail=True):
            warnings += 1
        if not await _get(s, "MCP tool server :8000 (Level 2, make run-mcp)", "http://localhost:8000/mcp", warn_on_fail=True):
            warnings += 1

    print(f"\n{BOLD}{'=' * 60}{RESET}")
    if errors == 0 and warnings == 0:
        print(f"{GREEN}{BOLD}\u2713  All checks passed — ready to demo!{RESET}")
    elif errors == 0:
        print(f"{YELLOW}{BOLD}\u26a0  Ready, with {warnings} warning(s) above.{RESET}")
        print(f"{YELLOW}  (Running-service warnings are expected before you start them.){RESET}")
    else:
        print(f"{RED}{BOLD}\u2717  {errors} error(s) — fix these first.{RESET}")
        if warnings:
            print(f"{YELLOW}  Plus {warnings} warning(s) above.{RESET}")
        print(f"\n  {BLUE}Common fixes:{RESET}")
        print(f"    {GREEN}cp .env.example .env{RESET}   then paste your keys")
        print(f"    {GREEN}make install{RESET}           install dependencies")

    print(f"\n  {MAGENTA}Then run (3 terminals):{RESET}")
    print(f"    {GREEN}make run-actions{RESET}   |   {GREEN}make run-rasa{RESET}   |   {GREEN}make demo{RESET}  (or make demo-text)\n")
    return 0 if errors == 0 else 1


def main() -> None:
    sys.exit(asyncio.run(run()))


if __name__ == "__main__":
    main()
