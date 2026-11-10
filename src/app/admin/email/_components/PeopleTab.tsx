"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
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
import {
  Empty,
  NativeSelect,
  STAGES,
  STAGE_LABEL,
  errorText,
  fmtDate,
  type Stage,
} from "./shared";
import type { PersonRef } from "./PersonSheet";

const KIND_FILTERS = [
  { value: "all", label: "Everyone" },
  { value: "lead", label: "Site leads" },
  { value: "prospect", label: "Cold prospects" },
];

const STAGE_FILTERS = [
  { value: "all", label: "Any stage" },
  ...STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] })),
];

const STAGE_OPTIONS = STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }));

export function PeopleTab({ openPerson }: { openPerson: (p: PersonRef) => void }) {
  const data = useQuery(api.emailOps.listPeople, {});
  const setStage = useMutation(api.emailOps.setStage);
  const [kind, setKind] = useState("all");
  const [stage, setStageFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.people ?? []).filter((p) => {
      if (kind !== "all" && p.kind !== kind) return false;
      if (stage !== "all" && p.stage !== stage) return false;
      if (!q) return true;
      return [p.email, p.name, p.company, p.origin].some((f) => f?.toLowerCase().includes(q));
    });
  }, [data, kind, stage, search]);

  if (data === undefined) return <p className="mt-6 text-sm text-text-muted">Loading…</p>;

  const changeStage = async (p: PersonRef, next: string) => {
    setError(null);
    try {
      await setStage({ kind: p.kind, id: p.id, stage: next as Stage });
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          aria-label="Search people"
          placeholder="Search name, email, company"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full max-w-xs"
        />
        <NativeSelect label="Who" value={kind} onChange={setKind} options={KIND_FILTERS} />
        <NativeSelect label="Stage" value={stage} onChange={setStageFilter} options={STAGE_FILTERS} />
        <span className="text-sm text-text-muted">
          {rows.length} of {data.people.length}
          {data.truncated && " (list is capped)"}
        </span>
        <a
          href="/api/admin/export?format=csv"
          className="ml-auto text-sm text-text-muted hover:text-gold"
        >
          Export site leads (CSV)
        </a>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      )}

      {data.people.length === 0 ? (
        <div className="mt-6">
          <Empty title="No one here yet">
            Site leads appear the moment someone gives their email. Cold prospects are added from a
            campaign.
          </Empty>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <Empty title="No one matches those filters" />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Emails</TableHead>
                <TableHead>Signals</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={`${p.kind}:${p.id}`}>
                  <TableCell>
                    <p className="font-medium text-text-primary">{p.name ?? p.email}</p>
                    <p className="text-xs text-text-muted">
                      {p.name ? p.email : null}
                      {p.name && p.company ? " · " : null}
                      {p.company}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={p.kind === "lead" ? "border-gold-dim text-gold" : "border-blue/40 text-blue"}
                    >
                      {p.kind === "lead" ? "Site" : "Cold"}
                    </Badge>
                    <span className="ml-2 text-xs text-text-muted">{p.origin}</span>
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      label={`Stage for ${p.email}`}
                      value={p.stage}
                      onChange={(next) => void changeStage({ kind: p.kind, id: p.id }, next)}
                      options={STAGE_OPTIONS}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-text-primary">
                    {p.kind === "prospect" ? (
                      <span className="text-text-dim">—</span>
                    ) : (
                      <>
                        {p.emailsSent}
                        {p.lastSentAt && (
                          <span className="ml-1 text-xs text-text-muted">last {fmtDate(p.lastSentAt)}</span>
                        )}
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.openReplies > 0 && (
                        <Badge variant="outline" className="border-gold-dim text-gold">
                          reply waiting
                        </Badge>
                      )}
                      {p.clicked ? (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                          clicked
                        </Badge>
                      ) : p.opened ? (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                          opened
                        </Badge>
                      ) : null}
                      {p.track && (
                        <Badge variant="outline" className="border-border text-text-muted">
                          in sequence
                        </Badge>
                      )}
                      {p.bounced && (
                        <Badge variant="outline" className="border-error/50 text-error">
                          bounced
                        </Badge>
                      )}
                      {p.suppressed && (
                        <Badge variant="outline" className="border-error/50 text-error">
                          do not email
                        </Badge>
                      )}
                      {p.kind === "lead" && !p.consented && (
                        <Badge variant="outline" className="border-border text-text-dim">
                          no opt-in
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-text-muted">{fmtDate(p.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPerson({ kind: p.kind, id: p.id })}
                      aria-label={`Open ${p.name ?? p.email}`}
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
