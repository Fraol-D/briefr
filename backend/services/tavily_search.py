import os
from dataclasses import dataclass
from typing import List

from tavily import TavilyClient

from services.timing import profiler

_CLIENT: TavilyClient | None = None


@dataclass
class TavilyResult:
    title: str
    url: str
    content: str


def _get_client() -> TavilyClient:
    api_key = os.environ.get("TAVILY_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("TAVILY_API_KEY is not set.")
    return TavilyClient(api_key=api_key)


def _client() -> TavilyClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = _get_client()
    return _CLIENT


def search_subquestion(query: str, max_results: int = 5) -> List[TavilyResult]:
    import time

    start = time.perf_counter()
    response = _client().search(
        query=query,
        max_results=max_results,
        search_depth="basic",
    )
    duration = time.perf_counter() - start

    if profiler.enabled():
        profiler.record_note(
            "tavily_search",
            query=query[:120],
            duration_s=round(duration, 2),
            result_count=len(response.get("results", [])),
        )

    results: List[TavilyResult] = []
    for item in response.get("results", []):
        url = str(item.get("url", "")).strip()
        if not url:
            continue
        title = str(item.get("title", "")).strip() or url
        content = str(item.get("content", "")).strip()
        results.append(TavilyResult(title=title, url=url, content=content))

    return results