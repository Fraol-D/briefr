from dataclasses import dataclass, field
from typing import Dict, List

from services.tavily_search import TavilyResult, search_subquestion
from services.timing import profiler

# Legacy Gemini grounded research — available for rollback:
# from agent.researcher_gemini import research_subquestions_gemini


@dataclass
class SubAnswer:
    question: str
    answer: str
    sources: List[str]
    source_labels: Dict[str, str] = field(default_factory=dict)
    search_results: List[TavilyResult] = field(default_factory=list)


def _summarize_snippets(results: List[TavilyResult]) -> str:
    snippets = [item.content for item in results if item.content.strip()]
    if not snippets:
        return "No search results returned."
    return " ".join(snippets[:3])


def research_subquestions(sub_questions: List[str]) -> List[SubAnswer]:
    if not sub_questions:
        return []

    if profiler.enabled():
        profiler.record_note("research_path", path="tavily")

    sub_answers: List[SubAnswer] = []
    for question in sub_questions:
        hits = search_subquestion(question)
        sources = [item.url for item in hits]
        labels = {item.url: item.title for item in hits}
        sub_answers.append(
            SubAnswer(
                question=question,
                answer=_summarize_snippets(hits),
                sources=sources,
                source_labels=labels,
                search_results=hits,
            )
        )

    return sub_answers