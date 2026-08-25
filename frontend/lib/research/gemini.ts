import { ResearchError } from "./types";

const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash"
] as const;
const MAX_ATTEMPTS = 2;
const RETRY_DELAYS_MS = [400, 800];

function modelCandidates(): string[] {
  const preferred = (process.env.GEMINI_MODEL ?? DEFAULT_MODEL).trim();
  const candidates: string[] = [];
  for (const model of [preferred, ...FALLBACK_MODELS]) {
    if (model && !candidates.includes(model)) {
      candidates.push(model);
    }
  }
  return candidates;
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new ResearchError(
      "Server configuration error. Gemini API key is missing.",
      500
    );
  }
  return key;
}

function isRetryable(message: string, status?: number): boolean {
  const lower = message.toLowerCase();
  if (status === 429 || status === 503) {
    return true;
  }
  return ["429", "503", "unavailable", "resource_exhausted", "quota"].some(
    (token) => lower.includes(token)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type GeminiPart = { text?: string };
type GeminiCandidate = {
  content?: { parts?: GeminiPart[] };
};
type GeminiResponse = {
  error?: { message?: string; status?: string };
  candidates?: GeminiCandidate[];
};

function extractText(payload: GeminiResponse): string {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const texts = parts
    .map((part) => part.text?.trim())
    .filter((text): text is string => Boolean(text));
  return texts.join(" ").trim();
}

export async function generateContent(prompt: string): Promise<string> {
  const key = apiKey();
  let lastError: Error | null = null;

  for (const model of modelCandidates()) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        const payload = (await response.json()) as GeminiResponse;

        if (!response.ok) {
          const message =
            payload.error?.message ||
            `Gemini request failed with status ${response.status}`;
          if (isRetryable(message, response.status) && attempt < MAX_ATTEMPTS - 1) {
            await sleep(RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
            lastError = new Error(message);
            continue;
          }
          throw new Error(message);
        }

        const text = extractText(payload);
        if (text) {
          return text;
        }
        throw new Error("Gemini returned an empty response.");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lastError = error instanceof Error ? error : new Error(message);
        if (!isRetryable(message) || attempt >= MAX_ATTEMPTS - 1) {
          if (!isRetryable(message)) {
            throw lastError;
          }
          break;
        }
        await sleep(RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
      }
    }
    console.warn(`Switching Gemini model after repeated failures on ${model}.`);
  }

  const message = lastError?.message ?? "Gemini request failed without a response.";
  throw mapGeminiFailure(message);
}

export function mapGeminiFailure(message: string): ResearchError {
  const lower = message.toLowerCase();
  if (lower.includes("gemini_api_key is not set") || lower.includes("missing")) {
    return new ResearchError(
      "Server configuration error. Gemini API key is missing.",
      500
    );
  }
  if (["429", "quota", "resource_exhausted"].some((token) => lower.includes(token))) {
    return new ResearchError("Please wait a moment and try again.", 429);
  }
  if (["503", "unavailable", "high demand"].some((token) => lower.includes(token))) {
    return new ResearchError(
      "AI service is busy. Please try again in a few seconds.",
      500
    );
  }
  return new ResearchError("Research failed. Please try again.", 500);
}
