"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CaseStudyCard } from "./CaseStudyCard";

const TABS = ["ALL", "CONSULTING", "AUTOMATION", "AI_TOOLS"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  ALL: "All",
  CONSULTING: "Consulting",
  AUTOMATION: "Automation",
  AI_TOOLS: "AI Tools",
};

interface CaseStudy {
  slug: string;
  category: string;
  title: string;
  summary: string;
  metric: string;
  challenge: string;
  solution: string;
  results: string;
}

interface CaseStudyFilterProps {
  studies: CaseStudy[];
}

export function CaseStudyFilter({ studies }: CaseStudyFilterProps) {
  const [activeTab, setActiveTab] = useState<Tab>("ALL");

  const filtered =
    activeTab === "ALL"
      ? studies
      : studies.filter((s) => s.category === activeTab);

  const panelId = "case-study-panel";

  function handleTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = TABS.indexOf(activeTab);
    let nextIndex: number | null = null;

    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = TABS.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      setActiveTab(TABS[nextIndex]);
      // Focus the newly active tab button
      const tablist = e.currentTarget.parentElement;
      const buttons = tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[nextIndex]?.focus();
    }
  }

  return (
    <div>
      {/* Tab bar */}
      <div role="tablist" aria-label="Filter case studies" className="mb-8 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={panelId}
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => setActiveTab(tab)}
            onKeyDown={handleTabKeyDown}
            className={cn(
              "relative rounded-lg px-4 py-2 font-accent text-xs uppercase tracking-wider transition-colors",
              activeTab === tab
                ? "text-gold"
                : "text-text-dim hover:text-text-muted"
            )}
          >
            {activeTab === tab && (
              <motion.span
                layoutId="case-study-tab-indicator"
                className="absolute inset-0 rounded-lg border border-gold bg-gold/5"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{TAB_LABELS[tab]}</span>
          </button>
        ))}
      </div>

      {/* Card grid */}
      <motion.div
        id={panelId}
        role="tabpanel"
        aria-label={`${TAB_LABELS[activeTab]} case studies`}
        layout
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((study) => (
            <motion.div
              key={study.slug}
              layoutId={study.slug}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <CaseStudyCard {...study} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
