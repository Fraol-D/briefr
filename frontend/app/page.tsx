"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import DiamondField from "@/components/DiamondField";
import Marquee from "@/components/Marquee";
import { Button } from "@/components/ui/button";

const headline = "Research anything. Get answers in seconds.";

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.03
    }
  }
};

const letterVariants = {
  hidden: { opacity: 0, y: -30 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.34, 1.56, 0.64, 1]
    }
  }
};

const steps = [
  {
    title: "Ask your question",
    description: "Drop a topic or a single line prompt."
  },
  {
    title: "Agent searches the web in real time",
    description: "Live grounding pulls sources that matter."
  },
  {
    title: "Get a structured, cited report",
    description: "Clear sections, sources, and next steps."
  }
];

export default function Page() {
  return (
    <main className="relative overflow-hidden bg-[var(--color-dark-surface)]">
      <section className="relative flex min-h-screen items-center justify-center px-6 py-24">
        <DiamondField className="opacity-100" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(var(--color-accent-rgb),0.18),_transparent_60%)]" />
        <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 text-[clamp(4rem,12vw,10rem)] font-display font-semibold tracking-[-0.04em] text-white/5">
          BRIEFR
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-8 text-center">
          <motion.h1
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="font-display text-[clamp(2.2rem,7vw,3.5rem)] font-semibold leading-tight tracking-tight text-white"
          >
            {headline.split("").map((char, index) => (
              <motion.span key={`${char}-${index}`} variants={letterVariants}>
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </motion.h1>
          <p className="max-w-2xl text-base leading-relaxed text-[var(--color-secondary-text)] sm:text-lg">
            Briefr turns any question into a grounded, structured brief with
            sources you can trust.
          </p>
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
            <Button asChild size="lg" variant="primary" className="gap-2">
              <Link href="/app">
                Start Researching <span>→</span>
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Marquee />

      <section className="bg-[var(--color-brand-navy)] px-6 py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-8">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-[var(--color-secondary-text)]">
                How it works
              </span>
              <h2 className="mt-3 font-display text-[clamp(1.9rem,4vw,2.25rem)] font-semibold text-white">
                A disciplined flow for real-time research.
              </h2>
            </div>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.7, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="relative rounded-3xl border border-white/10 bg-[rgba(var(--color-brand-rgb),0.7)] p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[var(--color-dark-surface)] text-[var(--color-accent)]">
                      ✦ {index + 1}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-white">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm text-[var(--color-secondary-text)]">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="group relative rounded-3xl border border-white/10 bg-[rgba(var(--color-brand-rgb),0.75)] p-6"
          >
            <div className="absolute inset-0 rounded-3xl bg-black/10 opacity-100 transition-opacity duration-300 group-hover:opacity-0" />
            <div className="relative space-y-4">
              <div className="text-xs uppercase tracking-[0.3em] text-[var(--color-secondary-text)]">
                Live preview
              </div>
              <h3 className="font-display text-xl font-semibold text-white">
                Structured brief, ready to ship.
              </h3>
              <div className="rounded-2xl border border-white/10 bg-[var(--color-dark-surface)] p-4 text-sm text-[var(--color-light-contrast)]">
                Executive summary, key findings, and citations — delivered in a
                clean, editable report.
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[var(--color-secondary-text)]">
                <span className="rounded-full border border-white/10 px-3 py-1">Sources</span>
                <span className="rounded-full border border-white/10 px-3 py-1">Read time</span>
                <span className="rounded-full border border-white/10 px-3 py-1">Copy + export</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
          <h2 className="font-display text-[clamp(1.9rem,4vw,2.25rem)] font-semibold text-white">
            Start with your next research question.
          </h2>
          <p className="max-w-2xl text-base text-[var(--color-secondary-text)]">
            Briefr is public, fast, and built for the work you do every day.
          </p>
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
            <Button asChild size="lg" variant="primary" className="gap-2">
              <Link href="/app">
                Go to the research console <span>→</span>
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
