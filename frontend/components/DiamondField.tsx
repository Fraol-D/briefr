"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import { cn } from "../lib/utils";

type Star = {
  id: number;
  x: number;
  y: number;
  size: number;
};

type PulseState = {
  x: number;
  y: number;
  radius: number;
  active: boolean;
  id: number;
};

const CELL_SIZE = 96;
const sizes = [6, 10, 16];

export default function DiamondField({ className }: { className?: string }) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef({ x: -9999, y: -9999 });
  const starRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const starsRef = useRef<Star[]>([]);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const pulseRef = useRef<PulseState>({ x: 0, y: 0, radius: 0, active: false, id: 0 });
  const pulseTimeoutsRef = useRef<number[]>([]);
  const lastClickRef = useRef(0);
  const burstTimerRef = useRef<number | null>(null);

  const stars = useMemo<Star[]>(() => {
    if (!bounds.width || !bounds.height) {
      return [];
    }

    const columns = Math.ceil(bounds.width / CELL_SIZE);
    const rows = Math.ceil(bounds.height / CELL_SIZE);
    const items: Star[] = [];
    let id = 0;

    for (let row = 0; row <= rows; row += 1) {
      for (let col = 0; col <= columns; col += 1) {
        const jitterX = (Math.random() - 0.5) * 18;
        const jitterY = (Math.random() - 0.5) * 18;
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        items.push({
          id,
          x: col * CELL_SIZE + CELL_SIZE / 2 + jitterX,
          y: row * CELL_SIZE + CELL_SIZE / 2 + jitterY,
          size
        });
        id += 1;
      }
    }

    return items;
  }, [bounds.height, bounds.width]);

  useEffect(() => {
    starsRef.current = stars;
  }, [stars]);

  useEffect(() => {
    const updateBounds = () => {
      if (!fieldRef.current) {
        return;
      }
      const rect = fieldRef.current.getBoundingClientRect();
      setBounds({ width: rect.width, height: rect.height });
    };

    const handleMove = (event: MouseEvent) => {
      if (!fieldRef.current) {
        return;
      }
      const rect = fieldRef.current.getBoundingClientRect();
      cursorRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    };

    const handleLeave = () => {
      cursorRef.current = { x: -9999, y: -9999 };
    };

    const handleClick = (event: MouseEvent) => {
      if (!fieldRef.current) {
        return;
      }
      const rect = fieldRef.current.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;
      const now = Date.now();
      const delta = now - lastClickRef.current;
      lastClickRef.current = now;

      const baseRadius = 150;
      // update pulse ref immediately
      const nextRadius = delta < 700 ? Math.min(500, pulseRef.current.radius + 100) : baseRadius;
      pulseRef.current = {
        x: clickX,
        y: clickY,
        radius: nextRadius,
        active: true,
        id: pulseRef.current.id + 1
      };

      // ensure cursor is at click point so repel is applied immediately
      cursorRef.current = { x: clickX, y: clickY };

      // clear any existing pulse timeouts
      pulseTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      pulseTimeoutsRef.current = [];

      // apply pulse to stars on next animation frame for zero-latency visual response
      window.requestAnimationFrame(() => {
        const currentStars = starsRef.current;
        const pulse = pulseRef.current;

        currentStars.forEach((star, index) => {
          const element = starRefs.current[index];
          if (!element) return;

          const pulseDistance = Math.sqrt((star.x - pulse.x) * (star.x - pulse.x) + (star.y - pulse.y) * (star.y - pulse.y));
          if (pulseDistance >= pulse.radius) return;

          const pulseDelay = Math.min(pulseDistance / 600, 0.35);
          const duration = 450; // ms, matches previous 0.45s

          // schedule pulse: fade out and scale down, then restore
          const hideTimeout = window.setTimeout(() => {
            // ensure transition is set
            element.style.transition = `transform ${duration}ms cubic-bezier(0.16,1,0.3,1), opacity ${duration}ms cubic-bezier(0.16,1,0.3,1)`;
            element.style.setProperty("--pulse-scale", "0.35");
            element.style.setProperty("--pulse-opacity", "0");
          }, Math.round(pulseDelay * 1000));

          const showTimeout = window.setTimeout(() => {
            element.style.setProperty("--pulse-scale", "1");
            element.style.setProperty("--pulse-opacity", "1");
          }, Math.round(pulseDelay * 1000) + duration);

          pulseTimeoutsRef.current.push(hideTimeout as unknown as number, showTimeout as unknown as number);
        });
      });

      // schedule pulse inactive flag to mirror previous behavior
      if (burstTimerRef.current) {
        window.clearTimeout(burstTimerRef.current);
      }
      burstTimerRef.current = window.setTimeout(() => {
        pulseRef.current.active = false;
      }, 520);
    };

    updateBounds();
    window.addEventListener("resize", updateBounds);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("resize", updateBounds);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("click", handleClick);
      // clear pulse timeouts
      pulseTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      pulseTimeoutsRef.current = [];
      if (burstTimerRef.current) {
        window.clearTimeout(burstTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let animationFrame = 0;

    const animate = () => {
      const currentStars = starsRef.current;
      const { x: cursorX, y: cursorY } = cursorRef.current;

      currentStars.forEach((star, index) => {
        const element = starRefs.current[index];
        if (!element) {
          return;
        }

        const dx = star.x - cursorX;
        const dy = star.y - cursorY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const repelRadius = 140;
        const repelStrength = 25;
        let offsetX = 0;
        let offsetY = 0;

        if (distance > 0 && distance < repelRadius) {
          const force = ((repelRadius - distance) / repelRadius) * repelStrength;
          offsetX = (dx / distance) * force;
          offsetY = (dy / distance) * force;
        }

        element.style.setProperty("--tx", `${offsetX}px`);
        element.style.setProperty("--ty", `${offsetY}px`);
      });

      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div
      ref={fieldRef}
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      {stars.map((star, index) => {
        return (
          <motion.span
            key={star.id}
            ref={(element) => {
              starRefs.current[star.id] = element;
              if (element) {
                // set default CSS vars and transitions for hover/pulse
                element.style.setProperty("--tx", "0px");
                element.style.setProperty("--ty", "0px");
                element.style.setProperty("--pulse-scale", "1");
                element.style.setProperty("--pulse-opacity", "1");
                element.style.transition = "transform 0.08s ease-out, opacity 0.45s cubic-bezier(0.16,1,0.3,1)";
              }
            }}
            className="pointer-events-none absolute select-none"
            style={{
              left: `${star.x}px`,
              top: `${star.y}px`,
              fontSize: `${star.size}px`,
              color: "rgba(255, 255, 255, 0.12)",
              opacity: "var(--pulse-opacity, 1)",
              transform:
                "translate(var(--tx, 0px), var(--ty, 0px)) scale(var(--pulse-scale, 1))"
            }}
            // pulse handled via direct DOM updates for clicks; hover offsets via CSS vars
          >
            ✦
          </motion.span>
        );
      })}
    </div>
  );
}
