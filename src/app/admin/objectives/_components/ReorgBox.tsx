"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check, X, AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { describeOp, type Plan, type ReorgOp } from "./plan";

export interface ReorgRequestDoc {
  _id: string;
  rawText: string;
  status: string;
  rationale?: string;
  proposedOps?: unknown;
  unmapped?: Array<{ intentKey: string; description: string; why: string }>;
  error?: string;
}

interface ReorgBoxProps {
  plan: Plan;
  request: ReorgRequestDoc | null | undefined;
  busy: boolean;
  onSubmit: (text: string) => Promise<void>;
  onApply: (ops: ReorgOp[], edited: boolean) => Promise<void>;
  onReject: () => Promise<void>;
  onDismiss: () => void;
}

const EXAMPLE =
  "Rock 1 was blocked all week — I just got unblocked, so lean into it and pull back on the rest.";

export function ReorgBox({
  plan,
  request,
  busy,
  onSubmit,
  onApply,
  onReject,
  onDismiss,
}: ReorgBoxProps) {
  const [text, setText] = useState("");
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  const titleOf = (id: string) =>
    plan.objectives.find((o) => o.id === id)?.title ??
    plan.todos.find((t) => t.id === id)?.title ??
    "(new item)";

  const proposedOps = (request?.proposedOps as ReorgOp[] | undefined) ?? [];
  const pending = request?.status === "pending";
  const proposed = request?.status === "proposed";
  const failed = request?.status === "failed";

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    setExcluded(new Set());
    await onSubmit(value);
    setText("");
  };

  const apply = async () => {
    const selected = proposedOps.filter((_, i) => !excluded.has(i));
    if (selected.length === 0) return;
    await onApply(selected, excluded.size > 0);
    setExcluded(new Set());
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-gold" />
          Re-plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-2"
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={EXAMPLE}
            aria-label="Describe what changed"
            rows={3}
            disabled={busy || pending}
            className="resize-none text-sm"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-text-dim">⌘↵ to send</span>
            <Button type="submit" size="sm" disabled={busy || pending || !text.trim()}>
              {pending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Thinking…
                </>
              ) : (
                "Propose a change"
              )}
            </Button>
          </div>
        </form>

        {failed && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{request?.error ?? "The proposal failed."}</span>
            <button type="button" onClick={onDismiss} className="shrink-0 hover:text-red-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {proposed && (
          <div className="space-y-3 rounded-lg border border-gold-dim/40 bg-bg-tertiary/50 p-3">
            {request?.rationale && (
              <p className="text-sm text-text-muted">{request.rationale}</p>
            )}

            {proposedOps.length > 0 ? (
              <ul className="space-y-1.5">
                {proposedOps.map((op, index) => {
                  const described = describeOp(op, titleOf);
                  const included = !excluded.has(index);
                  return (
                    <li key={index} className="flex items-start gap-2">
                      <Checkbox
                        id={`op-${index}`}
                        checked={included}
                        disabled={busy}
                        onCheckedChange={(checked) => {
                          const next = new Set(excluded);
                          if (checked) next.delete(index);
                          else next.add(index);
                          setExcluded(next);
                        }}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={`op-${index}`}
                        className={cn(
                          "min-w-0 flex-1 cursor-pointer text-sm",
                          included ? "text-text-primary" : "text-text-dim line-through",
                        )}
                      >
                        <span
                          className={cn(
                            "font-accent text-xs",
                            described.destructive ? "text-red-400" : "text-gold",
                          )}
                        >
                          {described.verb}
                        </span>{" "}
                        {described.text}
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">
                No changes proposed — see what it could not do, below.
              </p>
            )}

            {(request?.unmapped ?? []).length > 0 && (
              <div className="rounded-lg border border-blue/30 bg-blue/5 p-2.5">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-blue">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Couldn&apos;t be expressed with today&apos;s tools
                </p>
                <ul className="space-y-1.5">
                  {(request?.unmapped ?? []).map((intent, i) => (
                    <li key={i} className="text-xs text-text-muted">
                      <Badge
                        variant="outline"
                        className="mr-1.5 border-blue/40 font-accent text-[10px] text-blue"
                      >
                        {intent.intentKey}
                      </Badge>
                      {intent.description}
                      <span className="block pl-1 pt-0.5 text-text-dim">{intent.why}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => void onReject()}>
                <X className="mr-1.5 h-3.5 w-3.5" />
                Discard
              </Button>
              <Button
                size="sm"
                disabled={busy || proposedOps.length === excluded.size}
                onClick={() => void apply()}
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Apply {proposedOps.length - excluded.size}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
