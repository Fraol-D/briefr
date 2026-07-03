"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import ResearchForm from "../../components/ResearchForm";
import ReportDisplay from "../../components/ReportDisplay";
import ThinkingSteps from "../../components/ThinkingSteps";

type ResearchSection = {
  title: string;
  content: string;
  sources: string[];
};

type ResearchResponse = {
  summary: string;
  sections: ResearchSection[];
  all_sources: string[];
  source_labels?: Record<string, string>;
  read_time_minutes: number;
  sub_questions_used: string[];
};

const stepLabels = [
  "Breaking down your question",
  "Searching sources",
  "Reading results",
  "Drafting report"
];

const STEP_CYCLE_MS = 2500;

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

export default function AppPage() {
  const [question, setQuestion] = useState("");
  const depth = "quick" as const;
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ResearchResponse | null>(null);
  const intervalRef = useRef<number | null>(null);
  const easing = [0.16, 1, 0.3, 1];

  useEffect(() => {
    if (!loading) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setActiveStep(0);
      return;
    }

    setActiveStep(0);
    intervalRef.current = window.setInterval(() => {
      setActiveStep((prev) => (prev + 1) % stepLabels.length);
    }, STEP_CYCLE_MS);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
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
    <main className="relative min-h-screen px-6 pb-24">
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_30%,_#1e3a6e_0%,_#0d1117_55%,_#080c14_100%)]"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-8 pt-28">
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
            loading={loading}
            onQuestionChange={handleQuestionChange}
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
            <ThinkingSteps
              steps={stepLabels}
              activeIndex={activeStep}
              cycling
            />
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
