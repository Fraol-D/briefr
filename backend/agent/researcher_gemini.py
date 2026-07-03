"""Legacy Gemini grounded research — kept for rollback, not used by default."""

import re
import time
from dataclasses import dataclass, field
from typing import Dict, List

from services.gemini import (
    extract_source_labels,
    extract_sources,
    generate_content,
    get_response_text,
)
from services.timing import profiler


@dataclass
class SubAnswer:
    question: str
    answer: str
    sources: List[str]
    source_labels: Dict[str, str] = field(default_factory=dict)
    search_results: list = field(default_factory=list)


def _extract_numbered_answers(text: str, count: int) -> List[str]:
    answers: List[str] = []
    for index in range(1, count + 1):
        pattern = rf"(?:\*\*)?ANSWER\s+{index}\s*:(.*?)(?=(?:\*\*)?ANSWER\s+{index + 1}\s*:|$)"
        match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
        if match:
            answers.append(re.sub(r"\s+", " ", match.group(1)).strip())
    return answers


def _research_batch(sub_questions: List[str]) -> List[SubAnswer]:
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
    text = get_response_text(response)
    sources = extract_sources(response)
    labels = extract_source_labels(response)
    answers = _extract_numbered_answers(text, len(sub_questions))

    results: List[SubAnswer] = []
    for index, question in enumerate(sub_questions):
        answer = answers[index] if index < len(answers) else ""
        if not answer:
            answer = "No grounded answer returned."
        results.append(
            SubAnswer(
                question=question,
                answer=answer,
                sources=sources,
                source_labels=labels,
            )
        )

    return results


def research_subquestions_gemini(sub_questions: List[str]) -> List[SubAnswer]:
    if not sub_questions:
        return []

    if len(sub_questions) == 1:
        prompt = (
            "You are a research assistant. Use grounded web search results to answer the question."
            "\nProvide a concise, factual answer in 4-6 sentences."
            "\nDo not include a sources list or citations in the text."
            f"\nQuestion: {sub_questions[0]}"
        )
        response = generate_content(prompt, grounded=True)
        answer = get_response_text(response).strip() or "No grounded answer returned."
        return [
            SubAnswer(
                question=sub_questions[0],
                answer=answer,
                sources=extract_sources(response),
                source_labels=extract_source_labels(response),
            )
        ]

    try:
        if profiler.enabled():
            profiler.record_note("research_path", path="gemini_batch")
        return _research_batch(sub_questions)
    except Exception:
        if profiler.enabled():
            profiler.record_note("research_path", path="gemini_sequential_fallback")
        if profiler.enabled():
            profiler.record_idle("fallback_initial_sleep", 1.0)
        time.sleep(1)
        results: List[SubAnswer] = []
        for index, question in enumerate(sub_questions):
            if index > 0:
                if profiler.enabled():
                    profiler.record_idle("fallback_throttle_sleep", 1.0, index=index)
                time.sleep(1)
            prompt = (
                "You are a research assistant. Use grounded web search results to answer the question."
                "\nProvide a concise, factual answer in 4-6 sentences."
                "\nDo not include a sources list or citations in the text."
                f"\nQuestion: {question}"
            )
            response = generate_content(prompt, grounded=True)
            answer = get_response_text(response).strip() or "No grounded answer returned."
            results.append(
                SubAnswer(
                    question=question,
                    answer=answer,
                    sources=extract_sources(response),
                    source_labels=extract_source_labels(response),
                )
            )
        return results