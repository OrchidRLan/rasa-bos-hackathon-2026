"""Pre-flight checks for HuddleX backend. Run: make verify"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

G, Y, R, B, RESET = "\033[92m", "\033[93m", "\033[91m", "\033[94m", "\033[0m"


def ok(m):  print(f"{G}  ✓  {m}{RESET}")
def warn(m): print(f"{Y}  ⚠  {m}{RESET}")
def fail(m): print(f"{R}  ✗  {m}{RESET}")
def section(t): print(f"\n{B}{'─'*50}\n  {t}\n{'─'*50}{RESET}")


errors = 0

# ── Python version ─────────────────────────────────────────────────────────────
section("Python")
v = sys.version_info
if v.major == 3 and v.minor in (10, 11):
    ok(f"Python {v.major}.{v.minor}.{v.micro}")
else:
    fail(f"Python {v.major}.{v.minor} — requires 3.10 or 3.11")
    errors += 1

# ── API keys ───────────────────────────────────────────────────────────────────
section("API Keys")
for name, label in [
    ("RASA_PRO_LICENSE", "Rasa Pro license"),
    ("NEBIUS_API_KEY",   "Nebius Token Factory"),
    ("SPEECHMATICS_API_KEY", "Speechmatics ASR"),
    ("RIME_API_KEY",     "Rime TTS"),
]:
    val = os.getenv(name, "").strip()
    if val:
        ok(f"{label} ({name})")
    else:
        fail(f"{label} missing — set {name} in .env")
        errors += 1

# ── Dependencies ───────────────────────────────────────────────────────────────
section("Python Dependencies")
deps = [
    ("rasa", "rasa-pro"),
    ("rasa_sdk", "rasa-sdk"),
    ("chromadb", "chromadb"),
    ("sentence_transformers", "sentence-transformers"),
    ("openai", "openai"),
    ("fastapi", "fastapi"),
    ("apscheduler", "apscheduler"),
    ("httpx", "httpx"),
    ("yaml", "pyyaml"),
    ("dotenv", "python-dotenv"),
]
for mod, pkg in deps:
    try:
        __import__(mod)
        ok(pkg)
    except ImportError:
        fail(f"{pkg} not installed — run: make install")
        errors += 1

# ── Project files ──────────────────────────────────────────────────────────────
section("Project Files")
required = [
    "config.yml", "endpoints.yml", "credentials.yml",
    "domain/personas.yml",
    "data/flows/switch_persona.yml",
    "data/flows/general_chat.yml",
    "data/flows/update_user_pref.yml",
    "data/personas/config.yml",
    ".env",
]
for f in required:
    if Path(f).exists():
        ok(f)
    else:
        fail(f"{f} missing")
        errors += 1

# ── Seeded personas ────────────────────────────────────────────────────────────
section("Seeded Personas (.data/personas/)")
data_dir = Path(os.getenv("DATA_DIR", ".data")) / "personas"
if data_dir.exists() and list(data_dir.glob("*.json")):
    for p in sorted(data_dir.glob("*.json")):
        ok(p.name)
else:
    warn("No seeded personas found — run: make seed-personas")

# ── Chroma ─────────────────────────────────────────────────────────────────────
section("Chroma DB (.data/chroma_db/)")
chroma_dir = Path(os.getenv("DATA_DIR", ".data")) / "chroma_db"
if chroma_dir.exists():
    try:
        import chromadb
        client = chromadb.PersistentClient(path=str(chroma_dir))
        colls = client.list_collections()
        if colls:
            for c in colls:
                ok(f"collection: {c.name}")
        else:
            warn("Chroma exists but no collections — run: make seed-personas")
    except Exception as e:
        fail(f"Chroma error: {e}")
else:
    warn("Chroma DB not found — run: make seed-personas")

# ── Summary ────────────────────────────────────────────────────────────────────
print()
if errors:
    print(f"{R}  {errors} error(s) — fix before running.{RESET}")
    sys.exit(1)
else:
    ok("All checks passed — ready to run!")
