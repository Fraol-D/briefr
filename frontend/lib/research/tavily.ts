import { ResearchError, type TavilyResult } from "./types";

function apiKey(): string {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) {
    throw new ResearchError(
      "Server configuration error. Tavily API key is missing.",
      500
    );
  }
  return key;
}

type TavilyApiResult = {
  title?: string;
  url?: string;
  content?: string;
};

type TavilyResponse = {
  results?: TavilyApiResult[];
  detail?: { error?: string };
  error?: string;
};

export async function searchSubquestion(
  query: string,
  maxResults = 5
): Promise<TavilyResult[]> {
  const key = apiKey();
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: maxResults,
      search_depth: "basic"
    })
  });

  const raw = await response.text();
  let payload: TavilyResponse = {};
  try {
    payload = JSON.parse(raw) as TavilyResponse;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message =
      payload.error ||
      payload.detail?.error ||
      `Tavily request failed with status ${response.status}`;
    const lower = message.toLowerCase();
    if (["429", "quota", "resource_exhausted"].some((token) => lower.includes(token))) {
      throw new ResearchError("Please wait a moment and try again.", 429);
    }
    throw new ResearchError("Research failed. Please try again.", 500);
  }

  const results: TavilyResult[] = [];
  for (const item of payload.results ?? []) {
    const url = String(item.url ?? "").trim();
    if (!url) {
      continue;
    }
    results.push({
      title: String(item.title ?? "").trim() || url,
      url,
      content: String(item.content ?? "").trim()
    });
  }

  return results;
}
