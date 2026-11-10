"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { JUDGE_AFTER_DAYS, judgeCampaign, worstVerdict } from "@/lib/coldoutbound/benchmarks";
import { countWords, lintSequence, lintStep } from "@/lib/coldoutbound/copyLint";
import { parseProspects, scoreList } from "@/lib/coldoutbound/listScorecard";
import { Empty, Field, NativeSelect, VerdictDot, errorText, fmtDate, rate } from "./shared";

const DAY_MS = 86_400_000;
const IMPORT_BATCH = 500;

const STATUS_TINT: Record<string, string> = {
  draft: "border-border text-text-muted",
  live: "border-emerald-500/40 text-emerald-400",
  paused: "border-gold-dim text-gold",
  done: "border-border text-text-dim",
};

const SENDERS = [
  { value: "instantly", label: "Instantly" },
  { value: "manual", label: "By hand" },
  { value: "apollo", label: "Apollo" },
  { value: "other", label: "Other" },
];

interface Step {
  subject: string;
  body: string;
  delayDays: number;
}

interface Draft {
  campaignId?: Id<"outboundCampaigns">;
  name: string;
  sender: string;
  externalId: string;
  audience: string;
  offer: string;
  steps: Step[];
}

/** Email 1 today, a threaded bump at day 3, then new threads 4 days apart. */
const BLANK_STEPS: Step[] = [
  { subject: "", body: "", delayDays: 0 },
  { subject: "", body: "", delayDays: 3 },
  { subject: "", body: "", delayDays: 4 },
  { subject: "", body: "", delayDays: 4 },
];

const NEW_DRAFT: Draft = {
  name: "",
  sender: "instantly",
  externalId: "",
  audience: "",
  offer: "",
  steps: BLANK_STEPS,
};

