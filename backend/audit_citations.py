"""Run N quick-mode pipelines and audit every citation's origin and resolution."""

from __future__ import annotations

import json
import re
import sys
import time
from dataclasses import asdict, dataclass
from typing import List, Set

import httpx
from dotenv import load_dotenv

from agent.decomposer import decompose_question
from agent.synthesizer import synthesize_report
from services.gemini import extract_source_details, generate_content, get_response_text

load_dotenv()

SEARCH_MARKERS = (
    "google.com/search",
    "www.google.com/search",
    "bing.com/search",
    "duckduckgo.com/",
)

TOPICS = [
    "What are the health benefits of drinking green tea?",
    "What are the main benefits of solar energy?",
    "How does intermittent fasting affect metabolism?",
    "What caused the 2008 financial crisis?",
    "What is quantum computing and how does it work?",
]


@dataclass
class ResolvedCitation:
    url: str
    source_type: str
    label: str
    final_url: str
    resolution: str
    http_status: int | None


def classify_url(url: str) -> str:
    lower = url.lower()
    if any(marker in lower for marker in SEARCH_MARKERS):
        return "SEARCH_PAGE"
    if "google.com" in lower and "q=" in lower:
        return "SEARCH_PAGE"
    return "SOURCE_PAGE"


def resolve_url(href: str) -> tuple[str, str, int | None]:
    with httpx.Client(
        follow_redirects=False,
        timeout=20.0,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        },
    ) as client:
        url = href
        response = None
        for _ in range(10):
            response = client.get(url)
            if response.status_code in (301, 302, 303, 307, 308):
                location = response.headers.get("location")
                if not location:
                    break
                url = location
                continue
            break

    if not response:
        return href, "UNRESOLVED", None
    final = str(response.url)
    return final, classify_url(final), response.status_code


def _research_batch(sub_questions: List[str]):
    numbered = "\n".join(
        f"{index + 1}. {question}" for index, question in enumerate(sub_questions)
    )
    answer_labels = "\n".join(
        f"ANSWER {index + 1}: ..." for index in range(len(sub_questions))
    )
    prompt = (
        "You are a research assistant. Use grounded web search results to answer each question."
        "\nWrite 4-6 factual sentences per answer. Do not include citations in the text."
        "\nUse this exact format:"
        f"\n{answer_labels}"
        f"\nQuestions:\n{numbered}"
    )
    response = generate_content(prompt, grounded=True)
    return response, extract_source_details(response)


def audit_topic(question: str, index: int) -> dict:
    print(f"\n{'=' * 72}\nRUN {index + 1}: {question}\n{'=' * 72}", flush=True)
    t0 = time.perf_counter()

    sub_q = decompose_question(question, max_sub_questions=3)
    grounded_response, source_details = _research_batch(sub_q)
    text = get_response_text(grounded_response)

    from agent.researcher import _extract_numbered_answers, SubAnswer

    answers = _extract_numbered_answers(text, len(sub_q))
    urls = [detail.url for detail in source_details]
    sub_a = [
        SubAnswer(
            question=q,
            answer=answers[i] if i < len(answers) and answers[i] else "No grounded answer returned.",
            sources=urls,
        )
        for i, q in enumerate(sub_q)
    ]
    report = synthesize_report(question, sub_a, "quick")

    detail_by_url = {detail.url: detail for detail in source_details}
    citations: List[ResolvedCitation] = []
    for url in report.all_sources:
        detail = detail_by_url.get(url)
        source_type = detail.source_type if detail else "unknown"
        label = detail.label if detail else ""
        final_url, resolution, status = resolve_url(url)
        citations.append(
            ResolvedCitation(
                url=url,
                source_type=source_type,
                label=label,
                final_url=final_url,
                resolution=resolution,
                http_status=status,
            )
        )
        print(
            f"  [{source_type}] label={label!r} -> {resolution}\n"
            f"    final={final_url[:100]}",
            flush=True,
        )

    elapsed = time.perf_counter() - t0
    return {
        "question": question,
        "elapsed_s": round(elapsed, 1),
        "citation_count": len(citations),
        "citations": [asdict(c) for c in citations],
    }


def main() -> None:
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    results = []
    for i, topic in enumerate(TOPICS[:count]):
        try:
            results.append(audit_topic(topic, i))
            time.sleep(2)
        except Exception as exc:
            print(f"RUN {i + 1} FAILED: {exc}", flush=True)
            results.append({"question": topic, "error": str(exc)})

    all_citations = [
        c for run in results if "citations" in run for c in run["citations"]
    ]
    source_pages = [c for c in all_citations if c["resolution"] == "SOURCE_PAGE"]
    search_pages = [c for c in all_citations if c["resolution"] == "SEARCH_PAGE"]
    chunks = [c for c in all_citations if c["source_type"] == "grounding_chunk"]
    chips = [c for c in all_citations if c["source_type"] == "search_entry_point_chip"]

    summary = {
        "runs_completed": len([r for r in results if "citations" in r]),
        "runs_failed": len([r for r in results if "error" in r]),
        "total_citations": len(all_citations),
        "source_page_count": len(source_pages),
        "search_page_count": len(search_pages),
        "source_page_pct": round(100 * len(source_pages) / len(all_citations), 1)
        if all_citations
        else 0,
        "search_page_pct": round(100 * len(search_pages) / len(all_citations), 1)
        if all_citations
        else 0,
        "grounding_chunk_count": len(chunks),
        "search_chip_count": len(chips),
        "chunk_source_page_pct": round(
            100
            * len([c for c in chunks if c["resolution"] == "SOURCE_PAGE"])
            / len(chunks),
            1,
        )
        if chunks
        else 0,
        "chip_search_page_pct": round(
            100
            * len([c for c in chips if c["resolution"] == "SEARCH_PAGE"])
            / len(chips),
            1,
        )
        if chips
        else 0,
        "results": results,
    }

    out = "_citation_audit_results.json"
    with open(out, "w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)

    print(f"\n{'=' * 72}")
    print("SUMMARY")
    print(f"  Runs completed: {summary['runs_completed']} / {count}")
    print(f"  Total citations: {summary['total_citations']}")
    print(f"  SOURCE_PAGE: {summary['source_page_count']} ({summary['source_page_pct']}%)")
    print(f"  SEARCH_PAGE: {summary['search_page_count']} ({summary['search_page_pct']}%)")
    print(f"  grounding_chunk citations: {summary['grounding_chunk_count']}")
    print(f"  search_entry_point_chip citations: {summary['search_chip_count']}")
    print(f"  Saved: {out}")


if __name__ == "__main__":
    main()