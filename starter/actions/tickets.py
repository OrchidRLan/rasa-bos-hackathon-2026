"""Tiny JSON-backed ticket store.

This is deliberately a flat file (.data/tickets.json) so the coworker "remembers"
tickets across restarts and sessions — a lightweight stand-in for the persistent
memory the hackathon is about. Swap this for Postgres/Redis/your CRM for real.
"""

from __future__ import annotations

import json
import random
import string
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

STORE = Path(".data/tickets.json")


def load_tickets() -> Dict[str, Dict[str, Any]]:
    if not STORE.exists():
        return {}
    try:
        return json.loads(STORE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save_tickets(tickets: Dict[str, Dict[str, Any]]) -> None:
    STORE.parent.mkdir(parents=True, exist_ok=True)
    STORE.write_text(json.dumps(tickets, indent=2), encoding="utf-8")


def new_ticket_id(existing: Dict[str, Dict[str, Any]]) -> str:
    while True:
        tid = "TCK-" + "".join(random.choices(string.digits, k=4))
        if tid not in existing:
            return tid


def normalise_ticket_id(raw: str | None) -> str:
    """Accept 'TCK-1234', 'tck 1234', or bare '1234' and return canonical form."""
    cleaned = (raw or "").strip().upper().replace(" ", "")
    if cleaned.startswith("TCK-"):
        return cleaned
    if cleaned.startswith("TCK"):
        cleaned = cleaned[3:]
    if cleaned.isdigit():
        return f"TCK-{cleaned}"
    return cleaned


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()
