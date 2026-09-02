"use client";

import { useState } from "react";
import { ChevronDown, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { VSL } from "@/content/landing";
import {
  WeekDiagram,
  MechanismDiagram,
  RhythmDiagram,
} from "./VslDiagrams";

/**
 * The letter's opening beat: the promise, then the long-form argument.
 *
 * Collapsible on purpose. The headline and subhead always read — they are the
 * hook and must survive any state — while the depth sits behind a control the
 * reader chooses to open. That keeps the single next action ("Assess where you
 * are now") from competing with a wall of explanation, without hiding the
 * argument from anyone who wants it.
 *
 * It defaults to open: this is the main event, and a page whose substance is
 * collapsed by default shows nothing in its first frame. Once the VSL is
 * recorded it plays here, above the diagrams rather than instead of them — a
 * reader who won't press play still needs the argument.
 */
export function VslSection() {
  const [open, setOpen] = useState(true);

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-h1 font-display font-semibold leading-tight text-text-primary">
          {VSL.headline}
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-muted">
          {VSL.subhead}
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-4xl">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="vsl-panel"
          className={cn(
            "group flex w-full items-center justify-center gap-2.5 rounded-md border border-border",
            "px-6 py-3.5 text-sm font-medium text-text-primary",
            "transition-colors duration-300 hover:border-gold-dim",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-light",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
          )}
        >
          {open ? "Hide the walkthrough" : "See how this works"}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-gold transition-transform duration-300",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>

        <div id="vsl-panel" hidden={!open} className="mt-8">
          {VSL.src ? (
            <div className="mb-14 aspect-video w-full overflow-hidden rounded-xl border border-border bg-bg-secondary">
              {VSL.kind === "file" ? (
                <video
                  className="h-full w-full"
                  controls
                  preload="metadata"
                  playsInline
                >
                  <source src={VSL.src} type="video/mp4" />
                  Your browser doesn&apos;t support embedded video.
                </video>
              ) : (
                <iframe
                  className="h-full w-full"
                  src={VSL.src}
                  title="A message from Matthew Kerns"
                  allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              )}
            </div>
          ) : (
            /*
              No video yet. This is a one-line note rather than a fake player —
              nothing here pretends to be pressable, and the diagrams below carry
              the argument in the meantime.
            */
            <p className="mb-12 flex items-center justify-center gap-2.5 text-sm text-text-dim">
              <PlayCircle className="h-4 w-4 text-gold-dim" aria-hidden="true" />
              {VSL.posterEyebrow} — coming shortly. Here it is in pictures.
            </p>
          )}

          <div className="space-y-14">
            <WeekDiagram />
            <MechanismDiagram />
            <RhythmDiagram />
          </div>
        </div>
      </div>
    </section>
  );
}
