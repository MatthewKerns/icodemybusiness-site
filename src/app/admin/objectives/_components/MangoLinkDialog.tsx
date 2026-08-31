"use client";

import { useState } from "react";
import { Link2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlanObjective } from "./plan";

interface MangoLinkDialogProps {
  objective: PlanObjective | null;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (mangoKey: string, mangoObjectiveId: string) => Promise<void>;
  onPush: (status: string) => Promise<void>;
}

/**
 * Links a local objective to a Mango focus-project objective, and pushes its
 * status there on request. The exact call is shown before it runs — Mango's own
 * tool contracts say to confirm before writing, so nothing here syncs outward
 * on its own.
 */
export function MangoLinkDialog({
  objective,
  open,
  busy,
  onOpenChange,
  onSave,
  onPush,
}: MangoLinkDialogProps) {
  const [key, setKey] = useState("");
  const [objectiveId, setObjectiveId] = useState("");

  const linked = Boolean(objective?.mangoKey && objective?.mangoObjectiveId);
  const effectiveKey = key || objective?.mangoKey || "";
  const effectiveObjectiveId = objectiveId || objective?.mangoObjectiveId || "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next && objective) {
          setKey(objective.mangoKey ?? "");
          setObjectiveId(objective.mangoObjectiveId ?? "");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-gold" />
            Link to Mango
          </DialogTitle>
          <DialogDescription>
            Connect &ldquo;{objective?.title}&rdquo; to a Mango focus-project
            objective so you can mark it done in both places. Find both values by
            asking Mango for <code>get_focus_projects</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="mango-key">Focus project key</Label>
            <Input
              id="mango-key"
              value={effectiveKey}
              onChange={(e) => setKey(e.target.value)}
              placeholder="icmb-overhead"
              disabled={busy}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mango-objective">Mango objective id</Label>
            <Input
              id="mango-objective"
              value={effectiveObjectiveId}
              onChange={(e) => setObjectiveId(e.target.value)}
              placeholder="00197a96bc58"
              disabled={busy}
            />
          </div>

          {linked && (
            <div className="rounded-lg border border-border bg-bg-tertiary/50 p-3">
              <p className="mb-2 text-xs text-text-dim">
                Pushing runs exactly this, once you confirm:
              </p>
              <code className="block break-all font-accent text-xs text-text-muted">
                set_focus_objective({"{"} key: &quot;{objective?.mangoKey}&quot;,
                objective_id: &quot;{objective?.mangoObjectiveId}&quot;, status:
                &quot;done&quot; {"}"})
              </code>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                disabled={busy}
                onClick={() => void onPush("done")}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Mark done in Mango
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            disabled={busy || !effectiveKey.trim() || !effectiveObjectiveId.trim()}
            onClick={() => void onSave(effectiveKey.trim(), effectiveObjectiveId.trim())}
          >
            Save link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
