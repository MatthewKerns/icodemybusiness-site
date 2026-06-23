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

const STATUSES = ["new", "processing", "processed", "proposed", "closed"];

export default function AdminApplicationsPage() {
  const applications = useQuery(api.applications.adminListApplications, {});
  const [selectedId, setSelectedId] = useState<Id<"applications"> | null>(null);
  const selected = useQuery(
    api.applications.adminGetApplication,
    selectedId ? { applicationId: selectedId } : "skip"
  );
  const saveProposal = useMutation(api.applications.saveInternalProposal);
  const setStatus = useMutation(api.applications.setApplicationStatus);

  const [proposalDraft, setProposalDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProposalDraft(selected?.internalProposal ?? "");
  }, [selected?._id, selected?.internalProposal]);

  return (
    <main className="min-h-screen bg-bg-primary p-6 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-text-primary">
          Custom Tools Applications
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          E-commerce intake applications. The internal proposal is never sent to
          the applicant.
        </p>

        <div className="mt-6 rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Follow-up email</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-text-muted">
                    No applications yet.
                  </TableCell>
                </TableRow>
              )}
              {applications?.map((app) => (
                <TableRow key={app._id}>
                  <TableCell>
                    <div className="font-medium text-text-primary">
                      {app.name ?? "—"}
                    </div>
                    <div className="text-xs text-text-muted">{app.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{app.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {app.followupEmailSent ? (
                      <span className="text-emerald-400">sent</span>
                    ) : (
                      <span className="text-text-muted">pending</span>
                    )}
                  </TableCell>
                  <TableCell className="text-text-muted">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedId(app._id)}
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
              {selected?.name ?? selected?.email ?? "Application"}
            </DialogTitle>
            <DialogDescription>{selected?.email}</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              {/* Status controls */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-text-muted">Status:</span>
                {STATUSES.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={selected.status === s ? "default" : "outline"}
                    onClick={() =>
                      void setStatus({
                        applicationId: selected._id,
                        status: s,
                      })
                    }
                  >
                    {s}
                  </Button>
                ))}
              </div>

              {/* Extracted intake profile */}
              <div>
                <h4 className="mb-1 text-sm font-semibold text-text-primary">
                  Intake profile
                </h4>
                <pre className="max-h-48 overflow-auto rounded-md border border-border bg-bg-secondary p-3 text-xs text-text-muted">
                  {selected.intakeProfile
                    ? JSON.stringify(selected.intakeProfile, null, 2)
                    : "—"}
                </pre>
              </div>

              {/* Free value delivered to the user */}
              <div>
                <h4 className="mb-1 text-sm font-semibold text-text-primary">
                  Free value (emailed to applicant)
                </h4>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-bg-secondary p-3 text-xs text-text-muted">
                  {selected.freeValue ?? "—"}
                </pre>
                {selected.processingError && (
                  <p className="mt-1 text-xs text-amber-400">
                    {selected.processingError}
                  </p>
                )}
              </div>

              {/* INTERNAL proposal — admin only, never sent to the user */}
              <div>
                <h4 className="mb-1 text-sm font-semibold text-gold">
                  Internal next-steps proposal (never sent to applicant)
                </h4>
                <Textarea
                  value={proposalDraft}
                  onChange={(e) => setProposalDraft(e.target.value)}
                  rows={10}
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
                        await saveProposal({
                          applicationId: selected._id,
                          internalProposal: proposalDraft,
                        });
                      } finally {
                        setSaving(false);
                      }
                    })();
                  }}
                >
                  {saving ? "Saving…" : "Save proposal"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
