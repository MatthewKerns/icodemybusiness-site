"use client";

import { motion, useReducedMotion } from "framer-motion";

interface StoryBlockProps {
  number: string;
  heading: string;
  body: string;
  accentWord?: string;
}

export function StoryBlock({ number, heading, body, accentWord }: StoryBlockProps) {
  const prefersReducedMotion = useReducedMotion();

  const renderedBody = accentWord
    ? body.split(accentWord).reduce((acc, part, i, arr) => {
        acc.push(part);
        if (i < arr.length - 1) {
          acc.push(
            <span key={i} className="text-gold font-medium">
              {accentWord}
            </span>,
          );
        }
        return acc;
      }, [] as React.ReactNode[])
    : body;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: "easeOut" as const }}
      className="py-8"
    >
      <span className="font-accent text-sm font-medium text-gold-dim">{number}</span>
      <h3 className="mt-2 text-h3 font-bold text-text-primary">{heading}</h3>
      <p className="mt-3 text-base leading-relaxed text-text-muted">{renderedBody}</p>
    </motion.div>
  );
}
