import json
import math
from typing import Any, Dict, List

from agent.researcher import SubAnswer
from models.schemas import ResearchResponse, ResearchSection
from services.gemini import generate_content, get_response_text


def _extract_json_object(text: str) -> Dict[str, Any]:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return {}
    try:
        data = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return {}
    if not isinstance(data, dict):
        return {}
    return data


def _first_sentences(text: str, count: int = 3) -> str:
    parts = [p.strip() for p in text.replace("\n", " ").split(".") if p.strip()]
    return ". ".join(parts[:count]).strip() + ("." if parts[:count] else "")


def _estimate_read_time_minutes(text: str) -> int:
    words = len(text.split())
    return max(1, int(math.ceil(words / 200)))


def _fallback_sections(sub_answers: List[SubAnswer]) -> List[ResearchSection]:
    sections: List[ResearchSection] = []
    for sub_answer in sub_answers:
        title = sub_answer.question.rstrip("?").strip() or "Findings"
        sections.append(
            ResearchSection(
                title=title,
                content=sub_answer.answer,
                sources=sub_answer.sources,
            )
        )
    return sections


def synthesize_report(
    question: str, sub_answers: List[SubAnswer], depth: str
) -> ResearchResponse:
    known_sources = {source for item in sub_answers for source in item.sources}
    payload = [
        {
            "question": item.question,
            "search_results": [
                {
                    "title": result.title,
                    "url": result.url,
                    "content": result.content,
                }
                for result in item.search_results
            ],
            "sources": item.sources,
        }
        for item in sub_answers
    ]

    prompt = (
        "You are a research writer."
        "\nCreate a structured report based on the Tavily web search results below."
        "\nReturn ONLY a JSON object with keys: summary, sections."
        "\nSummary: 3-4 sentences."
        "\nSections: array of objects with title, content, sources."
        "\nUse only the provided source URLs. Do not invent sources."
        "\nWrite section content from the search result snippets; do not cite URLs in prose."
        "\nIf depth is quick, use 3 concise sections. If depth is deep, use 4-5 sections."
        f"\nDepth: {depth}"
        f"\nOriginal Question: {question}"
        f"\nResearch data: {json.dumps(payload, ensure_ascii=True)}"
    )

    response = generate_content(prompt, grounded=False)
    text = get_response_text(response)
    data = _extract_json_object(text)

    summary = str(data.get("summary", "")).strip()
    sections_data = data.get("sections", [])

    sections: List[ResearchSection] = []
    if isinstance(sections_data, list):
        for index, item in enumerate(sections_data):
            if not isinstance(item, dict):
                continue
            title = str(item.get("title", "")).strip()
            content = str(item.get("content", "")).strip()
            sources = item.get("sources", [])
            if not isinstance(sources, list):
                sources = []
            sources = [str(s).strip() for s in sources if str(s).strip()]
            if known_sources:
                sources = [s for s in sources if s in known_sources]
            if not sources and index < len(sub_answers):
                sources = sub_answers[index].sources
            if not title and index < len(sub_answers):
                title = sub_answers[index].question.rstrip("?").strip()
            if not content and index < len(sub_answers):
                content = sub_answers[index].answer
            if title and content:
                sections.append(
                    ResearchSection(title=title, content=content, sources=sources)
                )

    if not sections:
        sections = _fallback_sections(sub_answers)

    if not summary:
        combined = " ".join([s.answer for s in sub_answers])
        summary = _first_sentences(combined, count=4)

    all_sources = sorted({source for section in sections for source in section.sources})
    source_labels: Dict[str, str] = {}
    for item in sub_answers:
        source_labels.update(item.source_labels)
    read_time_text = summary + " " + " ".join([s.content for s in sections])
    read_time_minutes = _estimate_read_time_minutes(read_time_text)

    return ResearchResponse(
        summary=summary,
        sections=sections,
        all_sources=all_sources,
        source_labels=source_labels,
        read_time_minutes=read_time_minutes,
        sub_questions_used=[item.question for item in sub_answers],
    )