export function CampaignsTab() {
  const campaigns = useQuery(api.outbound.listCampaigns, {});
  const setStatus = useMutation(api.outbound.setCampaignStatus);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [importFor, setImportFor] = useState<{ id: Id<"outboundCampaigns">; name: string } | null>(null);
  const [totalsFor, setTotalsFor] = useState<{
    id: Id<"outboundCampaigns">;
    name: string;
    sent: number | null;
    bounced: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (campaigns === undefined) return <p className="mt-6 text-sm text-text-muted">Loading…</p>;

  const changeStatus = async (id: Id<"outboundCampaigns">, status: "draft" | "live" | "paused" | "done") => {
    setError(null);
    try {
      await setStatus({ campaignId: id, status });
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-text-muted">
          A campaign is the plan, the copy and the numbers. Sending happens in the sending tool;
          sent and bounced totals are copied in here.
        </p>
        <Button onClick={() => setDraft(NEW_DRAFT)}>New campaign</Button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      )}

      {campaigns.length === 0 ? (
        <div className="mt-6">
          <Empty title="No campaigns yet">
            Start one to write the sequence, check the copy and load the list. Nothing is sent from
            here.
          </Empty>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {campaigns.map((c) => {
            const findings = judgeCampaign({
              sent: c.reportedSent,
              bounced: c.reportedBounced,
              replied: c.replied,
              positive: c.positive,
              hostile: c.hostile,
              unsubscribed: c.unsubscribed,
            });
            const daysLive = c.launchedAt ? Math.floor((Date.now() - c.launchedAt) / DAY_MS) : null;
            return (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base text-text-primary">{c.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <VerdictDot verdict={worstVerdict(findings)} />
                      <Badge variant="outline" className={STATUS_TINT[c.status]}>
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted">
                    {SENDERS.find((s) => s.value === c.sender)?.label ?? c.sender} · {c.steps.length} step
                    {c.steps.length === 1 ? "" : "s"}
                    {daysLive !== null && ` · day ${daysLive}`}
                    {daysLive !== null && daysLive < JUDGE_AFTER_DAYS && ` (judge at day ${JUDGE_AFTER_DAYS})`}
                  </p>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-3 gap-3 text-sm sm:grid-cols-6">
                    {[
                      ["Prospects", c.prospects, null],
                      ["Sent", c.reportedSent ?? "—", null],
                      ["Bounced", c.reportedBounced ?? "—", rate(c.reportedBounced ?? 0, c.reportedSent)],
                      ["Replied", c.replied, rate(c.replied, c.reportedSent)],
                      ["Positive", c.positive, rate(c.positive, c.reportedSent)],
                      ["Booked", c.booked, null],
                    ].map(([label, value, sub]) => (
                      <div key={label as string}>
                        <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
                        <dd className="tabular-nums text-text-primary">
                          {value}
                          {sub && sub !== "—" && <span className="ml-1 text-xs text-text-muted">{sub}</span>}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <ul className="mt-3 space-y-1 text-xs text-text-muted">
                    {findings.map((f) => (
                      <li key={f.metric} className={cn(f.verdict === "bad" && "text-error", f.verdict === "warn" && "text-gold")}>
                        {f.message}
                      </li>
                    ))}
                  </ul>
                  {c.reportedAt && (
                    <p className="mt-2 text-xs text-text-dim">Totals entered {fmtDate(c.reportedAt)}.</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDraft({
                          campaignId: c.id,
                          name: c.name,
                          sender: c.sender,
                          externalId: c.externalId ?? "",
                          audience: c.audience ?? "",
                          offer: c.offer ?? "",
                          steps: c.steps.length > 0 ? c.steps : BLANK_STEPS,
                        })
                      }
                    >
                      Edit copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setImportFor({ id: c.id, name: c.name })}>
                      Add prospects
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setTotalsFor({ id: c.id, name: c.name, sent: c.reportedSent, bounced: c.reportedBounced })
                      }
                    >
                      Enter totals
                    </Button>
                    {c.status !== "live" && c.status !== "done" && (
                      <Button size="sm" onClick={() => void changeStatus(c.id, "live")}>
                        Mark live
                      </Button>
                    )}
                    {c.status === "live" && (
                      <Button size="sm" variant="outline" onClick={() => void changeStatus(c.id, "paused")}>
                        Mark paused
                      </Button>
                    )}
                    {c.status !== "done" && c.status !== "draft" && (
                      <Button size="sm" variant="outline" onClick={() => void changeStatus(c.id, "done")}>
                        Mark done
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {draft && <CampaignEditor draft={draft} onClose={() => setDraft(null)} />}
      {importFor && <ImportDialog campaign={importFor} onClose={() => setImportFor(null)} />}
      {totalsFor && <TotalsDialog campaign={totalsFor} onClose={() => setTotalsFor(null)} />}
    </div>
  );
}

function CampaignEditor({ draft: initial, onClose }: { draft: Draft; onClose: () => void }) {
  const save = useMutation(api.outbound.saveCampaign);
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStep = (i: number, patch: Partial<Step>) =>
    setD((prev) => ({ ...prev, steps: prev.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  const lint = useMemo(
    () => d.steps.map((s, i) => (s.subject || s.body ? lintStep({ ...s, stepIndex: i }) : [])),
    [d.steps]
  );
  const sequenceNotes = useMemo(() => lintSequence(d.steps), [d.steps]);
  const failures = lint.flat().filter((i) => i.severity === "fail").length;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await save({
        campaignId: d.campaignId,
        name: d.name,
        sender: d.sender,
        externalId: d.externalId || undefined,
        audience: d.audience || undefined,
        offer: d.offer || undefined,
        steps: d.steps.filter((s) => s.subject.trim() || s.body.trim()),
      });
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-bg-primary">
        <DialogHeader>
          <DialogTitle className="text-text-primary">
            {d.campaignId ? "Edit campaign" : "New campaign"}
          </DialogTitle>
          <DialogDescription>
            The copy is checked as you type. Saving stores it here; it does not send anything.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
          </Field>
          <Field label="Sent with">
            <NativeSelect
              label="Sent with"
              value={d.sender}
              onChange={(sender) => setD({ ...d, sender })}
              options={SENDERS}
              className="w-full"
            />
          </Field>
          <Field label="Who it is for">
            <Textarea rows={2} value={d.audience} onChange={(e) => setD({ ...d, audience: e.target.value })} />
          </Field>
          <Field label="What you are offering">
            <Textarea rows={2} value={d.offer} onChange={(e) => setD({ ...d, offer: e.target.value })} />
          </Field>
          <Field label="Campaign id in the sending tool" hint="Optional. Lets totals sync later.">
            <Input value={d.externalId} onChange={(e) => setD({ ...d, externalId: e.target.value })} />
          </Field>
        </div>

        {sequenceNotes.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-gold">
            {sequenceNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}

        {d.steps.map((s, i) => (
          <fieldset key={i} className="rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-medium text-text-primary">Email {i + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <Field label="Subject" hint={i === 1 ? "Leave blank: it threads under email 1." : undefined}>
                <Input value={s.subject} onChange={(e) => setStep(i, { subject: e.target.value })} />
              </Field>
              <Field label={i === 0 ? "Sends on day" : "Days after last"}>
                <Input
                  type="number"
                  min={0}
                  value={s.delayDays}
                  disabled={i === 0}
                  onChange={(e) => setStep(i, { delayDays: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label={`Body · ${countWords(s.body)} words`}>
                <Textarea rows={6} value={s.body} onChange={(e) => setStep(i, { body: e.target.value })} />
              </Field>
            </div>
            {lint[i].length > 0 && (
              <ul className="mt-2 space-y-1 text-xs" aria-label={`Copy check for email ${i + 1}`}>
                {lint[i].map((issue) => (
                  <li
                    key={issue.where + issue.message}
                    className={issue.severity === "fail" ? "text-error" : "text-gold"}
                  >
                    <span className="font-medium">{issue.severity === "fail" ? "Fix" : "Check"}</span> ·{" "}
                    {issue.where}: {issue.message}
                  </li>
                ))}
              </ul>
            )}
            {(s.subject || s.body) && lint[i].length === 0 && (
              <p className="mt-2 text-xs text-emerald-400">Copy check: nothing flagged.</p>
            )}
          </fieldset>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={d.steps.length >= 8}
              onClick={() => setD({ ...d, steps: [...d.steps, { subject: "", body: "", delayDays: 4 }] })}
            >
              Add a step
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={d.steps.length <= 1}
              onClick={() => setD({ ...d, steps: d.steps.slice(0, -1) })}
            >
              Remove last step
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {failures > 0 && (
              <span className="text-xs text-error">
                {failures} thing{failures === 1 ? "" : "s"} to fix in the copy
              </span>
            )}
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={busy || !d.name.trim()}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({
  campaign,
  onClose,
}: {
  campaign: { id: Id<"outboundCampaigns">; name: string };
  onClose: () => void;
}) {
  const importProspects = useMutation(api.outbound.importProspects);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, number> | null>(null);

  const parsed = useMemo(() => parseProspects(text), [text]);
  const card = useMemo(() => scoreList(parsed.rows, parsed.hasVerification), [parsed]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const totals = { added: 0, invalid: 0, duplicate: 0, suppressed: 0, alreadyLead: 0 };
    try {
      for (let i = 0; i < parsed.rows.length; i += IMPORT_BATCH) {
        const batch = parsed.rows.slice(i, i + IMPORT_BATCH).map((r) => ({
          email: r.email,
          firstName: r.firstName,
          lastName: r.lastName,
          company: r.company,
          title: r.title,
          website: r.website,
          linkedinUrl: r.linkedinUrl,
        }));
        const res = await importProspects({ campaignId: campaign.id, source: "csv", prospects: batch });
        for (const key of Object.keys(totals) as (keyof typeof totals)[]) totals[key] += res[key];
      }
      setResult(totals);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-bg-primary">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Add prospects to {campaign.name}</DialogTitle>
          <DialogDescription>
            Paste a CSV with a header row (email, first_name, last_name, company_name, title,
            website, email_status), or one address per line. The list is graded before anything is
            added.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="text-sm text-text-primary">
            <p className="font-medium">
              {result.added} added.
            </p>
            <ul className="mt-2 space-y-1 text-text-muted">
              {result.duplicate > 0 && <li>{result.duplicate} skipped: already a prospect, or repeated in the list.</li>}
              {result.alreadyLead > 0 && <li>{result.alreadyLead} skipped: already a site lead.</li>}
              {result.suppressed > 0 && <li>{result.suppressed} skipped: on the do-not-email list.</li>}
              {result.invalid > 0 && <li>{result.invalid} skipped: not a valid address.</li>}
            </ul>
            <Button className="mt-4" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <Textarea
              aria-label="Prospect list"
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"email,first_name,last_name,company_name,title\njane@example.com,Jane,Doe,Example Co,Founder"}
              className="font-mono text-xs"
            />

            {card && (
              <div className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-text-primary">
                    List grade: <span className="text-gold">{card.grade}</span> ({card.overall}/100) ·{" "}
                    {card.total} row{card.total === 1 ? "" : "s"}
                  </p>
                  <p className="text-sm text-text-muted">{card.action}</p>
                </div>
                {card.total < 100 && (
                  <p className="mt-1 text-xs text-text-dim">
                    Under 100 rows the grade is a rough guide only.
                  </p>
                )}
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  {card.dimensions.map((dim) => (
                    <div key={dim.key} className="flex justify-between gap-2">
                      <dt className="text-text-muted">
                        {dim.label} <span className="text-text-dim">({dim.detail})</span>
                      </dt>
                      <dd className="tabular-nums text-text-primary">{dim.score}</dd>
                    </div>
                  ))}
                </dl>
                {card.issues.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gold">
                    {card.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-error">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => void submit()} disabled={busy || parsed.rows.length === 0}>
                {busy ? "Adding…" : `Add ${parsed.rows.length} prospect${parsed.rows.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TotalsDialog({
  campaign,
  onClose,
}: {
  campaign: { id: Id<"outboundCampaigns">; name: string; sent: number | null; bounced: number | null };
  onClose: () => void;
}) {
  const report = useMutation(api.outbound.reportCampaignTotals);
  const [sent, setSent] = useState(String(campaign.sent ?? ""));
  const [bounced, setBounced] = useState(String(campaign.bounced ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await report({ campaignId: campaign.id, sent: Number(sent), bounced: Number(bounced || 0) });
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md border-border bg-bg-primary">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Totals for {campaign.name}</DialogTitle>
          <DialogDescription>
            Copy the running totals from the sending tool. They replace the last ones entered.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Emails sent">
            <Input type="number" min={0} value={sent} onChange={(e) => setSent(e.target.value)} />
          </Field>
          <Field label="Bounced">
            <Input type="number" min={0} value={bounced} onChange={(e) => setBounced(e.target.value)} />
          </Field>
        </div>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || sent === ""}>
            {busy ? "Saving…" : "Save totals"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
