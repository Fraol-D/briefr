"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";

const topics = [
  "AI Agents",
  "Market Research",
  "Tech Trends",
  "Startup Analysis",
  "Scientific Papers",
  "Investment Thesis"
];

export default function Marquee() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const [width, setWidth] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const updateWidth = () => {
      if (!trackRef.current) {
        return;
      }
      setWidth(trackRef.current.scrollWidth / 2);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useAnimationFrame((_, delta) => {
    if (paused || width === 0) {
      return;
    }
    const duration = window.innerWidth < 640 ? 28000 : 34000;
    const speed = width / duration;
    const moveBy = speed * delta;
    const next = x.get() - moveBy;
    x.set(Math.abs(next) >= width ? 0 : next);
  });

  const items = [...topics, ...topics];

  return (
    <div className="overflow-hidden border-y border-white/10 bg-[var(--color-dark-surface)] py-4">
      <motion.div
        ref={trackRef}
        className="flex w-max items-center gap-6 pr-6"
        style={{ x }}
        onHoverStart={() => setPaused(true)}
        onHoverEnd={() => setPaused(false)}
      >
        {items.map((topic, index) => (
          <div key={`${topic}-${index}`} className="flex items-center gap-6">
            <span className="text-sm uppercase tracking-[0.2em] text-[var(--color-secondary-text)]">
              {topic}
            </span>
            <span className="text-[rgba(var(--color-accent-rgb),0.35)]">✦</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
