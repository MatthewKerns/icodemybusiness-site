"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { WEEKLY_RHYTHM } from "@/lib/coldoutbound/benchmarks";
import { SectionTitle, STAGES, STAGE_LABEL, Stat, ago, rate, type TabKey } from "./shared";

const WINDOWS = [7, 30, 90] as const;
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/** Convex serves HTTP routes on `.convex.site`; the client URL is `.convex.cloud`. */
function webhookUrl(): string {
  const base = (process.env.NEXT_PUBLIC_CONVEX_URL ?? "").replace(".convex.cloud", ".convex.site");
  return base ? `${base}/webhooks/resend` : "<your Convex site URL>/webhooks/resend";
}

interface Attention {
  text: string;
  tab: TabKey;
  action: string;
}

interface SetupRow {
  label: string;
  ok: boolean;
  detail: string;
}

export function OverviewTab({ go }: { go: (tab: TabKey) => void }) {
  const [windowDays, setWindowDays] = useState<(typeof WINDOWS)[number]>(30);
  const data = useQuery(api.emailOps.overview, { windowDays });
  const funnel = useQuery(api.funnelConstraint.adminFunnelConstraint, { windowDays });

  if (data === undefined) {
    return <p className="mt-6 text-sm text-text-muted">Loading…</p>;
  }

  const { leads, sends, engagement, sequences, outbound, inboxes, setup } = data;
  // Without the webhook, zero opens means "not recorded", not "nobody opened".
  const tracked = setup.resendWebhookSecret && engagement.lastCallbackAt !== null;
  const untracked = "not recorded";

  const attention: Attention[] = [];
  if (outbound.replies.unhandled > 0) {
    attention.push({
      text: `${outbound.replies.unhandled} repl${outbound.replies.unhandled === 1 ? "y is" : "ies are"} waiting on an answer.`,
      tab: "replies",
      action: "Open replies",
    });
  }
  if (sends.failed > 0) {
    attention.push({
      text: `${sends.failed} email${sends.failed === 1 ? "" : "s"} failed to send in the last ${windowDays} days.`,
      tab: "people",
      action: "Open people",
    });
  }
  if (engagement.bounced + engagement.complained > 0) {
    attention.push({
      text: `${engagement.bounced} bounced and ${engagement.complained} marked as spam in the last ${windowDays} days.`,
      tab: "sequences",
      action: "Open suppressions",
    });
  }
  if (inboxes.backups < inboxes.backupMin) {
    attention.push({
      text: `${inboxes.backups} backup inbox${inboxes.backups === 1 ? "" : "es"} warming or ready. Keep ${inboxes.backupMin} to ${inboxes.backupMax}, so a flagged address can be swapped out the same day.`,
      tab: "inboxes",
      action: "Open inboxes",
    });
  }
  if (leads.byStage.new > 0) {
    attention.push({
      text: `${leads.byStage.new} lead${leads.byStage.new === 1 ? " has" : "s have"} not been moved past New.`,
      tab: "people",
      action: "Open people",
    });
  }

  const sendingReady = setup.resendApiKey && setup.resendFromEmail;
  const setupRows: SetupRow[] = [
    {
      label: "Sending (Resend)",
      ok: sendingReady,
      detail: sendingReady
        ? "Key and from-address are set."
        : "RESEND_API_KEY or RESEND_FROM_EMAIL is missing from the Convex env. Nothing can send.",
    },
    {
      label: "Delivery tracking",
      ok: tracked,
      detail: tracked
        ? `Receiving callbacks. Last one ${ago(engagement.lastCallbackAt!)}.`
        : setup.resendWebhookSecret
          ? "Secret is set but no callback has arrived yet."
          : `Not set up: delivered, opened, clicked and bounced are not recorded. In Resend add a webhook to ${webhookUrl()}, then set RESEND_WEBHOOK_SECRET in the Convex env.`,
    },
    {
      label: "Unsubscribe links",
      ok: setup.unsubscribeSecret,
      detail: setup.unsubscribeSecret
        ? "Signing secret is set."
        : "UNSUBSCRIBE_SECRET is missing from the Convex env. Sequence emails cannot carry a working unsubscribe link.",
    },
    {
      label: "Mailing address in footer",
      ok: setup.mailingAddress,
      detail: setup.mailingAddress
        ? "Set."
        : "MAILING_ADDRESS is missing from the Convex env. Marketing email needs a physical address in the footer.",
    },
    {
      label: "Sequence copy",
      ok: sequences.stepsAuthored === sequences.stepsTotal,
      detail: `${sequences.stepsAuthored} of ${sequences.stepsTotal} steps written. A step with no copy is never sent.`,
    },
    {
      label: "Sequence sending",
      ok: !sequences.paused,
      detail: sequences.paused ? "Paused. Nothing goes out until you turn it on." : "On.",
    },
    {
      label: "Backup inboxes",
      ok: inboxes.backups >= inboxes.backupMin,
      detail: `${inboxes.backups} warming or ready (keep ${inboxes.backupMin} to ${inboxes.backupMax}).`,
    },
    {
      label: "Cold email sender",
      ok: false,
      detail:
        "Instantly is not connected. Sent and bounced totals are typed in per campaign until it is.",
    },
  ];

  const today = ((new Date().getDay() + 6) % 7) + 1; // 1 = Monday
  const pipelineTotal = (stage: (typeof STAGES)[number]) =>
    leads.byStage[stage] + outbound.prospects.byStage[stage];

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-muted">
          {leads.total} site lead{leads.total === 1 ? "" : "s"} and {outbound.prospects.total} prospect
          {outbound.prospects.total === 1 ? "" : "s"} in total.
          {data.truncated && " Some counts are capped."}
        </p>
        <div className="flex gap-1" role="group" aria-label="Time window">
          {WINDOWS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={windowDays === d ? "default" : "outline"}
              onClick={() => setWindowDays(d)}
              aria-pressed={windowDays === d}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      <Card className={cn("mt-4", attention.length > 0 ? "border-gold-dim" : "border-border")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-text-primary">
            {attention.length > 0 ? "Needs you" : "Nothing is waiting on you"}
          </CardTitle>
        </CardHeader>
        {attention.length > 0 && (
          <CardContent>
            <ul className="space-y-2">
              {attention.map((a) => (
                <li
                  key={a.text}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-primary"
                >
                  <span>{a.text}</span>
                  <Button size="sm" variant="outline" onClick={() => go(a.tab)}>
                    {a.action}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>

      <SectionTitle>Site email, last {windowDays} days</SectionTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="New leads" value={leads.inWindow} sub={`${leads.consented} of ${leads.total} opted in`} />
        <Stat
          label="Sent"
          value={sends.sent}
          sub={sends.failed > 0 ? `${sends.failed} failed` : "none failed"}
          tone={sends.failed > 0 ? "bad" : undefined}
        />
        <Stat
          label="Delivered"
          value={tracked ? engagement.delivered : "—"}
          sub={tracked ? rate(engagement.delivered, sends.sent) : untracked}
        />
        <Stat
          label="Opened"
          value={tracked ? engagement.opened : "—"}
          sub={tracked ? rate(engagement.opened, engagement.delivered) : untracked}
        />
        <Stat
          label="Clicked"
          value={tracked ? engagement.clicked : "—"}
          sub={tracked ? rate(engagement.clicked, engagement.delivered) : untracked}
        />
        <Stat
          label="Bounced"
          value={tracked ? engagement.bounced : "—"}
          sub={tracked ? rate(engagement.bounced, sends.sent) : untracked}
          tone={tracked && engagement.bounced > 0 ? "bad" : undefined}
        />
      </div>

      <SectionTitle
        aside={
          <Button size="sm" variant="outline" onClick={() => go("people")}>
            Open people
          </Button>
        }
      >
        Pipeline
      </SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {STAGES.map((s) => (
          <Stat
            key={s}
            label={STAGE_LABEL[s]}
            value={pipelineTotal(s)}
            sub={`${leads.byStage[s]} site · ${outbound.prospects.byStage[s]} cold`}
          />
        ))}
      </div>

      <SectionTitle
        aside={
          <Link href="/admin/funnel" className="text-sm text-text-muted hover:text-gold">
            Open the funnel map →
          </Link>
        }
      >
        Site funnel, last {windowDays} days
      </SectionTitle>
      {funnel === undefined ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-text-primary">{funnel.constraint.title}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {funnel.steps.map((s) => (
              <Stat
                key={s.key}
                label={s.label}
                value={s.measured ? s.n : "—"}
                sub={s.measured ? undefined : "not counted"}
              />
            ))}
          </div>
        </>
      )}

      <SectionTitle
        aside={
          <Button size="sm" variant="outline" onClick={() => go("campaigns")}>
            Open campaigns
          </Button>
        }
      >
        Cold outbound
      </SectionTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Campaigns live"
          value={outbound.campaigns.live}
          sub={`${outbound.campaigns.draft} draft · ${outbound.campaigns.paused} paused · ${outbound.campaigns.done} done`}
        />
        <Stat
          label="Sent (reported)"
          value={outbound.reportedSent}
          sub={`${rate(outbound.reportedBounced, outbound.reportedSent)} bounced`}
        />
        <Stat
          label={`Replies, ${windowDays}d`}
          value={outbound.replies.inWindow}
          sub={`${outbound.replies.unhandled} need an answer`}
          tone={outbound.replies.unhandled > 0 ? "warn" : undefined}
        />
        <Stat
          label="Inboxes"
          value={inboxes.total}
          sub={`${inboxes.backups} backup${inboxes.backups === 1 ? "" : "s"} warming or ready`}
          tone={inboxes.backups < inboxes.backupMin ? "warn" : undefined}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-text-primary">Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {setupRows.map((row) => (
                <li key={row.label} className="flex gap-3 text-sm">
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      row.ok ? "bg-emerald-400" : "bg-gold"
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="font-medium text-text-primary">
                      {row.label}
                      <span className="sr-only">{row.ok ? " (ready)" : " (needs attention)"}</span>
                    </span>
                    <span className="block break-words text-text-muted">{row.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-text-primary">Weekly rhythm</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {WEEKLY_RHYTHM.map((r) => (
                <li
                  key={r.title}
                  className={cn(
                    "rounded-md border p-3 text-sm",
                    r.day === today ? "border-gold-dim bg-gold/5" : "border-border"
                  )}
                >
                  <p className="font-medium text-text-primary">
                    {WEEKDAYS[r.day - 1]}: {r.title}
                    {r.day === today && <span className="ml-2 text-xs text-gold">today</span>}
                  </p>
                  <p className="mt-1 text-text-muted">{r.what}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
