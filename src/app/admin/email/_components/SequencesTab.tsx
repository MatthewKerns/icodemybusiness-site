"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Empty, SectionTitle, errorText, fmtDate } from "./shared";

const REASON_LABEL: Record<string, string> = {
  unsubscribe: "Unsubscribed",
  hard_bounce: "Bounced",
  complaint: "Marked as spam",
  manual: "Stopped by you",
};

/** The follow-up sequences for site leads, who is in them, and the do-not-email list. */
export function SequencesTab() {
  const data = useQuery(api.emailOps.sequences, {});
  const suppressions = useQuery(api.emailOps.listSuppressions, {});
  const setPaused = useMutation(api.emailOps.setSequencesPaused);
  const setEnrollmentStatus = useMutation(api.emailOps.setEnrollmentStatus);
  const setSuppressed = useMutation(api.emailOps.setSuppressed);

  const [confirmOn, setConfirmOn] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (data === undefined) return <p className="mt-6 text-sm text-text-muted">Loading…</p>;

  /** Fire-and-report: handlers call this and return nothing. */
  const run = (fn: () => Promise<unknown>): void => {
    setError(null);
    fn().catch((err: unknown) => setError(errorText(err)));
  };

  const live = data.enrollments.filter((e) => e.status !== "exited");

  return (
    <div className="mt-4">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4",
          data.paused ? "border-border bg-bg-secondary/40" : "border-emerald-500/40 bg-emerald-500/5"
        )}
      >
        <div>
          <p className="text-sm font-medium text-text-primary">
            Sequence sending is {data.paused ? "paused" : "on"}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {data.paused
              ? "Nothing goes out. People stay where they are in a sequence and pick up when you turn it on."
              : "Due steps go out every 15 minutes to people who opted in. Steps with no copy are never sent."}
          </p>
        </div>
        {data.paused ? (
          <Button onClick={() => setConfirmOn(true)}>Turn sending on</Button>
        ) : (
          <Button variant="outline" onClick={() => run(() => setPaused({ paused: true }))}>
            Pause all sending
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      )}

      <SectionTitle>Sequences</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.tracks.map((t) => {
          const written = t.steps.filter((s) => s.authored).length;
          return (
            <Card key={t.key}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base text-text-primary">{t.label}</CardTitle>
                  <span className="text-xs text-text-muted">
                    {t.active} active · {t.paused} paused · {t.exited} ended
                  </span>
                </div>
                <p className={cn("text-xs", written === t.steps.length ? "text-emerald-400" : "text-gold")}>
                  {written} of {t.steps.length} emails written
                </p>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm">
                  {t.steps.map((s, i) => (
                    <li key={s.key} className="flex gap-2">
                      <span
                        className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", s.authored ? "bg-emerald-400" : "bg-border")}
                        aria-hidden
                      />
                      <span>
                        <span className="text-text-primary">
                          Day {t.steps.slice(0, i + 1).reduce((a, x) => a + x.delayDays, 0)}:{" "}
                          {s.subject ?? "not written yet"}
                        </span>
                        <span className="block text-xs text-text-muted">{s.role}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <SectionTitle>In a sequence now</SectionTitle>
      {live.length === 0 ? (
        <Empty title="Nobody is in a sequence">
          A lead is enrolled when they opt in on a form. Nobody is added by hand.
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Sequence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Next due</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {live.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-text-primary">{e.email}</TableCell>
                  <TableCell className="text-text-muted">
                    {data.tracks.find((t) => t.key === e.track)?.label ?? e.track}
                  </TableCell>
                  <TableCell className="text-text-muted">{e.status}</TableCell>
                  <TableCell className="tabular-nums text-text-muted">{e.lastStepSent}</TableCell>
                  <TableCell className="text-text-muted">{fmtDate(e.nextDueAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          run(() =>
                            setEnrollmentStatus({
                              enrollmentId: e.id,
                              status: e.status === "active" ? "paused" : "active",
                            })
                          )
                        }
                      >
                        {e.status === "active" ? "Pause" : "Resume"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => run(() => setEnrollmentStatus({ enrollmentId: e.id, status: "exited" }))}
                      >
                        End
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SectionTitle>Do not email</SectionTitle>
      <form
        className="mb-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await setSuppressed({ email, suppressed: true });
            setEmail("");
          });
        }}
      >
        <Input
          type="email"
          required
          aria-label="Address to stop emailing"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9 w-72"
        />
        <Button type="submit" variant="outline">
          Stop all email to this address
        </Button>
      </form>
      {suppressions === undefined ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : suppressions.length === 0 ? (
        <Empty title="Nobody is on the list">
          Unsubscribes, permanent bounces and spam complaints are added automatically.
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Why</TableHead>
                <TableHead>Stops</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppressions.map((s) => (
                <TableRow key={s.id} className={s.live ? undefined : "opacity-50"}>
                  <TableCell className="text-text-primary">{s.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-border text-text-muted">
                      {REASON_LABEL[s.reason] ?? s.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-text-muted">
                    {s.live ? (s.scope === "all" ? "all email" : "marketing only") : "lifted"}
                  </TableCell>
                  <TableCell className="text-text-muted">{fmtDate(s.createdAt)}</TableCell>
                  <TableCell>
                    {s.live && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => run(() => setSuppressed({ email: s.email, suppressed: false }))}
                      >
                        Allow again
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={confirmOn} onOpenChange={setConfirmOn}>
        <AlertDialogContent className="border-border bg-bg-primary">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary">Turn sequence sending on?</AlertDialogTitle>
            <AlertDialogDescription>
              {data.enrollments.filter((e) => e.status === "active").length} people are active in a
              sequence. Any step that is due and has copy written will start going out within 15
              minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep paused</AlertDialogCancel>
            <AlertDialogAction onClick={() => run(() => setPaused({ paused: false }))}>
              Turn sending on
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
