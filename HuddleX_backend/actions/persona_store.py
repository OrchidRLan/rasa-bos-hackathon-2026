"""Load persona configs and seeded data from disk."""

from __future__ import annotations

import json
import os
from pathlib import Path

import yaml

PERSONA_CONFIG = Path(os.getenv("PERSONA_CONFIG", "data/personas/config.yml"))
DATA_DIR = Path(os.getenv("DATA_DIR", ".data"))
PERSONAS_DATA_DIR = DATA_DIR / "personas"


def load_persona_configs() -> list[dict]:
    """Return the list from data/personas/config.yml."""
    return yaml.safe_load(PERSONA_CONFIG.read_text()).get("personas", [])


def get_persona_config(persona_id: str) -> dict | None:
    for p in load_persona_configs():
        if p["id"] == persona_id:
            return p
    return None


def load_persona_data(persona_id: str) -> dict | None:
    """Return seeded persona JSON from .data/personas/{id}.json (written by seed_personas.py)."""
    path = PERSONAS_DATA_DIR / f"{persona_id}.json"
    if path.exists():
        return json.loads(path.read_text())
    return None


def list_personas_for_api() -> list[dict]:
    """Build the response payload for GET /api/experts (ExpertsLibrary)."""
    configs = load_persona_configs()
    result = []
    for cfg in configs:
        data = load_persona_data(cfg["id"]) or {}
        result.append({
            "id": cfg["id"],
            "display_name": cfg["display_name"],
            "x_handle": cfg["x_handle"],
            "x_source": cfg["x_handle"],                  # ExpertsLibrary: "X Source"
            "wikipedia": cfg["wikipedia_url"],             # ExpertsLibrary: "Wikipedia"
            "avatar_color": cfg.get("avatar_color", "from-slate-600 to-slate-800"),
            "initials": cfg.get("initials", cfg["display_name"][:2].upper()),
            "rime_voice_id": cfg.get("rime_voice_id", ""),
            "briefing": data.get("briefing", {}).get("text", ""),
            "last_updated": data.get("briefing", {}).get("generated_at", "—"),
            "subtitle": data.get("description", ""),
        })
    return result
