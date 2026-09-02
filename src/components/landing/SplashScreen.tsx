"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function SplashScreen() {
  const splashRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const scrollToContent = useCallback(() => {
    const content = document.getElementById("main-content");
    if (content) {
      content.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    const el = splashRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        window.dispatchEvent(
          new CustomEvent("splash-visibility", {
            detail: { visible: entry.isIntersecting },
          })
        );
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const lineVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.3,
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: "easeOut" as const,
      },
    }),
  };

  return (
    <div
      ref={splashRef}
      role="banner"
      className="relative flex h-screen flex-col items-center justify-center bg-bg-primary px-4"
    >
      <div className="flex flex-col items-center text-center">
        {/* The commercial promise is deliberately subordinate — it sets up the payoff. */}
        <motion.p
          custom={0}
          initial="hidden"
          animate="visible"
          variants={lineVariants}
          className="text-sm font-medium uppercase tracking-[0.2em] text-text-muted sm:text-base"
        >
          Save time. Make money.
        </motion.p>

        {/* The payoff carries the page. */}
        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={lineVariants}
          className="mt-4 text-display font-display font-semibold italic text-gold"
        >
          Make a Difference.
        </motion.h1>
      </div>

      <motion.button
        custom={2}
        initial="hidden"
        animate="visible"
        variants={lineVariants}
        onClick={scrollToContent}
        className={cn(
          "group mt-12 inline-flex items-center gap-2.5 rounded-md bg-gold px-8 py-4",
          "text-base font-semibold tracking-wide text-black",
          "transition-all duration-300 hover:bg-gold-light",
          "hover:shadow-[0_0_34px_-6px_rgba(212,175,55,0.55)]",
          "motion-safe:hover:-translate-y-px",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-light",
          "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
        )}
      >
        Start Now
        <svg
          width="11"
          height="7"
          viewBox="0 0 11 7"
          fill="none"
          aria-hidden="true"
          className="transition-transform duration-300 motion-safe:group-hover:translate-y-0.5"
        >
          <path
            d="M1 1L5.5 5.5L10 1"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </motion.button>
    </div>
  );
}
