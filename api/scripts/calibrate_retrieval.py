#!/usr/bin/env python3
"""SDD-02 §6.3 — calibrate `k` / `min_score` against retrieval_cases.yaml.

Runs every case with a wide net (min_score=0.0, large k) so the raw score
distribution is visible, then prints the gap between the lowest score among
"the answer should be found" cases and the highest score among "irrelevant"
cases. That gap is where `min_score` should sit — DD-10 requires an actual
measured gap, not a guessed constant.

Usage:
    uv run python scripts/calibrate_retrieval.py
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import yaml

API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(API_ROOT))

from app.knowledge.loader import load_knowledge_index, set_knowledge_index
from app.knowledge.search import search

FIXTURES_PATH = API_ROOT / "tests" / "fixtures" / "retrieval_cases.yaml"
WIDE_K = 10


def load_cases() -> list[dict[str, Any]]:
    raw = yaml.safe_load(FIXTURES_PATH.read_text(encoding="utf-8"))
    cases: list[dict[str, Any]] = raw["cases"]
    return cases


def main() -> None:
    set_knowledge_index(load_knowledge_index())

    cases = load_cases()
    relevant_top_scores: list[float] = []
    irrelevant_top_scores: list[float] = []

    specific_hits = 0
    specific_total = 0

    print(f"{'type':<10} {'top score':>10}  {'top anchor':<40} query")
    print("-" * 100)

    for case in cases:
        results = search(case["query"], k=WIDE_K, min_score=0.0)
        top_score = results[0].score if results else 0.0
        top_anchor = results[0].anchor if results else "(none)"

        case_type = case["type"]
        if case_type == "irrelevant":
            irrelevant_top_scores.append(top_score)
        else:
            relevant_top_scores.append(top_score)
            if case_type == "specific":
                specific_total += 1
                if top_anchor == case["expected_anchor"]:
                    specific_hits += 1

        expected = case.get("expected_anchor", "-")
        match = "✓" if top_anchor == expected else " " if case_type == "irrelevant" else "✗"
        print(f"{case_type:<10} {top_score:>10.4f}  {top_anchor:<40} {match} {case['query']}")

    print()
    if specific_total:
        print(f"specific top-1 accuracy: {specific_hits}/{specific_total}")

    if relevant_top_scores and irrelevant_top_scores:
        min_relevant = min(relevant_top_scores)
        max_irrelevant = max(irrelevant_top_scores)
        print(f"lowest relevant top score:   {min_relevant:.4f}")
        print(f"highest irrelevant top score: {max_irrelevant:.4f}")
        if min_relevant > max_irrelevant:
            suggested = (min_relevant + max_irrelevant) / 2
            print(f"gap exists — suggested min_score: {suggested:.4f}")
        else:
            print("no clean gap — relevant/irrelevant scores overlap, inspect the table above")
    else:
        print(
            "not enough data to compute a gap (need at least one relevant and one irrelevant case)"
        )


if __name__ == "__main__":
    main()
