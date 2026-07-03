"use client";

import { motion } from "framer-motion";

import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

type ResearchFormProps = {
  question: string;
  loading: boolean;
  onQuestionChange: (value: string) => void;
  onSubmit: () => void;
};

export default function ResearchForm({
  question,
  loading,
  onQuestionChange,
  onSubmit
}: ResearchFormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-6"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--color-secondary-text)]">
            Research command
          </span>
          <span className="text-xs text-[var(--color-secondary-text)]">
            {question.trim().length} characters
          </span>
        </div>
        <Textarea
          placeholder="Ask anything. What do you want to research?"
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
        />
        <div className="rounded-2xl border border-white/10 bg-[var(--color-brand-navy)]/80 px-4 py-3 text-xs text-[var(--color-secondary-text)]">
          Your questions are processed on demand. Briefr does not store inputs.
        </div>
      </div>
      <div className="flex justify-end">
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <Button
            type="submit"
            size="lg"
            variant="primary"
            className="gap-2"
            disabled={loading}
          >
            {loading ? "Researching" : "Run Research"} <span>→</span>
          </Button>
        </motion.div>
      </div>
    </form>
  );
}
