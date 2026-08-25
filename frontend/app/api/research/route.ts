import { NextResponse } from "next/server";

import { decomposeQuestion } from "../../../lib/research/decomposer";
import { mapGeminiFailure } from "../../../lib/research/gemini";
import { researchSubquestions } from "../../../lib/research/researcher";
import { synthesizeReport } from "../../../lib/research/synthesizer";
import { ResearchError, type ResearchDepth } from "../../../lib/research/types";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

function isVagueQuestion(question: string): boolean {
  const words = question.trim().split(/\s+/).filter(Boolean);
  return words.length < 3;
}

function mapError(error: unknown): ResearchError {
  if (error instanceof ResearchError) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("tavily_api_key") || lower.includes("tavily api key")) {
    return new ResearchError(
      "Server configuration error. Tavily API key is missing.",
      500
    );
  }
  return mapGeminiFailure(message);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
  }

  const { question, depth } = body as { question?: unknown; depth?: unknown };

  if (typeof question !== "string" || question.trim().length < 8) {
    return NextResponse.json(
      { detail: "Please be more specific about what you want to research." },
      { status: 400 }
    );
  }

  const resolvedDepth: ResearchDepth = depth === undefined ? "quick" : (depth as ResearchDepth);
  if (resolvedDepth !== "quick" && resolvedDepth !== "deep") {
    return NextResponse.json({ detail: "Invalid depth." }, { status: 400 });
  }

  if (isVagueQuestion(question)) {
    return NextResponse.json(
      { detail: "Please be more specific about what you want to research." },
      { status: 400 }
    );
  }

  try {
    const maxSubQuestions = resolvedDepth === "deep" ? 4 : 3;
    const subQuestions = await decomposeQuestion(question.trim(), maxSubQuestions);
    const subAnswers = await researchSubquestions(subQuestions);
    const report = await synthesizeReport(question.trim(), subAnswers, resolvedDepth);
    return NextResponse.json(report);
  } catch (error) {
    const mapped = mapError(error);
    const raw = error instanceof Error ? error.message : String(error);
    console.error("Research request failed:", mapped.detail, raw);
    return NextResponse.json({ detail: mapped.detail }, { status: mapped.status });
  }
}
