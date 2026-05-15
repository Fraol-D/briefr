import json
from typing import List

from services.gemini import generate_content, get_response_text


def _unique_clean(items: List[str]) -> List[str]:
    seen = set()
    cleaned: List[str] = []
    for item in items:
        text = item.strip().lstrip("- ").strip()
        if not text or text in seen:
            continue
        seen.add(text)
        cleaned.append(text)
    return cleaned


def _extract_json_array(text: str) -> List[str]:
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1 or end <= start:
        return []
    try:
        data = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    return [item for item in data if isinstance(item, str)]


def decompose_question(question: str) -> List[str]:
    prompt = (
        "You are a research planner."
        "\nReturn 3-5 focused sub-questions for the user question below."
        "\nReturn ONLY a JSON array of strings, no extra text."
        f"\nQuestion: {question}"
    )

    response = generate_content(prompt, grounded=False)
    text = get_response_text(response)

    items = _extract_json_array(text)
    if not items:
        items = [line for line in text.splitlines() if line.strip()]

    items = _unique_clean(items)

    if len(items) < 3:
        fallback = [
            f"What are the key facts about {question}?",
            f"What are recent developments or trends related to {question}?",
            f"What are the main challenges or risks related to {question}?",
            f"Who are the key players or stakeholders related to {question}?",
            f"What is the future outlook for {question}?",
        ]
        items = _unique_clean(items + fallback)

    return items[:5]
