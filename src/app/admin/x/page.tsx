"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PILLARS = [
  { value: "clockify", label: "Clockify" },
  { value: "paper", label: "Plan on Paper" },
  { value: "writing", label: "Writing Clarity" },
  { value: "claude", label: "Claude" },
] as const;

type Pillar = (typeof PILLARS)[number]["value"];

const MAX_POST_CHARS = 140;

const ASSET_KINDS = ["video", "audio", "doc", "plan", "image", "other"] as const;
type AssetKind = (typeof ASSET_KINDS)[number];

/** Pull the file ID out of a pasted Google Drive URL. */
function parseDriveFileId(url: string): string | null {
  const m =
    url.match(/\/(?:file\/)?d\/([\w-]{10,})/) ?? url.match(/[?&]id=([\w-]{10,})/);
  return m ? m[1] : null;
}

/** Guess the asset kind from a file name's extension. */
function guessKind(name: string): AssetKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["mov", "mp4", "webm", "avi"].includes(ext)) return "video";
  if (["m4a", "mp3", "wav", "aac", "ogg"].includes(ext)) return "audio";
  if (["md", "txt", "doc", "docx", "pdf"].includes(ext)) return "doc";
  if (["png", "jpg", "jpeg", "gif", "heic"].includes(ext)) return "image";
  return "other";
}

const STATUS_TINT: Record<string, string> = {
  pending: "border-gold-dim text-gold",
  approved: "border-emerald-500/40 text-emerald-400",
  retired: "border-border text-text-muted",
  draft: "border-gold-dim text-gold",
  edited: "border-blue/40 text-blue",
  signedOff: "border-emerald-500/40 text-emerald-400",
  rejected: "border-red-500/40 text-red-400",
  posted: "border-border text-text-muted",
};

export default function AdminXPage() {
  return (
    <main className="min-h-screen bg-bg-primary p-6 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <header>
          <h1 className="text-2xl font-semibold text-text-primary">X Post Engine</h1>
          <p className="mt-1 text-sm text-text-muted">
            Feed tactics in, approve them into the bank, review each batch of posts.
            Only signed-off posts get published.
          </p>
        </header>
        <FeedForm />
        <TacticBank />
        <PostReview />
      </div>
    </main>
  );
}

