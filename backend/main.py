import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agent.decomposer import decompose_question
from agent.researcher import research_subquestions
from agent.synthesizer import synthesize_report
from models.schemas import ResearchRequest, ResearchResponse

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


def _is_rate_limit_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "rate" in message or "quota" in message or "429" in message


@app.post("/research", response_model=ResearchResponse)
def research(request: ResearchRequest) -> ResearchResponse:
    if _is_vague_question(request.question):
        raise HTTPException(
            status_code=400,
            detail="Please be more specific about what you want to research.",
        )

    try:
        sub_questions = decompose_question(request.question)
        sub_answers = research_subquestions(sub_questions)
        report = synthesize_report(request.question, sub_answers, request.depth)
        return report
    except Exception as exc:
        logger.exception("Research request failed")
        if _is_rate_limit_error(exc):
            raise HTTPException(
                status_code=429, detail="Please wait a moment and try again."
            )
        raise HTTPException(
            status_code=500, detail="Research failed. Please try again."
        ) from exc
