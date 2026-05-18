"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ResearchSection = {
  title: string;
  content: string;
  sources: string[];
};

type ResearchResponse = {
  summary: string;
  sections: ResearchSection[];
  all_sources: string[];
  read_time_minutes: number;
  sub_questions_used: string[];
};

type ReportDisplayProps = {
  report: ResearchResponse;
  question: string;
};

const stopWords = new Set([
  "is",
  "the",
  "a",
  "an",
  "why",
  "how",
  "what",
  "where",
  "when"
]);

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.2
    }
  }
};

const sectionVariants = {
  hidden: { opacity: 0, clipPath: "inset(100% 0 0 0)" },
  show: {
    opacity: 1,
    clipPath: "inset(0 0 0 0)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
};

const formatSourceLabel = (value: string, index: number) => {
  try {
    const url = new URL(value);
    return url.hostname.replace("www.", "");
  } catch (err) {
    return `Source ${index + 1}`;
  }
};

const buildReportFilename = (question: string) => {
  const words = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !stopWords.has(word));
  const slug = words.slice(0, 3).join("-");
  return `${slug || "briefr-report"}.md`;
};

export default function ReportDisplay({ report, question }: ReportDisplayProps) {
  const [copied, setCopied] = useState(false);

  const markdown = useMemo(() => {
    const sections = report.sections
      .map((section) => {
        const sources = section.sources.length
          ? `\n\nSources:\n${section.sources.map((source) => `- ${source}`).join("\n")}`
          : "";
        return `### ${section.title}\n\n${section.content}${sources}`;
      })
      .join("\n\n");

    const allSources = report.all_sources.length
      ? `\n\n## Sources\n${report.all_sources
          .map((source) => `- ${source}`)
          .join("\n")}`
      : "";

    return `# Briefr Report\n\n## Executive Summary\n\n${report.summary}\n\n${sections}${allSources}`;
  }, [report]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildReportFilename(question);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-white/10 bg-[rgba(var(--color-brand-rgb),0.82)] p-6 font-report"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">
            Research Report
          </h2>
          <p className="text-sm text-[var(--color-secondary-text)]">
            {report.read_time_minutes} min read
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            Download .md
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-[var(--color-dark-surface)] p-5">
          <h3 className="font-display text-lg font-semibold text-white">
            Executive Summary
          </h3>
          <p className="mt-3 text-sm leading-7 text-[var(--color-light-contrast)]">
            {report.summary}
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {report.sections.map((section, index) => (
            <motion.div
              key={`${section.title}-${index}`}
              variants={sectionVariants}
              className="rounded-2xl border border-white/10 bg-[rgba(var(--color-brand-rgb),0.7)] p-5"
            >
              <h4 className="font-display text-lg font-semibold text-white">
                {section.title}
              </h4>
              <p className="mt-3 text-sm leading-7 text-[var(--color-light-contrast)]">
                {section.content}
              </p>
              {section.sources.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {section.sources.map((source, sourceIndex) => (
                    <a
                      key={`${source}-${sourceIndex}`}
                      href={source}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Badge variant="indigo">
                        {formatSourceLabel(source, sourceIndex)}
                      </Badge>
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {report.all_sources.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-[var(--color-dark-surface)] p-5">
            <h3 className="font-display text-lg font-semibold text-white">
              Sources
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {report.all_sources.map((source, index) => (
                <a key={`${source}-${index}`} href={source} target="_blank" rel="noreferrer">
                  <Badge variant="indigo">{formatSourceLabel(source, index)}</Badge>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