function FeedForm() {
  const addTactic = useMutation(api.xTactics.add);
  const registerAsset = useMutation(api.xAssets.register);

  const [pillar, setPillar] = useState<Pillar>("clockify");
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [driveName, setDriveName] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setFlash(null);
    try {
      let sourceAssetIds: Id<"xAssets">[] | undefined;
      const url = driveUrl.trim();
      if (url) {
        const fileId = parseDriveFileId(url);
        if (!fileId) {
          setFlash("Couldn't find a file ID in that Drive URL.");
          setBusy(false);
          return;
        }
        const name = driveName.trim() || fileId;
        const asset = await registerAsset({
          driveFileId: fileId,
          driveUrl: url,
          name,
          kind: guessKind(name),
        });
        sourceAssetIds = [asset.id];
      }
      const { tacticId } = await addTactic({
        pillar,
        text: text.trim(),
        source: note.trim() ? `admin-ui: ${note.trim()}` : "admin-ui",
        sourceAssetIds,
      });
      setFlash(`Logged ${tacticId} (pending your approval below).`);
      setText("");
      setNote("");
      setDriveUrl("");
      setDriveName("");
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to add tactic");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-bg-secondary/40 p-5">
      <h2 className="text-lg font-medium text-text-primary">Feed the engine</h2>
      <p className="mt-1 text-sm text-text-muted">
        Drop in a tactic you want to post about. Attach a Drive file (video, audio,
        plan…) if the idea lives in one — unprocessed files stay visible until
        they&apos;re transcribed and mined.
      </p>
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {PILLARS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={pillar === p.value ? "default" : "outline"}
              onClick={() => setPillar(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="The tactic, in your words — one tactic at a time"
          rows={3}
        />
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Context / where this came from (optional)"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
            placeholder="Google Drive file URL (optional)"
          />
          <Input
            value={driveName}
            onChange={(e) => setDriveName(e.target.value)}
            placeholder="File name, e.g. voice-memo.m4a (optional)"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => void submit()} disabled={busy || !text.trim()}>
            {busy ? "Adding…" : "Add tactic"}
          </Button>
          {flash && <span className="text-sm text-text-muted">{flash}</span>}
        </div>
      </div>
    </section>
  );
}

function TacticBank() {
  const [pillar, setPillar] = useState<Pillar>("clockify");
  const tactics = useQuery(api.xTactics.listByPillar, { pillar });
  const unprocessed = useQuery(api.xAssets.listUnprocessed, {});
  const approve = useMutation(api.xTactics.approve);
  const retire = useMutation(api.xTactics.retire);

  return (
    <section className="rounded-lg border border-border bg-bg-secondary/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-text-primary">Tactic bank</h2>
        {unprocessed && unprocessed.length > 0 && (
          <Badge variant="outline" className="border-gold-dim text-gold">
            {unprocessed.length} file{unprocessed.length === 1 ? "" : "s"} awaiting processing
          </Badge>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PILLARS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={pillar === p.value ? "default" : "outline"}
            onClick={() => setPillar(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">ID</TableHead>
            <TableHead>Tactic</TableHead>
            <TableHead className="w-44">Source</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-40">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(tactics ?? []).map((t) => (
            <TableRow key={t._id}>
              <TableCell className="font-mono text-xs">{t.tacticId}</TableCell>
              <TableCell className="text-sm">{t.text}</TableCell>
              <TableCell className="text-xs text-text-muted">{t.source}</TableCell>
              <TableCell>
                <Badge variant="outline" className={STATUS_TINT[t.status]}>
                  {t.status}
                </Badge>
              </TableCell>
              <TableCell className="space-x-2">
                {t.status === "pending" && (
                  <Button size="sm" onClick={() => void approve({ id: t._id })}>
                    Approve
                  </Button>
                )}
                {t.status !== "retired" && (
                  <Button size="sm" variant="outline" onClick={() => void retire({ id: t._id })}>
                    Retire
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {tactics && tactics.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-text-muted">
                No tactics yet for this pillar — add one above or run x-tactic-ingest.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </section>
  );
}

function PostReview() {
  const batchKeys = useQuery(api.xPosts.listBatchKeys, {});
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const batchKey = selectedBatch ?? batchKeys?.[0] ?? null;
  const posts = useQuery(api.xPosts.listBatch, batchKey ? { batchKey } : "skip");

  const signOff = useMutation(api.xPosts.signOff);
  const reject = useMutation(api.xPosts.reject);
  const editText = useMutation(api.xPosts.editText);

  const [editing, setEditing] = useState<Doc<"xPosts"> | null>(null);
  const [draft, setDraft] = useState("");
  const overCap = draft.trim().length > MAX_POST_CHARS;

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of posts ?? []) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [posts]);

  return (
    <section className="rounded-lg border border-border bg-bg-secondary/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-text-primary">Post review</h2>
        <div className="flex flex-wrap gap-2">
          {(batchKeys ?? []).slice(0, 8).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={key === batchKey ? "default" : "outline"}
              onClick={() => setSelectedBatch(key)}
            >
              {key}
            </Button>
          ))}
        </div>
      </div>
      {batchKey && (
        <p className="mt-2 text-sm text-text-muted">
          {posts?.length ?? 0} posts · {counts.signedOff ?? 0} signed off ·{" "}
          {counts.rejected ?? 0} rejected
        </p>
      )}
      {!batchKey && (
        <p className="mt-2 text-sm text-text-muted">
          No batches yet — run x-post-batch to generate one.
        </p>
      )}
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Post</TableHead>
            <TableHead className="w-24">Pillar</TableHead>
            <TableHead className="w-28">Tactics</TableHead>
            <TableHead className="w-16">Chars</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-56">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(posts ?? []).map((p) => (
            <TableRow key={p._id}>
              <TableCell className="text-sm">
                {p.text}
                {p.isLoop && (
                  <Badge variant="outline" className="ml-2 border-blue/40 text-blue">
                    loop
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-xs text-text-muted">{p.pillar}</TableCell>
              <TableCell className="font-mono text-xs">{p.tacticIds.join(", ")}</TableCell>
              <TableCell className="text-xs">{p.charCount}</TableCell>
              <TableCell>
                <Badge variant="outline" className={STATUS_TINT[p.status]}>
                  {p.status}
                </Badge>
              </TableCell>
              <TableCell className="space-x-2">
                {(p.status === "draft" || p.status === "edited") && (
                  <>
                    <Button size="sm" onClick={() => void signOff({ id: p._id })}>
                      Sign off
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(p);
                        setDraft(p.text);
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void reject({ id: p._id })}>
                      Reject
                    </Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
          {posts && posts.length === 0 && batchKey && (
            <TableRow>
              <TableCell colSpan={6} className="text-sm text-text-muted">
                Nothing in this batch.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
          </DialogHeader>
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
          <p className={overCap ? "text-sm text-red-400" : "text-sm text-text-muted"}>
            {draft.trim().length}/{MAX_POST_CHARS}
          </p>
          <Button
            disabled={overCap || !draft.trim()}
            onClick={() => {
              if (!editing) return;
              void editText({ id: editing._id, text: draft.trim() }).then(() =>
                setEditing(null)
              );
            }}
          >
            Save
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
