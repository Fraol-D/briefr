import { generateContent } from "./gemini";

function uniqueClean(items: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const item of items) {
    const text = item.trim().replace(/^-\s+/, "").trim();
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    cleaned.push(text);
  }
  return cleaned;
}

function extractJsonArray(text: string): string[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    return [];
  }
  try {
    const data = JSON.parse(text.slice(start, end + 1)) as unknown;
    if (!Array.isArray(data)) {
      return [];
    }
    return data.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export async function decomposeQuestion(
  question: string,
  maxSubQuestions = 3
): Promise<string[]> {
  const prompt =
    "You are a research planner." +
    `\nReturn ${maxSubQuestions} focused sub-questions for the user question below.` +
    "\nReturn ONLY a JSON array of strings, no extra text." +
    `\nQuestion: ${question}`;

  const text = await generateContent(prompt);

  let items = extractJsonArray(text);
  if (!items.length) {
    items = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  items = uniqueClean(items);

  if (items.length < 3) {
    const fallback = [
      `What are the key facts about ${question}?`,
      `What are recent developments or trends related to ${question}?`,
      `What are the main challenges or risks related to ${question}?`,
      `Who are the key players or stakeholders related to ${question}?`,
      `What is the future outlook for ${question}?`
    ];
    items = uniqueClean([...items, ...fallback]);
  }

  return items.slice(0, maxSubQuestions);
}
