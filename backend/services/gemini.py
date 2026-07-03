import logging
import os
import re
import time
from dataclasses import dataclass
from typing import Dict, List, Set

_HREF_PATTERN = re.compile(r'href="(https?://[^"]+)"')

import google.genai as genai
from google.genai import types

from services.timing import profiler

logger = logging.getLogger("briefr")

DEFAULT_MODEL = "gemini-2.5-flash-lite"
FALLBACK_MODELS = ("gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash")
MAX_RETRIES = 4
RETRY_DELAYS = (2, 4, 8, 16)

_CLIENT: genai.Client | None = None


def _model_candidates() -> List[str]:
    preferred = os.environ.get("GEMINI_MODEL", DEFAULT_MODEL).strip()
    candidates: List[str] = []
    for model in (preferred, *FALLBACK_MODELS):
        if model and model not in candidates:
            candidates.append(model)
    return candidates


def _get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set.")
    return genai.Client(api_key=api_key)


def _client() -> genai.Client:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = _get_client()
    return _CLIENT


def _is_retryable(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(
        token in message
        for token in ("503", "429", "unavailable", "resource_exhausted", "quota")
    )


def generate_content(prompt: str, grounded: bool = False):
    tools = None
    if grounded:
        tools = [types.Tool(google_search=types.GoogleSearch())]
    config = types.GenerateContentConfig(tools=tools) if tools else None

    last_error: Exception | None = None
    for model in _model_candidates():
        for attempt in range(MAX_RETRIES):
            attempt_start = time.perf_counter()
            try:
                response = _client().models.generate_content(
                    model=model, contents=prompt, config=config
                )
                if profiler.enabled():
                    profiler.record_api_call(
                        grounded=grounded,
                        model=model,
                        attempt=attempt + 1,
                        duration_s=time.perf_counter() - attempt_start,
                        success=True,
                        prompt_chars=len(prompt),
                    )
                return response
            except Exception as exc:
                if profiler.enabled():
                    profiler.record_api_call(
                        grounded=grounded,
                        model=model,
                        attempt=attempt + 1,
                        duration_s=time.perf_counter() - attempt_start,
                        success=False,
                        error=str(exc),
                        prompt_chars=len(prompt),
                    )
                last_error = exc
                if not _is_retryable(exc):
                    raise
                delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
                logger.warning(
                    "Gemini call failed on %s (attempt %s/%s): %s. Retrying in %ss.",
                    model,
                    attempt + 1,
                    MAX_RETRIES,
                    exc,
                    delay,
                )
                if profiler.enabled():
                    profiler.record_idle(
                        "gemini_retry_backoff",
                        delay,
                        model=model,
                        attempt=attempt + 1,
                    )
                time.sleep(delay)
        logger.warning("Switching Gemini model after repeated failures on %s.", model)

    if last_error:
        raise last_error
    raise RuntimeError("Gemini request failed without a response.")


def get_response_text(response) -> str:
    text = getattr(response, "text", None)
    if text:
        return text.strip()

    candidates = getattr(response, "candidates", None) or []
    if candidates:
        content = getattr(candidates[0], "content", None)
        parts = getattr(content, "parts", None) or []
        texts = []
        for part in parts:
            value = getattr(part, "text", None)
            if value:
                texts.append(value)
        return " ".join(texts).strip()

    return ""


def _urls_from_rendered_content(rendered: str) -> List[str]:
    if not rendered:
        return []
    return _HREF_PATTERN.findall(rendered)


@dataclass
class SourceDetail:
    url: str
    label: str
    source_type: str  # grounding_chunk | search_entry_point_chip


def _label_from_title(title: str) -> str:
    cleaned = (title or "").strip()
    if not cleaned:
        return ""
    if "." in cleaned and " " not in cleaned:
        return cleaned.replace("www.", "")
    return cleaned


def _collect_source_details(metadata) -> List[SourceDetail]:
    details: List[SourceDetail] = []
    seen: Set[str] = set()
    if not metadata:
        return details

    for chunk in getattr(metadata, "grounding_chunks", None) or []:
        web = getattr(chunk, "web", None)
        if not web:
            continue
        uri = getattr(web, "uri", None) or getattr(web, "url", None)
        if not uri or uri in seen:
            continue
        seen.add(uri)
        title = (getattr(web, "title", None) or "").strip()
        label = _label_from_title(title) or "Source"
        details.append(
            SourceDetail(url=uri, label=label, source_type="grounding_chunk")
        )

    entry = getattr(metadata, "search_entry_point", None)
    if entry:
        rendered = getattr(entry, "rendered_content", None) or ""
        for href in _urls_from_rendered_content(rendered):
            if href in seen:
                continue
            seen.add(href)
            chip_match = re.search(
                rf'href="{re.escape(href)}"[^>]*>([^<]+)<',
                rendered,
                flags=re.I,
            )
            chip_text = chip_match.group(1).strip() if chip_match else "Web search"
            details.append(
                SourceDetail(
                    url=href,
                    label=chip_text,
                    source_type="search_entry_point_chip",
                )
            )

    return details


def extract_source_details(response) -> List[SourceDetail]:
    details: List[SourceDetail] = []
    seen: Set[str] = set()
    if not response:
        return []

    candidates = getattr(response, "candidates", None) or []
    if not candidates and getattr(response, "grounding_metadata", None):
        candidates = [response]

    for candidate in candidates:
        metadata = getattr(candidate, "grounding_metadata", None)
        for item in _collect_source_details(metadata):
            if item.url in seen:
                continue
            seen.add(item.url)
            details.append(item)

    return details


def extract_source_labels(response) -> Dict[str, str]:
    return {detail.url: detail.label for detail in extract_source_details(response)}


def _collect_grounding_urls(metadata) -> Set[str]:
    urls: Set[str] = set()
    if not metadata:
        return urls

    chunks = getattr(metadata, "grounding_chunks", None) or []
    for chunk in chunks:
        web = getattr(chunk, "web", None)
        if not web:
            continue
        uri = getattr(web, "uri", None) or getattr(web, "url", None)
        if uri:
            urls.add(uri)

    entry = getattr(metadata, "search_entry_point", None)
    if entry:
        rendered = getattr(entry, "rendered_content", None) or ""
        urls.update(_urls_from_rendered_content(rendered))

    return urls


def extract_sources(response) -> List[str]:
    urls: Set[str] = set()
    if not response:
        return []

    candidates = getattr(response, "candidates", None) or []
    if not candidates and getattr(response, "grounding_metadata", None):
        candidates = [response]

    for candidate in candidates:
        metadata = getattr(candidate, "grounding_metadata", None)
        urls.update(_collect_grounding_urls(metadata))

    return sorted(urls)