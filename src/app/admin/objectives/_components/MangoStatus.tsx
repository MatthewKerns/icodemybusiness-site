"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface MangoSnapshots {
  byKind: Record<
    string,
    { payload?: unknown; ok: boolean; error?: string; fetchedAt: number; okAt?: number }
  >;
  lastOkAt: number | null;
  configured: boolean;
  stale: boolean;
  lastError?: string;
}

function since(ts: number): string {
  const minutes = Math.floor((Date.now() - ts) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function MangoStatus({
  snapshots,
  busy,
  onSync,
}: {
  snapshots: MangoSnapshots | undefined;
  busy: boolean;
  onSync: () => void;
}) {
  const state = !snapshots
    ? "loading"
    : !snapshots.configured
      ? "unconfigured"
      : snapshots.lastError
        ? "error"
        : snapshots.stale
          ? "stale"
          : "ok";

  const dot = {
    loading: "bg-text-dim",
    unconfigured: "bg-text-dim",
    error: "bg-red-500",
    stale: "bg-orange-400",
    ok: "bg-emerald-400",
  }[state];

  const label = {
    loading: "Mango: checking…",
    unconfigured: "Mango: not connected",
    error: `Mango: ${snapshots?.lastError ?? "error"}`,
    stale: `Mango: stale — last synced ${
      snapshots?.lastOkAt ? since(snapshots.lastOkAt) : "never"
    }`,
    ok: `Mango: synced ${snapshots?.lastOkAt ? since(snapshots.lastOkAt) : ""}`,
  }[state];

  return (
    <div className="flex items-center gap-2 text-xs text-text-dim">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} aria-hidden />
      <span className="min-w-0 truncate" title={label}>
        {label}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 shrink-0 px-2 text-xs"
        disabled={busy}
        onClick={onSync}
      >
        <RefreshCw className={cn("mr-1 h-3 w-3", busy && "animate-spin")} />
        Sync
      </Button>
    </div>
  );
}
