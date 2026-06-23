"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Tailwind badge tint per event category. */
const CATEGORY_TINT: Record<string, string> = {
  decision: "border-gold-dim text-gold",
  click: "border-blue/40 text-blue",
  form: "border-emerald-500/40 text-emerald-400",
  system: "border-border text-text-muted",
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AdminEventsPage() {
  const [nameFilter, setNameFilter] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<string | null>(null);

  const overview = useQuery(api.visitorEvents.adminEventCounts, {});
  const events = useQuery(api.visitorEvents.adminListEvents, {
    name: sessionFilter ? undefined : nameFilter ?? undefined,
    sessionId: sessionFilter ?? undefined,
    limit: 300,
  });

  const counts = overview?.counts ?? {};
  const sortedNames = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  return (
    <main className="min-h-screen bg-bg-primary p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Visitor Events
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Durable log of clicks and decisions made on the site — the system
              of record an admin reviews, captured independently of PostHog.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/admin/conversations" className="text-text-muted hover:text-gold">
              Conversations
            </Link>
            <Link href="/admin/applications" className="text-text-muted hover:text-gold">
              Applications
            </Link>
          </div>
        </div>

        {/* Event-name filter chips with counts */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={!nameFilter && !sessionFilter ? "default" : "outline"}
            onClick={() => {
              setNameFilter(null);
              setSessionFilter(null);
            }}
          >
            All{overview ? ` (${overview.sampled})` : ""}
          </Button>
          {sortedNames.map((name) => (
            <Button
              key={name}
              size="sm"
              variant={nameFilter === name && !sessionFilter ? "default" : "outline"}
              onClick={() => {
                setSessionFilter(null);
                setNameFilter((cur) => (cur === name ? null : name));
              }}
            >
              {name} ({counts[name]})
            </Button>
          ))}
        </div>

        {/* Active session-timeline banner */}
        {sessionFilter && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-gold-dim bg-gold/5 px-4 py-2">
            <span className="text-sm text-text-muted">
              Showing the full timeline for session{" "}
              <code className="text-gold">{sessionFilter}</code> (oldest first)
            </span>
            <Button size="sm" variant="outline" onClick={() => setSessionFilter(null)}>
              Clear
            </Button>
          </div>
        )}

        <div className="mt-6 rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Visitor</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-text-muted">
                    No events captured yet.
                  </TableCell>
                </TableRow>
              )}
              {events?.map((e) => (
                <TableRow key={e._id}>
                  <TableCell className="whitespace-nowrap text-xs text-text-muted">
                    {formatTime(e.timestamp)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-text-primary">{e.name}</div>
                    <Badge
                      variant="outline"
                      className={CATEGORY_TINT[e.category] ?? CATEGORY_TINT.system}
                    >
                      {e.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-text-muted">
                    {e.page ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {e.sessionId ? (
                      <button
                        type="button"
                        onClick={() => setSessionFilter(e.sessionId ?? null)}
                        className="font-mono text-blue hover:text-gold"
                        title="View this visitor's full timeline"
                      >
                        {e.sessionId.slice(0, 8)}…
                      </button>
                    ) : (
                      <span className="text-text-muted">anon</span>
                    )}
                    {e.clerkUserId && (
                      <div className="mt-0.5 font-mono text-emerald-400">
                        {e.clerkUserId.slice(0, 12)}…
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {e.props && Object.keys(e.props).length > 0 ? (
                      <code className="block max-w-xs overflow-x-auto whitespace-pre rounded bg-bg-secondary px-2 py-1 text-[11px] text-text-muted">
                        {JSON.stringify(e.props)}
                      </code>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {events === undefined && (
          <p className="mt-4 text-sm text-text-muted">Loading events…</p>
        )}
      </div>
    </main>
  );
}
