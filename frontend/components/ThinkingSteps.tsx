"use client";

import { motion } from "framer-motion";

type ThinkingStepsProps = {
  steps: string[];
  activeIndex: number;
  cycling?: boolean;
};

const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.3 }
  },
  exit: { opacity: 0, y: -10 }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  }
};

export default function ThinkingSteps({
  steps,
  activeIndex,
  cycling = false
}: ThinkingStepsProps) {
  const activeStep = steps[activeIndex] ?? steps[0];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="rounded-3xl border border-white/10 border-l-[var(--color-accent)] bg-[rgba(var(--color-brand-rgb),0.7)] p-6"
      style={{ borderLeftWidth: "3px" }}
    >
      {cycling && (
        <div className="mb-5 flex items-center gap-3">
          <motion.div
            className="h-5 w-5 rounded-full border-2 border-[var(--color-accent)] border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-sm font-medium text-white">{activeStep}</p>
        </div>
      )}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isActive = index === activeIndex;
          const isDone = !cycling && index < activeIndex;
          return (
            <motion.div
              key={step}
              variants={itemVariants}
              className="relative flex items-center gap-3 rounded-2xl px-3 py-2"
            >
              {isActive && (
                <motion.div
                  className="pointer-events-none absolute inset-0 rounded-2xl"
                  animate={{
                    boxShadow: [
                      "0 0 0 rgba(var(--color-accent-rgb), 0)",
                      "0 0 32px rgba(var(--color-accent-rgb), 0.3)",
                      "0 0 0 rgba(var(--color-accent-rgb), 0)"
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15">
                {isDone ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm text-[#10B981]"
                  >
                    ✓
                  </motion.span>
                ) : isActive ? (
                  <motion.div
                    className="h-4 w-4 rounded-full border-2 border-[var(--color-accent)] border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                ) : (
                  <span className="text-sm text-[var(--color-secondary-text)]">○</span>
                )}
              </div>
              <span className="relative z-10 text-sm text-white">{step}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
