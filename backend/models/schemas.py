from typing import List, Literal

from pydantic import BaseModel, Field


class ResearchRequest(BaseModel):
    question: str = Field(..., min_length=8)
    depth: Literal["quick", "deep"] = "quick"


class ResearchSection(BaseModel):
    title: str
    content: str
    sources: List[str] = Field(default_factory=list)


class ResearchResponse(BaseModel):
    summary: str
    sections: List[ResearchSection]
    all_sources: List[str]
    read_time_minutes: int
    sub_questions_used: List[str]
