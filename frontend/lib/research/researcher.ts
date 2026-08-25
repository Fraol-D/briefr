import { searchSubquestion } from "./tavily";
import type { SubAnswer, TavilyResult } from "./types";

function summarizeSnippets(results: TavilyResult[]): string {
  const snippets = results
    .map((item) => item.content)
    .filter((content) => content.trim());
  if (!snippets.length) {
    return "No search results returned.";
  }
  return snippets.slice(0, 3).join(" ");
}

export async function researchSubquestions(
  subQuestions: string[]
): Promise<SubAnswer[]> {
  if (!subQuestions.length) {
    return [];
  }

  const subAnswers: SubAnswer[] = [];
  for (const question of subQuestions) {
    const hits = await searchSubquestion(question);
    subAnswers.push({
      question,
      answer: summarizeSnippets(hits),
      sources: hits.map((item) => item.url),
      source_labels: Object.fromEntries(hits.map((item) => [item.url, item.title])),
      search_results: hits
    });
  }

  return subAnswers;
}
