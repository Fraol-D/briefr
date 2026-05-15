import os
from typing import List, Set

import google.genai as genai
from google.genai import types

MODEL_NAME = "gemini-2.5-flash"


_CLIENT: genai.Client | None = None


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


def generate_content(prompt: str, grounded: bool = False):
    tools = None
    if grounded:
        tools = [types.Tool(google_search=types.GoogleSearch())]
    config = types.GenerateContentConfig(tools=tools) if tools else None
    return _client().models.generate_content(
        model=MODEL_NAME, contents=prompt, config=config
    )


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


def extract_sources(response) -> List[str]:
    urls: Set[str] = set()
    if not response:
        return []

    candidates = getattr(response, "candidates", None) or []
    if not candidates and getattr(response, "grounding_metadata", None):
        candidates = [response]

    for candidate in candidates:
        metadata = getattr(candidate, "grounding_metadata", None)
        if not metadata:
            continue
        chunks = getattr(metadata, "grounding_chunks", None) or []
        for chunk in chunks:
            web = getattr(chunk, "web", None)
            if not web:
                continue
            uri = getattr(web, "uri", None) or getattr(web, "url", None)
            if uri:
                urls.add(uri)

    return sorted(urls)
