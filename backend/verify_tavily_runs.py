"""Task 3 verification: 3 quick reports via Tavily pipeline."""

from __future__ import annotations

import json
import os
import sys
import time
import traceback
from dataclasses import asdict, dataclass
from typing import List

import httpx
from dotenv import load_dotenv

from pathlib import Path

_ENV_PATH = Path(__file__).resolve().parent / ".env"
_loaded = load_dotenv(_ENV_PATH)

print(f"[DEBUG] script={Path(__file__).resolve()}", flush=True)
print(f"[DEBUG] load_dotenv({_ENV_PATH}) -> {_loaded}", flush=True)
print(f"[DEBUG] cwd={os.getcwd()}", flush=True)
print(f"[DEBUG] TAVILY_API_KEY set={bool(os.getenv('TAVILY_API_KEY', '').strip())}", flush=True)
print(f"[DEBUG] GEMINI_API_KEY set={bool(os.getenv('GEMINI_API_KEY', '').strip())}", flush=True)

from agent.decomposer import decompose_question
from agent.researcher import research_subquestions
from agent.synthesizer import synthesize_report
import services.tavily_search as tavily_search_module

print(f"[DEBUG] tavily_search module file={tavily_search_module.__file__}", flush=True)

SEARCH_MARKERS = (
    "google.com/search",
    "www.google.com/search",
    "vertexaisearch.cloud.google.com",
    "bing.com/search",
)

TOPICS = [
    "What are the health benefits of drinking green tea?",
    "What are the main benefits of solar energy?",
    "How does intermittent fasting affect metabolism?",
]


@dataclass
class CitationCheck:
    url: str
    label: str
    final_url: str
    resolution: str
    http_status: int | None


def classify(url: str) -> str:
    lower = url.lower()
    if any(marker in lower for marker in SEARCH_MARKERS):
        return "SEARCH_PAGE"
    if "google.com" in lower and "q=" in lower:
        return "SEARCH_PAGE"
    return "SOURCE_PAGE"


def resolve(url: str) -> tuple[str, str, int | None]:
    with httpx.Client(follow_redirects=True, timeout=20.0) as client:
        try:
            response = client.get(url)
            final = str(response.url)
            return final, classify(final), response.status_code
        except Exception:
            return url, "UNRESOLVED", None


def run_topic(question: str, index: int) -> dict:
    print(f"\n{'=' * 72}\nRUN {index + 1}: {question}\n{'=' * 72}", flush=True)
    gemini_calls = 0
    t0 = time.perf_counter()

    print("[DEBUG] >>> before decompose (Gemini)", flush=True)
    t_decompose = time.perf_counter()
    sub_q = decompose_question(question, max_sub_questions=3)
    gemini_calls += 1
    decompose_s = time.perf_counter() - t_decompose
    print(
        f"[DEBUG] <<< after decompose: {len(sub_q)} sub-questions in {decompose_s:.1f}s",
        flush=True,
    )
    for i, q in enumerate(sub_q):
        print(f"[DEBUG]     sub_q[{i}]={q!r}", flush=True)

    print("[DEBUG] >>> before Tavily research", flush=True)
    t_research = time.perf_counter()
    sub_a = research_subquestions(sub_q)
    research_s = time.perf_counter() - t_research
    print(
        f"[DEBUG] <<< after Tavily research: {len(sub_a)} sub-answers in {research_s:.1f}s",
        flush=True,
    )
    for i, sa in enumerate(sub_a):
        print(
            f"[DEBUG]     sub_a[{i}] sources={len(sa.sources)} "
            f"search_results={len(sa.search_results)}",
            flush=True,
        )

    print("[DEBUG] >>> before synthesize (Gemini)", flush=True)
    t_synth = time.perf_counter()
    report = synthesize_report(question, sub_a, "quick")
    gemini_calls += 1
    synthesize_s = time.perf_counter() - t_synth
    print(
        f"[DEBUG] <<< after synthesize: {len(report.sections)} sections, "
        f"{len(report.all_sources)} sources in {synthesize_s:.1f}s",
        flush=True,
    )

    total_s = time.perf_counter() - t0

    citations: List[CitationCheck] = []
    for url in report.all_sources:
        label = report.source_labels.get(url, "")
        final_url, resolution, status = resolve(url)
        citations.append(
            CitationCheck(
                url=url,
                label=label,
                final_url=final_url,
                resolution=resolution,
                http_status=status,
            )
        )
        print(f"  [{label[:50]}] {url[:70]}...")
        print(f"    -> {resolution}: {final_url[:90]}", flush=True)

    print(
        f"\n  pipeline: {total_s:.1f}s (decompose {decompose_s:.1f}s + "
        f"tavily {research_s:.1f}s + synthesize {synthesize_s:.1f}s)",
        flush=True,
    )
    print(f"  gemini_calls: {gemini_calls} | citations: {len(citations)}", flush=True)

    return {
        "question": question,
        "pipeline_seconds": round(total_s, 1),
        "decompose_seconds": round(decompose_s, 1),
        "tavily_seconds": round(research_s, 1),
        "synthesize_seconds": round(synthesize_s, 1),
        "gemini_calls": gemini_calls,
        "citations": [asdict(c) for c in citations],
    }


def main() -> None:
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    results = []
    for i, topic in enumerate(TOPICS[:count]):
        try:
            print(f"[DEBUG] === starting run {i + 1}/{count} ===", flush=True)
            results.append(run_topic(topic, i))
            print(f"[DEBUG] === run {i + 1} succeeded ===", flush=True)
        except BaseException as exc:
            print(f"[DEBUG] === run {i + 1} FAILED ===", flush=True)
            print(f"RUN {i + 1} FAILED: {type(exc).__name__}: {exc!r}", flush=True)
            traceback.print_exc()
            results.append(
                {
                    "question": topic,
                    "error": str(exc) or repr(exc),
                    "error_type": type(exc).__name__,
                }
            )

    all_citations = [
        c for run in results if "citations" in run for c in run["citations"]
    ]
    source_pages = [c for c in all_citations if c["resolution"] == "SOURCE_PAGE"]

    summary = {
        "runs_completed": len([r for r in results if "citations" in r]),
        "total_citations": len(all_citations),
        "source_page_pct": round(100 * len(source_pages) / len(all_citations), 1)
        if all_citations
        else 0,
        "avg_pipeline_seconds": round(
            sum(r["pipeline_seconds"] for r in results if "pipeline_seconds" in r)
            / max(1, len([r for r in results if "pipeline_seconds" in r])),
            1,
        ),
        "gemini_calls_per_run": 2,
        "results": results,
    }

    out = "_tavily_verify_results.json"
    with open(out, "w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)

    print(f"\n{'=' * 72}")
    print(f"Runs completed: {summary['runs_completed']}/{count}")
    print(f"SOURCE_PAGE: {len(source_pages)}/{len(all_citations)} ({summary['source_page_pct']}%)")
    print(f"Avg pipeline: {summary['avg_pipeline_seconds']}s")
    print(f"Saved: {out}")


if __name__ == "__main__":
    main()