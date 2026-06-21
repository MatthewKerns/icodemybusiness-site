"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";

interface CopyRowProps {
  /** Uppercase label above the value. */
  label: string;
  /** The text to display and copy. */
  value: string;
  /** Render as a multi-line code block (e.g. JSON) instead of a single-line row. */
  multiline?: boolean;
}

/** A read-only code value with a copy-to-clipboard button. */
export function CopyRow({ label, value, multiline = false }: CopyRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — value is still selectable.
    }
  };

  const button = (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={`Copy ${label}`}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-3 text-sm font-medium text-text-muted transition-colors hover:border-gold-dim hover:text-gold",
        multiline ? "absolute right-2 top-2 py-1.5" : "py-0"
      )}
    >
      {copied ? (
        <Check className="h-4 w-4 text-success" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
    </button>
  );

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
        {label}
      </p>
      {multiline ? (
        <div className="relative mt-1.5">
          <pre className="overflow-x-auto rounded-lg border border-border bg-bg-primary p-3 pr-24 font-accent text-xs leading-relaxed text-text-primary">
            {value}
          </pre>
          {button}
        </div>
      ) : (
        <div className="mt-1.5 flex items-stretch gap-2">
          <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-border bg-bg-primary px-3 py-2.5 font-accent text-sm text-text-primary">
            {value}
          </code>
          {button}
        </div>
      )}
    </div>
  );
}
