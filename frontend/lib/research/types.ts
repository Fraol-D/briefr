export type ResearchDepth = "quick" | "deep";

export type TavilyResult = {
  title: string;
  url: string;
  content: string;
};

export type SubAnswer = {
  question: string;
  answer: string;
  sources: string[];
  source_labels: Record<string, string>;
  search_results: TavilyResult[];
};

export type ResearchSection = {
  title: string;
  content: string;
  sources: string[];
};

export type ResearchResponse = {
  summary: string;
  sections: ResearchSection[];
  all_sources: string[];
  source_labels: Record<string, string>;
  read_time_minutes: number;
  sub_questions_used: string[];
};

export class ResearchError extends Error {
  status: number;
  detail: string;

  constructor(detail: string, status = 500) {
    super(detail);
    this.name = "ResearchError";
    this.status = status;
    this.detail = detail;
  }
}
