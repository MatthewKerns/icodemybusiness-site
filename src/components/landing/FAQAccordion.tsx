"use client";

import { useState, useId } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  cta?: { text: string; href: string };
}

interface FAQAccordionProps {
  items: FAQItem[];
}

function FAQRow({ item, index }: { item: FAQItem; index: number }) {
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const panelId = `${baseId}-panel`;

  return (
    <div
      className={cn(
        "rounded-xl border bg-bg-secondary transition-colors",
        open ? "border-gold-dim" : "border-border"
      )}
    >
      <button
        id={triggerId}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-base font-medium text-text-primary">
          {item.question}
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-gold transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className={cn(
          "grid transition-all duration-200",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
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
        </div>
      </div>
    </div>
  );
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <FAQRow key={i} item={item} index={i} />
      ))}
    </div>
  );
}
