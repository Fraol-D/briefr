import { generateContent } from "./gemini";
import type {
  ResearchDepth,
  ResearchResponse,
  ResearchSection,
  SubAnswer
} from "./types";

function extractJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return {};
  }
  try {
    const data = JSON.parse(text.slice(start, end + 1)) as unknown;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return {};
    }
    return data as Record<string, unknown>;
  } catch {
    return {};
  }
}

function firstSentences(text: string, count = 3): string {
  const parts = text
    .replace(/\n/g, " ")
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
  const selected = parts.slice(0, count);
  return selected.join(". ") + (selected.length ? "." : "");
}

function estimateReadTimeMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function fallbackSections(subAnswers: SubAnswer[]): ResearchSection[] {
  return subAnswers.map((subAnswer) => ({
    title: subAnswer.question.replace(/\?+$/, "").trim() || "Findings",
    content: subAnswer.answer,
    sources: subAnswer.sources
  }));
}

export async function synthesizeReport(
  question: string,
  subAnswers: SubAnswer[],
  depth: ResearchDepth
): Promise<ResearchResponse> {
  const knownSources = new Set(subAnswers.flatMap((item) => item.sources));
  const payload = subAnswers.map((item) => ({
    question: item.question,
    search_results: item.search_results.map((result) => ({
      title: result.title,
      url: result.url,
      content: result.content
    })),
    sources: item.sources
  }));

  const prompt =
    "You are a research writer." +
    "\nCreate a structured report based on the Tavily web search results below." +
    "\nReturn ONLY a JSON object with keys: summary, sections." +
    "\nSummary: 3-4 sentences." +
    "\nSections: array of objects with title, content, sources." +
    "\nUse only the provided source URLs. Do not invent sources." +
    "\nWrite section content from the search result snippets; do not cite URLs in prose." +
    "\nIf depth is quick, use 3 concise sections. If depth is deep, use 4-5 sections." +
    `\nDepth: ${depth}` +
    `\nOriginal Question: ${question}` +
    `\nResearch data: ${JSON.stringify(payload)}`;

  const text = await generateContent(prompt);
  const data = extractJsonObject(text);

  const summary = String(data.summary ?? "").trim();
  const sectionsData = data.sections;

  const sections: ResearchSection[] = [];
  if (Array.isArray(sectionsData)) {
    sectionsData.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return;
      }
      const record = item as Record<string, unknown>;
      let title = String(record.title ?? "").trim();
      let content = String(record.content ?? "").trim();
      let sources = record.sources;
      if (!Array.isArray(sources)) {
        sources = [];
      }
      let sourceList = (sources as unknown[])
        .map((value) => String(value).trim())
        .filter(Boolean);
      if (knownSources.size) {
        sourceList = sourceList.filter((url) => knownSources.has(url));
      }
      if (!sourceList.length && index < subAnswers.length) {
        sourceList = subAnswers[index].sources;
      }
      if (!title && index < subAnswers.length) {
        title = subAnswers[index].question.replace(/\?+$/, "").trim();
      }
      if (!content && index < subAnswers.length) {
        content = subAnswers[index].answer;
      }
      if (title && content) {
        sections.push({ title, content, sources: sourceList });
      }
    });
  }

  const finalSections = sections.length ? sections : fallbackSections(subAnswers);
  const finalSummary =
    summary ||
    firstSentences(subAnswers.map((item) => item.answer).join(" "), 4);

  const allSources = Array.from(
    new Set(finalSections.flatMap((section) => section.sources))
  ).sort();

  const sourceLabels: Record<string, string> = {};
  for (const item of subAnswers) {
    Object.assign(sourceLabels, item.source_labels);
  }

  const readTimeText =
    finalSummary + " " + finalSections.map((section) => section.content).join(" ");

  return {
    summary: finalSummary,
    sections: finalSections,
    all_sources: allSources,
    source_labels: sourceLabels,
    read_time_minutes: estimateReadTimeMinutes(readTimeText),
    sub_questions_used: subAnswers.map((item) => item.question)
  };
}
