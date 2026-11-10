"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { SENDS_PER_INBOX_PER_DAY, WARMUP_MIN_DAYS } from "@/lib/coldoutbound/benchmarks";
import { Empty, Field, INBOX_LABEL, NativeSelect, errorText } from "./shared";

const DAY_MS = 86_400_000;
const STATUS_OPTIONS = Object.entries(INBOX_LABEL).map(([value, label]) => ({ value, label }));
type InboxStatus = "warming" | "ready" | "sending" | "resting" | "flagged" | "retired";

const STATUS_TINT: Record<string, string> = {
  warming: "border-blue/40 text-blue",
  ready: "border-emerald-500/40 text-emerald-400",
  sending: "border-gold-dim text-gold",
  resting: "border-border text-text-muted",
  flagged: "border-error/50 text-error",
  retired: "border-border text-text-dim",
};

export function InboxesTab() {
  const data = useQuery(api.outbound.listInboxes, {});
  const save = useMutation(api.outbound.saveInbox);
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState<string>("warming");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (data === undefined) return <p className="mt-6 text-sm text-text-muted">Loading…</p>;

  const short = data.backups < data.backupMin;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await save({ email, provider: provider || undefined, status: status as InboxStatus });
      setEmail("");
      setProvider("");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const change = async (
    inbox: { id: Id<"sendingInboxes">; email: string; provider: string | null; dailyLimit: number | null; notes: string | null },
    next: string
  ) => {
    setError(null);
    try {
      await save({
        inboxId: inbox.id,
        email: inbox.email,
        provider: inbox.provider ?? undefined,
        dailyLimit: inbox.dailyLimit ?? undefined,
        notes: inbox.notes ?? undefined,
        status: next as InboxStatus,
      });
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="mt-4">
      <div
        className={cn(
          "rounded-lg border p-4",
          short ? "border-gold-dim bg-gold/5" : "border-border bg-bg-secondary/40"
        )}
      >
        <p className="text-sm font-medium text-text-primary">
          {data.backups} backup inbox{data.backups === 1 ? "" : "es"} warming or ready
          {short ? `, ${data.backupMin - data.backups} short` : ""}
        </p>
        <p className="mt-1 text-sm text-text-muted">
          Keep {data.backupMin} to {data.backupMax} warming at all times, even when you don&apos;t
          need them. An address can go undeliverable for a stretch after one bad send or a spam
          flag, and a new inbox takes at least {WARMUP_MIN_DAYS} days to warm.
        </p>
      </div>

      <form onSubmit={(e) => void add(e)} className="mt-4 flex flex-wrap items-end gap-3">
        <Field label="Inbox address">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-64" />
        </Field>
        <Field label="Provider">
          <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Google, Microsoft…" className="w-44" />
        </Field>
        <Field label="Status">
          <NativeSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? "Adding…" : "Add inbox"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      )}

      {data.inboxes.length === 0 ? (
        <div className="mt-6">
          <Empty title="No inboxes tracked yet">
            Add every address that sends cold email, or is warming up to. Use separate sending
            domains, never the main business domain.
          </Empty>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inbox</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Warm-up</TableHead>
                <TableHead>Daily limit</TableHead>
                <TableHead>Change status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.inboxes.map((inbox) => {
                const days = inbox.warmupStartedAt
                  ? Math.floor((Date.now() - inbox.warmupStartedAt) / DAY_MS)
                  : null;
                return (
                  <TableRow key={inbox.id}>
                    <TableCell>
                      <p className="font-medium text-text-primary">{inbox.email}</p>
                      {inbox.provider && <p className="text-xs text-text-muted">{inbox.provider}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_TINT[inbox.status]}>
                        {INBOX_LABEL[inbox.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-text-muted">
                      {days === null
                        ? "—"
                        : inbox.status === "warming"
                          ? days >= WARMUP_MIN_DAYS
                            ? `day ${days}: warm enough to mark ready`
                            : `day ${days} of ${WARMUP_MIN_DAYS}`
                          : `started ${days}d ago`}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-text-muted">
                      {inbox.dailyLimit ?? `${SENDS_PER_INBOX_PER_DAY} (default)`}
                    </TableCell>
                    <TableCell>
                      <NativeSelect
                        label={`Status for ${inbox.email}`}
                        value={inbox.status}
                        onChange={(next) => void change(inbox, next)}
                        options={STATUS_OPTIONS}
                        className="h-8"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
