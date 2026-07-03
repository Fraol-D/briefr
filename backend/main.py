import logging
import os
import time

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agent.decomposer import decompose_question
from agent.researcher import research_subquestions
from agent.synthesizer import synthesize_report
from models.schemas import ResearchRequest, ResearchResponse
from services.timing import profiler

load_dotenv()

app = FastAPI(title="AI Research Agent")

logger = logging.getLogger("briefr")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _is_vague_question(question: str) -> bool:
    words = [word for word in question.strip().split() if word]
    return len(words) < 3


def _error_message(exc: Exception) -> str:
    message = str(exc).lower()
    if "gemini_api_key is not set" in message:
        return "Server configuration error. Gemini API key is missing."
    if "tavily_api_key is not set" in message:
        return "Server configuration error. Tavily API key is missing."
    if any(token in message for token in ("429", "quota", "resource_exhausted")):
        return "Please wait a moment and try again."
    if any(token in message for token in ("503", "unavailable", "high demand")):
        return "AI service is busy. Please try again in a few seconds."
    return "Research failed. Please try again."


@app.post("/research", response_model=ResearchResponse)
def research(request: ResearchRequest) -> ResearchResponse:
    if _is_vague_question(request.question):
        raise HTTPException(
            status_code=400,
            detail="Please be more specific about what you want to research.",
        )

    profiling = request.depth in ("quick", "deep")
    if profiling:
        profiler.begin(request.depth, request.question)

    try:
        max_sub_questions = 4 if request.depth == "deep" else 3

        if profiling:
            profiler.set_stage("decompose")
            stage_start = time.perf_counter()
        sub_questions = decompose_question(
            request.question, max_sub_questions=max_sub_questions
        )
        if profiling:
            profiler.record_stage(
                "decompose",
                time.perf_counter() - stage_start,
                sub_questions=len(sub_questions),
            )

        if profiling:
            profiler.set_stage("research")
            stage_start = time.perf_counter()
        sub_answers = research_subquestions(sub_questions)
        if profiling:
            profiler.record_stage(
                "research",
                time.perf_counter() - stage_start,
                sub_answers=len(sub_answers),
            )

        if profiling:
            profiler.set_stage("synthesize")
            stage_start = time.perf_counter()
        report = synthesize_report(request.question, sub_answers, request.depth)
        if profiling:
            profiler.record_stage(
                "synthesize",
                time.perf_counter() - stage_start,
                sections=len(report.sections),
            )
            profiler.log_summary()
        return report
    except Exception as exc:
        if profiling:
            profiler.log_summary()
        logger.exception("Research request failed")
        detail = _error_message(exc)
        status_code = 429 if "wait a moment" in detail.lower() else 500
        raise HTTPException(status_code=status_code, detail=detail) from exc
