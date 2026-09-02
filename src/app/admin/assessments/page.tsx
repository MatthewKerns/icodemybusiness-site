"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PATHS } from "@/content/landing";

const STATUSES = ["processing", "ready", "contacted", "booked", "closed", "failed"];

const SUMMARY_ROWS: { key: string; label: string }[] = [
  { key: "problem", label: "Problem" },
  { key: "impact", label: "Impact" },
  { key: "history", label: "History" },
  { key: "stakes", label: "Stakes" },
  { key: "idealOutcome", label: "Ideal outcome" },
  { key: "thisWeekAction", label: "This-week action" },
];

export default function AdminAssessmentsPage() {
  const assessments = useQuery(api.discoveryAssessments.adminListAssessments, {});
  const [selectedId, setSelectedId] = useState<Id<"assessments"> | null>(null);
  const selected = useQuery(
    api.discoveryAssessments.adminGetAssessment,
    selectedId ? { assessmentId: selectedId } : "skip"
  );
  const saveBrief = useMutation(api.discoveryAssessments.saveInternalBrief);
  const setStatus = useMutation(api.discoveryAssessments.setAssessmentStatus);

  const [briefDraft, setBriefDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBriefDraft(selected?.internalBrief ?? "");
  }, [selected?._id, selected?.internalBrief]);

  const pathName = (key?: string) =>
    PATHS.find((p) => p.key === key)?.name ?? key ?? "—";

  return (
    <main className="min-h-screen bg-bg-primary p-6 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-text-primary">
          Discovery Assessments
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Five-question intake from the homepage and /assessment. The internal
          brief is never sent to the visitor.
        </p>

        <div className="mt-6 rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visitor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Report email</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-text-muted">
                    No assessments yet.
                  </TableCell>
                </TableRow>
              )}
              {assessments?.map((a) => (
                <TableRow key={a._id}>
                  <TableCell>
                    <div className="font-medium text-text-primary">
                      {a.name ?? "—"}
                    </div>
                    <div className="text-xs text-text-muted">{a.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{a.status}</Badge>
                  </TableCell>
                  <TableCell className="text-text-muted">
                    {pathName(a.summary?.recommendedPath)}
                  </TableCell>
                  <TableCell>
                    {a.emailSent ? (
                      <span className="text-emerald-400">sent</span>
                    ) : (
                      <span className="text-text-muted">pending</span>
                    )}
                  </TableCell>
                  <TableCell className="text-text-muted">
                    {a.clerkUserId ? "linked" : "guest"}
                  </TableCell>
                  <TableCell className="text-text-muted">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedId(a._id)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.name ?? selected?.email ?? "Assessment"}
            </DialogTitle>
            <DialogDescription>
              {selected?.email}
              {selected?.source ? ` · ${selected.source}` : ""}
              {selected?.sessionId ? ` · session ${selected.sessionId}` : ""}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-text-muted">Status:</span>
                {STATUSES.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={selected.status === s ? "default" : "outline"}
                    onClick={() =>
                      void setStatus({ assessmentId: selected._id, status: s })
                    }
                  >
                    {s}
                  </Button>
                ))}
              </div>

              {selected.processingError && (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  {selected.processingError}
                </p>
              )}

              <div>
                <h4 className="mb-1 text-sm font-semibold text-text-primary">
                  The five answers
                </h4>
                <div className="space-y-3 rounded-md border border-border bg-bg-secondary p-3 text-xs">
                  {selected.answers.map((a) => (
                    <div key={a.key}>
                      <p className="text-text-dim">{a.question}</p>
                      <p className="mt-0.5 text-text-primary">{a.summary}</p>
                      {a.quotes.length > 0 && (
                        <p className="mt-0.5 text-text-muted">
                          “{a.quotes.join("” · “")}”
                        </p>
                      )}
                      {a.numbers ? (
                        <p className="mt-0.5 font-mono text-text-muted">
                          {JSON.stringify(a.numbers)}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-1 text-sm font-semibold text-text-primary">
                  Visitor summary (emailed)
                </h4>
                {selected.summary ? (
                  <div className="space-y-2 rounded-md border border-border bg-bg-secondary p-3 text-xs">
                    <p>
                      <span className="text-text-dim">Recommended path: </span>
                      <span className="text-gold">
                        {pathName(selected.summary.recommendedPath)}
                      </span>
                    </p>
                    {SUMMARY_ROWS.map((row) => (
                      <p key={row.key}>
                        <span className="text-text-dim">{row.label}: </span>
                        <span className="text-text-primary">
                          {
                            (selected.summary as Record<string, string>)[
                              row.key
                            ]
                          }
                        </span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">Not generated yet.</p>
                )}
              </div>

              <div>
                <h4 className="mb-1 text-sm font-semibold text-gold">
                  Internal pre-call brief (never sent to the visitor)
                </h4>
                <Textarea
                  value={briefDraft}
                  onChange={(e) => setBriefDraft(e.target.value)}
                  rows={12}
                  className="text-sm"
                />
                <Button
                  className="mt-2"
                  size="sm"
                  disabled={saving}
                  onClick={() => {
                    void (async () => {
                      setSaving(true);
                      try {
                        await saveBrief({
                          assessmentId: selected._id,
                          internalBrief: briefDraft,
                        });
                      } finally {
                        setSaving(false);
                      }
                    })();
                  }}
                >
                  {saving ? "Saving…" : "Save brief"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
