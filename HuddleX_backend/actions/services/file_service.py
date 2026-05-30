from __future__ import annotations

import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
from docx import Document
from pypdf import PdfReader
from fastapi import UploadFile


DATA_DIR = Path(os.getenv("DATA_DIR", ".data"))
UPLOAD_DIR = DATA_DIR / "uploads"


class FileServiceError(Exception):
    pass


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_upload_dir() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _safe_filename(filename: str) -> str:
    return Path(filename).name.replace("/", "_").replace("\\", "_")


def extract_text(path: Path, content_type: str | None = None) -> str:
    suffix = path.suffix.lower()

    if suffix in {".txt", ".md"}:
        return path.read_text(encoding="utf-8", errors="ignore")

    if suffix == ".pdf":
        reader = PdfReader(str(path))
        pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages.append(f"\n\n--- Page {i + 1} ---\n{text}")
        return "\n".join(pages).strip()

    if suffix == ".docx":
        doc = Document(str(path))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

    if suffix == ".csv":
        df = pd.read_csv(path)
        return df.to_markdown(index=False)

    raise FileServiceError(f"Unsupported file type: {suffix}")


async def save_upload(file: UploadFile, user_id: str = "default") -> dict[str, Any]:
    ensure_upload_dir()

    file_id = f"file_{uuid.uuid4().hex[:12]}"
    filename = _safe_filename(file.filename or "uploaded_file")
    file_dir = UPLOAD_DIR / file_id
    file_dir.mkdir(parents=True, exist_ok=True)

    original_path = file_dir / filename

    with original_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    size = original_path.stat().st_size

    try:
        extracted_text = extract_text(original_path, file.content_type)
    except Exception as e:
        raise FileServiceError(f"Failed to extract text: {e}") from e

    text_path = file_dir / "extracted.txt"
    text_path.write_text(extracted_text, encoding="utf-8")

    metadata = {
        "file_id": file_id,
        "user_id": user_id,
        "filename": filename,
        "content_type": file.content_type,
        "size": size,
        "created_at": _utc_now(),
        "original_path": str(original_path),
        "text_path": str(text_path),
        "extracted_chars": len(extracted_text),
    }

    metadata_path = file_dir / "metadata.json"
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    return metadata


def list_files(user_id: str | None = None) -> list[dict[str, Any]]:
    ensure_upload_dir()
    items = []

    for metadata_path in UPLOAD_DIR.glob("file_*/metadata.json"):
        try:
            data = json.loads(metadata_path.read_text(encoding="utf-8"))
            if user_id and data.get("user_id") != user_id:
                continue
            items.append(data)
        except Exception:
            continue

    return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)


def get_file_metadata(file_id: str) -> dict[str, Any] | None:
    metadata_path = UPLOAD_DIR / file_id / "metadata.json"
    if not metadata_path.exists():
        return None
    return json.loads(metadata_path.read_text(encoding="utf-8"))


def get_file_text(file_id: str) -> str:
    metadata = get_file_metadata(file_id)
    if not metadata:
        raise FileServiceError(f"File not found: {file_id}")

    text_path = Path(metadata["text_path"])
    if not text_path.exists():
        raise FileServiceError(f"Extracted text not found for: {file_id}")

    return text_path.read_text(encoding="utf-8")
