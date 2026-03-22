"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";

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
      className="relative flex h-screen flex-col items-center justify-center bg-bg-primary"
    >
      <a
        href="#main-content"
        className="absolute left-4 top-4 -translate-y-full rounded bg-gold px-4 py-2 text-black transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      <div className="flex flex-col items-center gap-2">
        <motion.h1
          custom={0}
          initial="hidden"
          animate="visible"
          variants={lineVariants}
          className="text-display font-body font-extrabold text-gold"
        >
          SAVE TIME.
        </motion.h1>
        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={lineVariants}
          className="text-display font-body font-extrabold text-gold"
        >
          MAKE MONEY.
        </motion.h1>
        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={lineVariants}
          className="text-display font-body italic text-gold"
        >
          make a difference.
        </motion.p>
      </div>

      <motion.button
        custom={3}
        initial="hidden"
        animate="visible"
        variants={lineVariants}
        onClick={scrollToContent}
        aria-label="Enter site"
        className="mt-12 text-lg font-medium text-blue focus-visible:ring-2 focus-visible:ring-blue-light"
      >
        <motion.span
          animate={
            prefersReducedMotion
              ? {}
              : {
                  opacity: [1, 0.5, 1],
                  scale: [1, 1.05, 1],
                }
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="inline-block"
        >
          click here
        </motion.span>
      </motion.button>
    </div>
  );
}
