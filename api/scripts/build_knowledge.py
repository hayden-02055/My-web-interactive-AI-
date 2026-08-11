#!/usr/bin/env python3
"""SDD-02 D-13 — build api/data/knowledge.json from api/data/knowledge.source.json.

DD-09: chunks whose `content_hash` is unchanged reuse their existing vector
instead of being re-embedded, so an unrelated edit doesn't rewrite every
vector in the file.

Usage:
    uv run python scripts/build_knowledge.py               # incremental build
    uv run python scripts/build_knowledge.py --force        # re-embed everything
    uv run python scripts/build_knowledge.py --check        # drift check only (§7.1 Stage B)
    uv run python scripts/build_knowledge.py --dry-run       # print the change plan, no API calls
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(API_ROOT))

from app.core.config import settings
from app.knowledge.embeddings import embed_texts

SOURCE_PATH = API_ROOT / "data" / "knowledge.source.json"
OUTPUT_PATH = API_ROOT / "data" / "knowledge.json"
MAX_OUTPUT_BYTES = 10 * 1024 * 1024  # §4.3 size budget
EMBEDDING_BATCH_SIZE = 96


def load_source() -> dict[str, Any]:
    if not SOURCE_PATH.exists():
        print(
            f"error: source not found at {SOURCE_PATH} (run `pnpm build:knowledge-source` first)",
            file=sys.stderr,
        )
        sys.exit(1)
    raw: dict[str, Any] = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    if raw.get("schema_version") != 1:
        print(
            f"error: unsupported source schema_version {raw.get('schema_version')!r}",
            file=sys.stderr,
        )
        sys.exit(1)
    return raw


def load_existing() -> dict[str, Any] | None:
    if not OUTPUT_PATH.exists():
        return None
    try:
        result: dict[str, Any] = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
        return result
    except json.JSONDecodeError:
        return None


def embedding_config_matches(existing: dict[str, Any] | None) -> bool:
    if existing is None:
        return False
    meta = existing.get("embedding") or {}
    return bool(
        meta.get("provider") == settings.embedding_provider
        and meta.get("model") == settings.embedding_model
        and meta.get("dimensions") == settings.embedding_dimensions
    )


def plan_changes(
    source_chunks: list[dict[str, Any]],
    existing_chunks_by_id: dict[str, dict[str, Any]],
    *,
    force: bool,
) -> tuple[dict[str, dict[str, Any]], list[dict[str, Any]], list[str]]:
    """Return (reused_by_id, to_embed, removed_ids)."""
    source_ids = {c["id"] for c in source_chunks}
    removed_ids = sorted(set(existing_chunks_by_id) - source_ids)

    reused: dict[str, dict[str, Any]] = {}
    to_embed: list[dict[str, Any]] = []
    for chunk in source_chunks:
        existing_chunk = None if force else existing_chunks_by_id.get(chunk["id"])
        if (
            existing_chunk is not None
            and existing_chunk.get("content_hash") == chunk["content_hash"]
        ):
            reused[chunk["id"]] = existing_chunk
        else:
            to_embed.append(chunk)
    return reused, to_embed, removed_ids


def check_drift(
    source_chunks: list[dict[str, Any]],
    existing: dict[str, Any] | None,
    existing_chunks_by_id: dict[str, dict[str, Any]],
) -> list[str]:
    if existing is None:
        return ["knowledge.json does not exist"]

    problems: list[str] = []
    if not embedding_config_matches(existing):
        problems.append(
            f"embedding config mismatch: index has {existing.get('embedding')!r}, configured is "
            f"provider={settings.embedding_provider!r} model={settings.embedding_model!r} "
            f"dimensions={settings.embedding_dimensions!r}"
        )

    source_ids = {c["id"] for c in source_chunks}
    existing_ids = set(existing_chunks_by_id)
    if source_ids != existing_ids:
        missing = sorted(source_ids - existing_ids)
        extra = sorted(existing_ids - source_ids)
        if missing:
            problems.append(f"missing from knowledge.json: {', '.join(missing)}")
        if extra:
            problems.append(f"stale in knowledge.json (no longer in source): {', '.join(extra)}")

    for chunk in source_chunks:
        existing_chunk = existing_chunks_by_id.get(chunk["id"])
        if (
            existing_chunk is not None
            and existing_chunk.get("content_hash") != chunk["content_hash"]
        ):
            problems.append(f"content_hash mismatch for {chunk['id']}")

    return problems


def round_vector(vector: list[float]) -> list[float]:
    return [round(v, 6) for v in vector]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build api/data/knowledge.json from knowledge.source.json"
    )
    parser.add_argument("--force", action="store_true", help="re-embed every chunk")
    parser.add_argument(
        "--check", action="store_true", help="check drift only, write nothing (§7.1 Stage B)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print the change plan without calling the embedding API",
    )
    args = parser.parse_args()

    source = load_source()
    source_chunks: list[dict[str, Any]] = sorted(source["chunks"], key=lambda c: c["id"])

    existing = load_existing()
    existing_chunks_by_id: dict[str, dict[str, Any]] = {
        c["id"]: c for c in (existing or {}).get("chunks", [])
    }

    if args.check:
        drift = check_drift(source_chunks, existing, existing_chunks_by_id)
        if drift:
            print("✗ knowledge.json is stale:")
            for line in drift:
                print(f"  - {line}")
            sys.exit(1)
        print(f"✓ knowledge.json is up to date ({len(source_chunks)} chunks)")
        return

    config_changed = existing is not None and not embedding_config_matches(existing)
    force = args.force or config_changed
    if config_changed:
        print("embedding config changed since last build — forcing full re-embedding")

    reused, to_embed, removed_ids = plan_changes(source_chunks, existing_chunks_by_id, force=force)

    plan_summary = (
        f"plan: {len(reused)} reused, {len(to_embed)} to embed, {len(removed_ids)} removed"
    )
    print(plan_summary + (" (forced full rebuild)" if force else ""))
    if removed_ids:
        print(f"  removed: {', '.join(removed_ids)}")

    if args.dry_run:
        if to_embed:
            print(f"  to embed: {', '.join(c['id'] for c in to_embed)}")
        return

    new_embeddings: dict[str, list[float]] = {}
    for i in range(0, len(to_embed), EMBEDDING_BATCH_SIZE):
        batch = to_embed[i : i + EMBEDDING_BATCH_SIZE]
        vectors = embed_texts([c["embed_text"] for c in batch])
        for chunk, vector in zip(batch, vectors, strict=True):
            new_embeddings[chunk["id"]] = vector

    output_chunks = []
    for chunk in source_chunks:
        embedding = (
            round_vector(new_embeddings[chunk["id"]])
            if chunk["id"] in new_embeddings
            else reused[chunk["id"]]["embedding"]
        )
        output_chunks.append(
            {
                "id": chunk["id"],
                "section": chunk["section"],
                "anchor": chunk["anchor"],
                "label": chunk["label"],
                "content": chunk["content"],
                "content_hash": chunk["content_hash"],
                "embedding": embedding,
            }
        )

    output = {
        "schema_version": 1,
        "generated_at": datetime.now(UTC).isoformat(),
        "source_schema_version": source["schema_version"],
        "embedding": {
            "provider": settings.embedding_provider,
            "model": settings.embedding_model,
            "dimensions": settings.embedding_dimensions,
        },
        "chunks": output_chunks,
    }

    serialized = json.dumps(output, ensure_ascii=False, indent=2) + "\n"
    size = len(serialized.encode("utf-8"))
    if size > MAX_OUTPUT_BYTES:
        print(
            f"error: knowledge.json would be {size} bytes, exceeds {MAX_OUTPUT_BYTES} byte budget (§4.3)",
            file=sys.stderr,
        )
        sys.exit(1)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(serialized, encoding="utf-8")
    print(
        f"✓ wrote {len(output_chunks)} chunks ({size / 1024:.1f} KB) to {OUTPUT_PATH.relative_to(API_ROOT.parent)}"
    )


if __name__ == "__main__":
    main()
