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
import asyncio
import os
from actions.services.x_client import XClient, XApiError
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

async def fetch_x_posts_live(handle: str, max_results: int = 30) -> list[dict]:
    client = XClient()
    bundle = await client.fetch_creator_posts_by_handle(
        handle=handle,
        max_results=max_results,
    )

    username = bundle["profile"]["username"]
    posts = []

    for post in bundle.get("posts", []):
        metrics = post.get("public_metrics", {}) or {}
        post_id = post.get("id")

        posts.append(
            {
                "id": post_id,
                "text": post.get("text", ""),
                "created_at": post.get("created_at"),
                "lang": post.get("lang"),
                "url": f"https://x.com/{username}/status/{post_id}" if post_id else None,
                "metrics": {
                    "like_count": metrics.get("like_count", 0),
                    "reply_count": metrics.get("reply_count", 0),
                    "retweet_count": metrics.get("retweet_count", 0),
                    "quote_count": metrics.get("quote_count", 0),
                },
                "source": "x_api_v2",
            }
        )

    return posts


def load_x_posts_with_live_fallback(cfg: dict) -> list[dict]:
    mode = os.getenv("X_API_MODE", "mock").lower()
    max_results = int(os.getenv("X_POSTS_MAX_RESULTS", "30"))

    handle = (
        cfg.get("x_handle")
        or cfg.get("x_username")
        or cfg.get("handle")
        or cfg.get("twitter_handle")
    )

    if mode == "live" and handle:
        try:
            print(f"INFO  Fetching live X posts for @{handle}...")
            return asyncio.run(fetch_x_posts_live(handle, max_results=max_results))
        except Exception as e:
            print(f"WARNING  Live X fetch failed for @{handle}: {e}")
            print("WARNING  Falling back to local pre-fetched X posts JSON.")

    posts_file = cfg.get("x_posts_file")
    if posts_file:
        return load_x_posts(posts_file)

    return []
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

    # Embed essays / transcripts / YouTube content in 400-char chunks
    for source in persona_data.get("content_sources", []):
        src_type = source.get("type", "content")
        src_url = source.get("url", "")
        text = source.get("text", "")
        chunk_size = 400
        for i, start in enumerate(range(0, len(text), chunk_size)):
            chunk_id = f"src_{abs(hash(src_url)) % 10**8}_{i}"
            if chunk_id not in existing_ids:
                docs.append(text[start : start + chunk_size])
                ids.append(chunk_id)
                metas.append({"type": src_type, "source_url": src_url, "chunk": i})

    # Embed cognitive framework if present
    framework = persona_data.get("cognitive_framework", {})
    if framework and "framework_summary" not in existing_ids:
        from actions.distillation import _framework_to_text
        fw_text = _framework_to_text(framework, persona_data.get("display_name", ""))
        if fw_text:
            docs.append(fw_text)
            ids.append("framework_summary")
            metas.append({"type": "cognitive_framework", "section": "full"})

    if docs:
        logger.info("  Embedding %d new docs...", len(docs))
        embeddings = model.encode(docs).tolist()
        collection.add(documents=docs, ids=ids, metadatas=metas, embeddings=embeddings)

    total = collection.count()
    logger.info("  Collection 'persona_%s': %d docs total", persona_id, total)
    return total


def seed_one(cfg: dict, model: SentenceTransformer, run_distill: bool = False) -> None:
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
        "content_sources": [],
    }

    # Fetch Wikipedia
    logger.info("  Fetching Wikipedia: %s", cfg["wikipedia_url"])
    try:
        persona_data["wikipedia"] = fetch_wikipedia(cfg["wikipedia_url"])
        wiki_summary = persona_data["wikipedia"].get("summary", "")
        logger.info("  Wikipedia OK (%d chars)", len(wiki_summary))
    except Exception as e:
        logger.warning("  Wikipedia fetch failed: %s", e)
        wiki_summary = ""
        persona_data["wikipedia"] = {"summary": "", "key_facts": [], "last_fetched": _utc_now()}

    # Load X posts
    persona_data["x_posts"] = load_x_posts_with_live_fallback(cfg)
    logger.info("  X posts loaded: %d", len(persona_data["x_posts"]))

    nebius_key = os.getenv("NEBIUS_API_KEY", "")

    # ── Optional: full 6-dimension cognitive framework distillation ──────────
    if run_distill and nebius_key:
        logger.info("  Running 6-dimension distillation (--distill)...")
        from actions.distillation import (
            gather_source_text,
            _run_all_dimensions,
            _synthesize_framework,
            _quality_check,
            _framework_to_text,
        )
        content_urls = cfg.get("content_urls") or []
        youtube_video_ids = cfg.get("youtube_video_ids") or []

        source_text, content_sources = gather_source_text(
            name=cfg["display_name"],
            wiki_summary=wiki_summary,
            posts=persona_data["x_posts"],
            content_urls=content_urls,
            youtube_video_ids=youtube_video_ids,
        )
        persona_data["content_sources"] = content_sources
        logger.info(
            "  Source text gathered: %d chars, %d extra sources",
            len(source_text), len(content_sources),
        )

        dim_notes = _run_all_dimensions(cfg["display_name"], source_text)
        framework = _synthesize_framework(cfg["display_name"], dim_notes)
        passed, issues = _quality_check(framework, cfg["display_name"])
        if not passed:
            logger.warning("  Quality issues: %s", issues)
            framework["_quality_issues"] = issues
        framework["_dimension_notes"] = dim_notes
        framework["generated_at"] = _utc_now()
        persona_data["cognitive_framework"] = framework

        # Derive personality_traits and speaking_style from framework
        if framework.get("mental_models"):
            persona_data["personality_traits"] = [
                m["name"] for m in framework["mental_models"][:3]
            ]
        dna = framework.get("expression_dna", {})
        if dna.get("tone"):
            persona_data["speaking_style"] = (
                f"{dna.get('tone', '')}. {dna.get('sentence_style', '')}".strip(". ")
            )
        logger.info("  Framework OK (quality passed: %s)", passed)
    elif run_distill and not nebius_key:
        logger.warning("  --distill requested but NEBIUS_API_KEY not set — skipping")

    # Embed into Chroma (includes content_sources if distillation ran)
    doc_count = embed_persona(pid, persona_data, model)

    # Generate initial briefing (skip if no Nebius key yet)
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--persona", help="Seed a single persona id (default: all)")
    parser.add_argument(
        "--distill", action="store_true",
        help=(
            "Run full 6-dimension cognitive framework distillation (requires NEBIUS_API_KEY). "
            "Also fetches essays and YouTube transcripts from config content_urls / youtube_video_ids."
        ),
    )
    args = parser.parse_args()

    configs = yaml.safe_load(PERSONA_CONFIG.read_text()).get("personas", [])
    if args.persona:
        configs = [c for c in configs if c["id"] == args.persona]
        if not configs:
            logger.error("Persona '%s' not found in config.yml", args.persona)
            sys.exit(1)

    logger.info("Loading embedding model %s...", EMBED_MODEL_NAME)
    model = SentenceTransformer(EMBED_MODEL_NAME)

    for cfg in configs:
        seed_one(cfg, model, run_distill=args.distill)

    logger.info("Done. %d persona(s) seeded.", len(configs))


if __name__ == "__main__":
    main()
