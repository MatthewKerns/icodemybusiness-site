import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../../convex/_generated/api";
import { getConvexClient } from "@/lib/convex-client";
import {
  extractTextFromUpload,
  isTextualMime,
} from "@/lib/agent/file-text-extract";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES_PER_FILE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_CONVEX_URL not configured" },
      { status: 500 }
    );
  }

  const form = await req.formData();
  const sessionId = form.get("sessionId");
  const file = form.get("file");

  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES_PER_FILE) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_BYTES_PER_FILE / (1024 * 1024)}MB limit` },
      { status: 413 }
    );
  }

  const convex = getConvexClient();

  const uploadUrl = await convex.mutation(
    api.agentSessions.generateUploadUrl,
    { sessionId }
  );

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!uploadRes.ok) {
    return NextResponse.json(
      { error: "Failed to upload to storage" },
      { status: 502 }
    );
  }
  const { storageId } = (await uploadRes.json()) as { storageId: string };

  const buffer = await file.arrayBuffer();
  const mime = file.type || "application/octet-stream";
  const name = file.name;
  const { extractedChars, isSupported } = await extractTextFromUpload(
    buffer,
    mime,
    name
  );

  await convex.mutation(api.agentSessions.attachFile, {
    sessionId,
    file: {
      storageId: storageId as Id<"_storage">,
      name,
      size: file.size,
      mime,
      extractedChars,
    },
  });

  return NextResponse.json({
    storageId,
    name,
    size: file.size,
    mime,
    extractedChars,
    textual: isTextualMime(mime, name) && isSupported,
  });
}
