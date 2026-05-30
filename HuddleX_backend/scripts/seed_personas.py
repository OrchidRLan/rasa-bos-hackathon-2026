"""
Seed all personas: fetch Wikipedia, read pre-fetched X posts, embed into Chroma.

Usage:
  make seed-personas                    # seed all personas
  python scripts/seed_personas.py --persona elon_musk   # seed one
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx
import yaml
import chromadb
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger(__name__)

PERSONA_CONFIG = Path(os.getenv("PERSONA_CONFIG", "data/personas/config.yml"))
DATA_DIR = Path(os.getenv("DATA_DIR", ".data"))
CHROMA_DIR = DATA_DIR / "chroma_db"
PERSONAS_DATA_DIR = DATA_DIR / "personas"

EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def fetch_wikipedia(url: str) -> dict:
    """Fetch title + summary from the Wikipedia REST API."""
    title = url.rstrip("/").split("/wiki/")[-1]
    resp = httpx.get(WIKIPEDIA_API.format(title=title), timeout=10)
    resp.raise_for_status()
    data = resp.json()
    return {
        "summary": data.get("extract", ""),
        "key_facts": [],          # populated manually or left empty
        "last_fetched": _utc_now(),
    }


def load_x_posts(posts_file: str) -> list[dict]:
    """Load pre-fetched X posts from JSON file. Returns [] if not found."""
    path = Path(posts_file)
    if not path.exists():
        logger.warning("X posts file not found: %s — skipping tweets", posts_file)
        return []
    return json.loads(path.read_text())


def embed_persona(persona_id: str, persona_data: dict, model: SentenceTransformer) -> int:
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    collection = client.get_or_create_collection(f"persona_{persona_id}")

    existing_ids = set(collection.get()["ids"])
    docs, ids, metas = [], [], []

    for post in persona_data.get("x_posts", []):
        pid = f"tweet_{post['id']}"
        if pid not in existing_ids:
            docs.append(post["text"])
            ids.append(pid)
            metas.append({
                "type": "tweet",
                "date": post.get("date", ""),
                "topics": ",".join(post.get("topics", [])),
                "likes": post.get("likes", 0),
            })

    wiki = persona_data.get("wikipedia", {})
    if wiki.get("summary") and "wiki_summary" not in existing_ids:
        docs.append(wiki["summary"])
        ids.append("wiki_summary")
        metas.append({"type": "wikipedia", "section": "summary"})

    for fact in wiki.get("key_facts", []):
        fid = f"wiki_fact_{hash(fact) & 0xFFFFFF}"
        if fid not in existing_ids:
            docs.append(fact)
            ids.append(fid)
            metas.append({"type": "wikipedia", "section": "key_fact"})

    if docs:
        logger.info("  Embedding %d new docs...", len(docs))
        embeddings = model.encode(docs).tolist()
        collection.add(documents=docs, ids=ids, metadatas=metas, embeddings=embeddings)

    total = collection.count()
    logger.info("  Collection 'persona_%s': %d docs total", persona_id, total)
    return total


def seed_one(cfg: dict, model: SentenceTransformer) -> None:
    pid = cfg["id"]
    logger.info("Seeding %s (%s)...", cfg["display_name"], pid)

    # Build persona data dict
    persona_data: dict = {
        "id": pid,
        "display_name": cfg["display_name"],
        "handle": cfg["x_handle"],
        "description": "",
        "wikipedia_url": cfg["wikipedia_url"],
        "rime_voice_id": cfg.get("rime_voice_id", ""),
        "avatar_path": f"public/avatars/{pid}.jpg",
        "personality_traits": [],
        "speaking_style": "",
    }

    # Fetch Wikipedia
    logger.info("  Fetching Wikipedia: %s", cfg["wikipedia_url"])
    try:
        persona_data["wikipedia"] = fetch_wikipedia(cfg["wikipedia_url"])
        logger.info("  Wikipedia OK (%d chars)", len(persona_data["wikipedia"]["summary"]))
    except Exception as e:
        logger.warning("  Wikipedia fetch failed: %s", e)
        persona_data["wikipedia"] = {"summary": "", "key_facts": [], "last_fetched": _utc_now()}

    # Load X posts
    persona_data["x_posts"] = load_x_posts(cfg["x_posts_file"])
    logger.info("  X posts loaded: %d", len(persona_data["x_posts"]))

    # Embed into Chroma
    doc_count = embed_persona(pid, persona_data, model)

    # Generate initial briefing (skip if no Nebius key yet)
    nebius_key = os.getenv("NEBIUS_API_KEY", "")
    if nebius_key:
        from actions.worker.briefing_generator import generate_briefing
        briefing_text = generate_briefing(persona_data)
        logger.info("  Briefing generated (%d chars)", len(briefing_text))
    else:
        briefing_text = f"Knowledge base seeded for {cfg['display_name']}."
        logger.warning("  NEBIUS_API_KEY not set — skipping briefing generation")

    persona_data["briefing"] = {
        "text": briefing_text,
        "generated_at": _utc_now(),
        "source_post_count": doc_count,
    }

    # Save to .data/personas/{id}.json
    PERSONAS_DATA_DIR.mkdir(parents=True, exist_ok=True)
    out = PERSONAS_DATA_DIR / f"{pid}.json"
    out.write_text(json.dumps(persona_data, ensure_ascii=False, indent=2))
    logger.info("  Saved → %s", out)


def seed_one_no_embed(cfg: dict) -> None:
    """Seed a persona with Wikipedia only — no embedding model required."""
    pid = cfg["id"]
    logger.info("Seeding %s (no-embed mode)...", cfg["display_name"])

    persona_data: dict = {
        "id": pid,
        "display_name": cfg["display_name"],
        "handle": cfg["x_handle"],
        "description": "",
        "wikipedia_url": cfg["wikipedia_url"],
        "rime_voice_id": cfg.get("rime_voice_id", ""),
        "avatar_path": f"public/avatars/{pid}.jpg",
        "personality_traits": [],
        "speaking_style": "",
        "x_posts": [],
    }

    logger.info("  Fetching Wikipedia: %s", cfg["wikipedia_url"])
    try:
        persona_data["wikipedia"] = fetch_wikipedia(cfg["wikipedia_url"])
        logger.info("  Wikipedia OK (%d chars)", len(persona_data["wikipedia"]["summary"]))
    except Exception as e:
        logger.warning("  Wikipedia fetch failed: %s", e)
        persona_data["wikipedia"] = {"summary": "", "key_facts": [], "last_fetched": _utc_now()}

    nebius_key = os.getenv("NEBIUS_API_KEY", "")
    if nebius_key:
        from actions.worker.briefing_generator import generate_briefing
        briefing_text = generate_briefing(persona_data)
        logger.info("  Briefing generated (%d chars)", len(briefing_text))
    else:
        briefing_text = f"Knowledge base seeded for {cfg['display_name']}."

    persona_data["briefing"] = {
        "text": briefing_text,
        "generated_at": _utc_now(),
        "source_post_count": 0,
    }

    PERSONAS_DATA_DIR.mkdir(parents=True, exist_ok=True)
    out = PERSONAS_DATA_DIR / f"{pid}.json"
    out.write_text(json.dumps(persona_data, ensure_ascii=False, indent=2))
    logger.info("  Saved → %s", out)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--persona", help="Seed a single persona id (default: all)")
    parser.add_argument("--skip-embed", action="store_true",
                        help="Skip embedding model — Wikipedia only, no Chroma RAG")
    args = parser.parse_args()

    configs = yaml.safe_load(PERSONA_CONFIG.read_text()).get("personas", [])
    if args.persona:
        configs = [c for c in configs if c["id"] == args.persona]
        if not configs:
            logger.error("Persona '%s' not found in config.yml", args.persona)
            sys.exit(1)

    if args.skip_embed:
        logger.info("Skip-embed mode: skipping embedding model download.")
        for cfg in configs:
            seed_one_no_embed(cfg)
    else:
        logger.info("Loading embedding model %s...", EMBED_MODEL_NAME)
        model = SentenceTransformer(EMBED_MODEL_NAME)
        for cfg in configs:
            seed_one(cfg, model)

    logger.info("Done. %d persona(s) seeded.", len(configs))


if __name__ == "__main__":
    main()
