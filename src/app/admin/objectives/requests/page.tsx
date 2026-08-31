"use client";

import { useQuery } from "convex/react";
import { Lightbulb, Wrench, MessageSquare } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_TINT: Record<string, string> = {
  pending: "border-border text-text-muted",
  proposed: "border-blue/40 text-blue",
  applied: "border-emerald-500/40 text-emerald-400",
  edited_applied: "border-emerald-500/40 text-emerald-400",
  rejected: "border-orange-500/40 text-orange-400",
  reverted: "border-orange-500/40 text-orange-400",
  failed: "border-red-500/40 text-red-400",
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminReorgRequestsPage() {
  const patterns = useQuery(api.objectivesIntake.reorgPatterns, {});
  const requests = useQuery(api.objectivesIntake.listRequests, { limit: 100 });

  return (
    <main id="main-content" className="px-4 py-8 md:px-6 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-h2 font-bold text-text-primary">Re-plan requests</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Every reorganization you ask for, and what the tooling could not do.
            The gaps below are the evidence for which reorganization features are
            worth building next — for you first, and for customers after.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-blue" />
                Gaps worth building
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patterns === undefined ? (
                <p className="py-4 text-sm text-text-muted">Loading…</p>
              ) : patterns.unmapped.length === 0 ? (
                <p className="py-4 text-sm text-text-muted">
                  Nothing recorded yet. Ask for something the ops can&apos;t express
                  and it will show up here instead of being approximated.
                </p>
              ) : (
                <ul className="space-y-3">
                  {patterns.unmapped.map((intent) => (
                    <li key={intent.intentKey}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-accent text-sm text-blue">
                          {intent.intentKey}
                        </span>
                        <span className="shrink-0 text-xs text-text-dim">
                          {intent.count}× · last {formatTime(intent.lastSeen)}
                        </span>
                      </div>
                      <ul className="mt-1 space-y-0.5">
                        {intent.examples.map((example, i) => (
                          <li key={i} className="text-xs text-text-muted">
                            — {example}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-4 w-4 text-gold" />
                What is actually carrying the weight
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {patterns === undefined ? (
                <p className="py-4 text-sm text-text-muted">Loading…</p>
              ) : (
                <>
                  <dl className="grid grid-cols-3 gap-3 text-center">
                    {(
                      [
                        ["Applied", patterns.disposition.applied],
                        ["Edited first", patterns.disposition.edited],
                        ["Discarded", patterns.disposition.rejected],
                        ["Undone", patterns.disposition.reverted],
                        ["Failed", patterns.disposition.failed],
                        ["Total", patterns.total],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-bg-tertiary/50 py-2">
                        <dt className="text-xs text-text-dim">{label}</dt>
                        <dd className="font-accent text-lg text-text-primary">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {patterns.opUsage.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs uppercase tracking-wide text-text-dim">
                        Operations applied
                      </p>
                      <ul className="flex flex-wrap gap-1.5">
                        {patterns.opUsage.map((entry) => (
                          <li key={entry.op}>
                            <Badge variant="outline" className="border-border text-text-muted">
                              {entry.op} · {entry.count}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-text-dim">
                    A high edited-or-discarded rate means the operation exists but the
                    mapping is wrong — a prompt problem, not a missing feature.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-text-muted" />
              Request log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requests === undefined ? (
              <p className="py-8 text-center text-text-muted">Loading…</p>
            ) : requests.length === 0 ? (
              <p className="py-8 text-center text-text-muted">
                No requests yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Request</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ops</TableHead>
                      <TableHead className="text-right">Gaps</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request._id}>
                        <TableCell className="whitespace-nowrap text-xs text-text-dim">
                          {formatTime(request.createdAt)}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <span className="block text-sm text-text-primary">
                            {request.rawText}
                          </span>
                          {request.rationale && (
                            <span className="mt-0.5 block text-xs text-text-dim">
                              {request.rationale}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "whitespace-nowrap",
                              STATUS_TINT[request.status] ?? STATUS_TINT.pending,
                            )}
                          >
                            {request.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-text-muted">
                          {
                            ((request.appliedOps ?? request.proposedOps ?? []) as unknown[])
                              .length
                          }
                        </TableCell>
                        <TableCell className="text-right text-sm text-text-muted">
                          {(request.unmapped ?? []).length || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
