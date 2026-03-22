"use client";

import { motion, useReducedMotion } from "framer-motion";

interface Metric {
  value: string;
  label: string;
}

const METRICS: Metric[] = [
  { value: "15+", label: "Years Experience" },
  { value: "Premium", label: "Consulting" },
  { value: "3", label: "Free Tools" },
];

export function SocialProofBar() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-12 lg:py-16">
      <dl
        className="mx-auto flex max-w-3xl flex-col items-center gap-8 md:flex-row md:justify-center md:gap-12 lg:gap-16"
        aria-label="Credentials"
      >
        {METRICS.map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.4,
              delay: prefersReducedMotion ? 0 : i * 0.1,
              ease: "easeOut" as const,
            }}
            className="text-center"
          >
            <dt className="font-accent text-3xl font-bold text-gold lg:text-4xl">
              {metric.value}
            </dt>
            <dd className="mt-1 text-sm text-text-muted">{metric.label}</dd>
          </motion.div>
        ))}
      </dl>
    </section>
  );
}
