"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import ResearchForm from "@/components/ResearchForm";
import ReportDisplay from "@/components/ReportDisplay";
import ThinkingSteps from "@/components/ThinkingSteps";

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

const stepLabels = [
  "Breaking down question",
  "Searching web",
  "Synthesizing report"
];

const API_BASE = "http://127.0.0.1:8000";

export default function AppPage() {
  const [question, setQuestion] = useState("");
  const [depth, setDepth] = useState<"quick" | "deep">("quick");
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ResearchResponse | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const easing = [0.16, 1, 0.3, 1];

  useEffect(() => {
    if (!loading) {
      timeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
      timeoutsRef.current = [];
      return;
    }

    setActiveStep(0);
    timeoutsRef.current = stepLabels.map((_, index) =>
      window.setTimeout(() => setActiveStep(index), index * 1200)
    );

    return () => {
      timeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
      timeoutsRef.current = [];
    };
  }, [loading]);

  const handleSubmit = async () => {
    if (!question.trim()) {
      setError("Please enter a research question");
      return;
    }

    setError(null);
    setReport(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, depth })
      });

      if (response.status === 429) {
        setError("Please wait a moment");
        return;
      }

      if (!response.ok) {
        let detail: string | undefined;
        try {
          const payload = (await response.json()) as { detail?: string };
          detail = payload?.detail;
        } catch (err) {
          detail = undefined;
        }
        setError(detail ?? "Connection failed — check your internet");
        return;
      }

      const data = (await response.json()) as ResearchResponse;
      setReport(data);
    } catch (err) {
      setError("Connection failed — check your internet");
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionChange = (value: string) => {
    setQuestion(value);
    if (error) {
      setError(null);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-dark-surface)] px-6 pb-24">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easing }}
          className="text-center"
        >
          <span className="text-xs uppercase tracking-[0.3em] text-[var(--color-secondary-text)]">
            Briefr Research
          </span>
          <h1 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
            Turn any question into a cited brief.
          </h1>
          <p className="mt-3 text-base text-[var(--color-secondary-text)]">
            Ask once, get a structured report in under a minute.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: easing }}
          className="rounded-3xl border border-white/10 bg-[rgba(var(--color-brand-rgb),0.8)] p-6"
        >
          <ResearchForm
            question={question}
            depth={depth}
            loading={loading}
            onQuestionChange={handleQuestionChange}
            onDepthChange={setDepth}
            onSubmit={handleSubmit}
          />
        </motion.div>

        <AnimatePresence>
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.35, ease: easing }}
              className="rounded-2xl border border-white/10 bg-[rgba(var(--color-brand-rgb),0.7)] px-5 py-4 text-sm text-[var(--color-accent)]"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {loading && (
            <ThinkingSteps steps={stepLabels} activeIndex={activeStep} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {report && !loading && (
            <ReportDisplay report={report} question={question} />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
