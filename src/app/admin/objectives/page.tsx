"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { Undo2, RotateCcw, AlertTriangle } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ObjectiveList } from "./_components/ObjectiveList";
import { ReorgBox, type ReorgRequestDoc } from "./_components/ReorgBox";
import { MangoStatus, type MangoSnapshots } from "./_components/MangoStatus";
import { OverheadPanel } from "./_components/OverheadPanel";
import { MangoLinkDialog } from "./_components/MangoLinkDialog";
import { TodoTree } from "./_components/TodoTree";
import { TodayPanel } from "./_components/TodayPanel";
import { isoWeekKey, todayKey, type Plan, type ReorgOp } from "./_components/plan";

function errorMessage(error: unknown): string {
  if (error instanceof ConvexError) return String(error.data);
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export default function AdminObjectivesPage() {
  const plan = useQuery(api.objectives.getPlan, {}) as Plan | undefined;
  const batches = useQuery(api.objectives.listBatches, { limit: 5 });
  const archivedRoots = useQuery(api.objectives.listArchivedRoots, {});
  const settings = useQuery(api.objectives.getOwnerSettings, {});
  const snapshots = useQuery(api.mango.getSnapshots, {}) as MangoSnapshots | undefined;

  const applyOps = useMutation(api.objectives.applyOps);
  const createObjective = useMutation(api.objectives.createObjective);
  const archiveObjective = useMutation(api.objectives.archiveObjective);
  const revertBatch = useMutation(api.objectives.revertBatch);
  const submitRequest = useMutation(api.objectivesIntake.submitRequest);
  const resolveRequest = useMutation(api.objectivesIntake.resolveRequest);
  const setOwnerSettings = useMutation(api.objectives.setOwnerSettings);
  const updateObjective = useMutation(api.objectives.updateObjective);
  const syncMango = useAction(api.mango.syncNow);
  const pushObjectiveStatus = useAction(api.mango.pushObjectiveStatus);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<Id<"reorgRequests"> | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  // The proposal arrives asynchronously (a scheduled action calls the model),
  // so the page subscribes to the row rather than awaiting a response.
  const request = useQuery(
    api.objectivesIntake.getRequest,
    requestId ? { requestId } : "skip",
  ) as ReorgRequestDoc | null | undefined;

  const selected = useMemo(() => {
    if (!plan) return null;
    return (
      plan.objectives.find((o) => o.id === selectedId) ?? plan.objectives[0] ?? null
    );
  }, [plan, selectedId]);

  const lastBatch = batches?.find((b) => b.revertedAt === undefined);

  /**
   * Single funnel for every plan edit on this page. Keeping one call site means
   * the busy state, the error surface, and the undo label are consistent no
   * matter which control fired.
   */
  const runOps = useCallback(
    async (ops: ReorgOp[], label: string) => {
      setBusy(true);
      setError(null);
      try {
        await applyOps({ ops, label, source: "manual" });
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [applyOps],
  );

  const runCreateObjective = useCallback(
    async (title: string) => {
      setBusy(true);
      setError(null);
      try {
        const id = await createObjective({
          title,
          period: "week",
          periodKey: isoWeekKey(),
        });
        setSelectedId(id);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [createObjective],
  );

  const runArchiveObjective = useCallback(
    async (objectiveId: string) => {
      setBusy(true);
      setError(null);
      try {
        await archiveObjective({ objectiveId: objectiveId as Id<"objectives"> });
        setSelectedId(null);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [archiveObjective],
  );

  const runUndo = useCallback(async () => {
    if (!lastBatch) return;
    setBusy(true);
    setError(null);
    try {
      await revertBatch({ batchId: lastBatch._id });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [lastBatch, revertBatch]);

  const runSubmitRequest = useCallback(
    async (rawText: string) => {
      setBusy(true);
      setError(null);
      try {
        const id = await submitRequest({ rawText, today: todayKey() });
        setRequestId(id);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [submitRequest],
  );

  const runApplyProposal = useCallback(
    async (ops: ReorgOp[], edited: boolean) => {
      if (!requestId) return;
      setBusy(true);
      setError(null);
      try {
        const { batchId } = await applyOps({
          ops,
          label: "AI re-plan",
          source: "ai",
          requestId,
        });
        await resolveRequest({
          requestId,
          status: edited ? "edited_applied" : "applied",
          appliedOps: ops,
          edited,
          batchId,
        });
        setRequestId(null);
      } catch (e) {
        // The proposal stays on screen so it can be edited and retried.
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [applyOps, requestId, resolveRequest],
  );

  const runRejectProposal = useCallback(async () => {
    if (!requestId) return;
    setBusy(true);
    try {
      await resolveRequest({ requestId, status: "rejected" });
      setRequestId(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [requestId, resolveRequest]);

  const runSyncMango = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await syncMango({});
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [syncMango]);

  const runSetBudget = useCallback(
    async (overheadWeeklyBudgetHours: number) => {
      setBusy(true);
      setError(null);
      try {
        await setOwnerSettings({ overheadWeeklyBudgetHours });
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [setOwnerSettings],
  );

  const linking = plan?.objectives.find((o) => o.id === linkingId) ?? null;

  const runSaveMangoLink = useCallback(
    async (mangoKey: string, mangoObjectiveId: string) => {
      if (!linkingId) return;
      setBusy(true);
      setError(null);
      try {
        await updateObjective({
          objectiveId: linkingId as Id<"objectives">,
          mangoKey,
          mangoObjectiveId,
        });
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [linkingId, updateObjective],
  );

  const runPushToMango = useCallback(
    async (status: string) => {
      if (!linking?.mangoKey || !linking.mangoObjectiveId) return;
      setBusy(true);
      setError(null);
      try {
        const result = await pushObjectiveStatus({
          objectiveId: linking.id as Id<"objectives">,
          mangoKey: linking.mangoKey,
          mangoObjectiveId: linking.mangoObjectiveId,
          status,
        });
        if (result.ok) setLinkingId(null);
        else setError(result.error ?? "Mango rejected the update");
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [linking, pushObjectiveStatus],
  );

  return (
    <main id="main-content" className="px-4 py-8 md:px-6 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-h2 font-bold text-text-primary">Objectives</h1>
            <p className="mt-1 text-sm text-text-muted">
              Where the unpaid hours go. Keep the plan honest, keep the overhead
              in check.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <MangoStatus snapshots={snapshots} busy={busy} onSync={() => void runSyncMango()} />
            {lastBatch && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void runUndo()}
                disabled={busy}
                className="gap-1.5"
              >
                <Undo2 className="h-4 w-4" />
                Undo: {lastBatch.label}
              </Button>
            )}
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 text-red-300/70 hover:text-red-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {plan === undefined ? (
          <p className="py-16 text-center text-text-muted">Loading your plan…</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,20rem)]">
            <section aria-labelledby="objectives-heading">
              <h2
                id="objectives-heading"
                className="mb-3 text-xs uppercase tracking-wide text-text-dim"
              >
                Objectives
              </h2>
              <ObjectiveList
                plan={plan}
                selectedId={selected?.id ?? null}
                onSelect={setSelectedId}
                onApply={runOps}
                onCreate={runCreateObjective}
                onArchive={runArchiveObjective}
                onLinkMango={setLinkingId}
                busy={busy}
              />
            </section>

            <section aria-labelledby="tree-heading" className="min-w-0">
              <h2
                id="tree-heading"
                className="mb-3 truncate text-xs uppercase tracking-wide text-text-dim"
              >
                {selected ? selected.title : "To-dos"}
              </h2>
              {selected ? (
                <Card>
                  <CardContent className="pt-6">
                    <TodoTree
                      plan={plan}
                      objectiveId={selected.id}
                      onApply={runOps}
                      busy={busy}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-16 text-center text-text-muted">
                    Add an objective to start planning.
                  </CardContent>
                </Card>
              )}
            </section>

            <aside className="space-y-4">
              <ReorgBox
                plan={plan}
                request={request}
                busy={busy}
                onSubmit={runSubmitRequest}
                onApply={runApplyProposal}
                onReject={runRejectProposal}
                onDismiss={() => setRequestId(null)}
              />

              <TodayPanel
                plan={plan}
                onApply={runOps}
                onSelectObjective={setSelectedId}
                busy={busy}
              />

              <OverheadPanel
                snapshots={snapshots}
                budgetHours={settings?.overheadWeeklyBudgetHours ?? 10}
                busy={busy}
                onSetBudget={runSetBudget}
              />

              {archivedRoots && archivedRoots.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <RotateCcw className="h-4 w-4 text-text-dim" />
                      Erased
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {archivedRoots.slice(0, 6).map((root) => (
                        <li
                          key={root.id}
                          className="flex items-center gap-2 rounded-lg border border-border/60 bg-bg-secondary/50 px-2 py-1.5"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm text-text-muted">
                            {root.title}
                          </span>
                          <Badge
                            variant="outline"
                            className="shrink-0 border-border text-xs text-text-dim"
                          >
                            {root.size}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void runOps(
                                [{ op: "restoreSubtree", todoId: root.id }],
                                `Restore "${root.title}"`,
                              )
                            }
                          >
                            Restore
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        )}

        <MangoLinkDialog
          objective={linking}
          open={linkingId !== null}
          busy={busy}
          onOpenChange={(open) => setLinkingId(open ? linkingId : null)}
          onSave={runSaveMangoLink}
          onPush={runPushToMango}
        />
      </div>
    </main>
  );
}
