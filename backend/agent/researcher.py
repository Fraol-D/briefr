from dataclasses import dataclass
from typing import List, Set

from services.gemini import generate_content, get_response_text


@dataclass
class SubAnswer:
    question: str
    answer: str
    sources: List[str]


def _extract_grounding_sources(response) -> List[str]:
    urls: Set[str] = set()
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        return []

    metadata = getattr(candidates[0], "grounding_metadata", None)
    if not metadata:
        return []

    chunks = getattr(metadata, "grounding_chunks", None) or []
    for chunk in chunks:
        web = getattr(chunk, "web", None)
        if not web:
            continue
        uri = getattr(web, "uri", None) or getattr(web, "url", None)
        if uri:
            urls.add(uri)

    return sorted(urls)


def research_subquestions(sub_questions: List[str]) -> List[SubAnswer]:
    results: List[SubAnswer] = []

    for question in sub_questions:
        prompt = (
            "You are a research assistant. Use grounded web search results to answer the question."
            "\nProvide a concise, factual answer in 4-6 sentences."
            "\nDo not include a sources list or citations in the text."
            f"\nQuestion: {question}"
        )
        response = generate_content(prompt, grounded=True)
        answer = get_response_text(response).strip()
        sources = _extract_grounding_sources(response)

        if not answer:
            answer = "No grounded answer returned."

        results.append(SubAnswer(question=question, answer=answer, sources=sources))

    return results
