"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface FAQItem {
  question: string;
  answer: string;
  cta?: { text: string; href: string };
}

interface FAQAccordionProps {
  items: FAQItem[];
}

function FAQRow({ item }: { item: FAQItem }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <details
      className={cn(
        "group rounded-xl border bg-bg-secondary transition-colors",
        "open:border-gold-dim border-border"
      )}
    >
      <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left [&::-webkit-details-marker]:hidden">
        <span className="text-base font-medium text-text-primary">
          {item.question}
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-gold transition-transform duration-200",
            "group-open:rotate-180"
          )}
        />
      </summary>

      <AnimatePresence>
        <motion.div
          initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          className="overflow-hidden"
        >
          <div className="px-6 pb-5">
            <p className="text-sm leading-relaxed text-text-muted">
              {item.answer}
            </p>
            {item.cta && (
              <a
                href={item.cta.href}
                className="mt-3 inline-block font-accent text-sm font-medium text-gold transition-colors hover:text-gold-light"
              >
                {item.cta.text} &rarr;
              </a>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </details>
  );
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <FAQRow key={item.question} item={item} />
      ))}
    </div>
  );
}
