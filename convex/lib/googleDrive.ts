import { ConvexError } from "convex/values";

/**
 * Google Drive access for the Skool worksheets: one OAuth refresh token for
 * Matthew's own account (scope `drive.file` — only files this app created), one
 * designated folder. Values live in the Convex env; setup in
 * `docs/skool-worksheets.md` (`scripts/google-drive-oauth.mjs`).
 */
export type DriveEnv = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderId: string;
};

export type FetchFn = typeof fetch;

export const DRIVE_ENV_NAMES: Record<keyof DriveEnv, string> = {
  clientId: "GOOGLE_OAUTH_CLIENT_ID",
  clientSecret: "GOOGLE_OAUTH_CLIENT_SECRET",
  refreshToken: "GOOGLE_DRIVE_REFRESH_TOKEN",
  folderId: "SKOOL_WORKSHEETS_FOLDER_ID",
};

export const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";

/** Reads the four env vars; the error names the missing variable, never a value. */
export function driveEnvFromProcess(
  env: Record<string, string | undefined> = process.env
): DriveEnv {
  const out: Partial<DriveEnv> = {};
  for (const key of Object.keys(DRIVE_ENV_NAMES) as (keyof DriveEnv)[]) {
    const name = DRIVE_ENV_NAMES[key];
    const value = env[name]?.trim();
    if (!value) {
      throw new ConvexError(
        `Google Drive is not connected: ${name} is not set (see docs/skool-worksheets.md)`
      );
    }
    out[key] = value;
  }
  return out as DriveEnv;
}

export async function getAccessToken(env: DriveEnv, fetchFn: FetchFn = fetch): Promise<string> {
  const res = await fetchFn("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      refresh_token: env.refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!res.ok) {
    throw new ConvexError(
      `Google Drive sign-in failed (${res.status}) — reconnect it: docs/skool-worksheets.md`
    );
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new ConvexError("Google Drive sign-in returned no access token");
  return data.access_token;
}

export function docUrl(id: string): string {
  return `https://docs.google.com/document/d/${id}/edit`;
}

/**
 * Creates a native Google Doc from HTML in the given folder (Drive converts
 * `text/html` on upload). Returns the file id and the edit URL.
 */
export async function createGoogleDoc(
  input: { title: string; html: string; folderId: string },
  env: DriveEnv,
  fetchFn: FetchFn = fetch
): Promise<{ id: string; url: string }> {
  const token = await getAccessToken(env, fetchFn);
  const boundary = `icmb_worksheet_${Math.random().toString(36).slice(2)}`;
  const metadata = JSON.stringify({
    name: input.title,
    mimeType: GOOGLE_DOC_MIME,
    parents: [input.folderId],
  });
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    input.html,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const res = await fetchFn(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (!res.ok) {
    let detail = "";
    try {
      const err = (await res.json()) as { error?: { message?: string } };
      detail = err.error?.message ?? "";
    } catch {
      // body was not JSON; the status is enough
    }
    throw new ConvexError(
      `Google Drive rejected the document (${res.status})${detail ? `: ${detail}` : ""}`
    );
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new ConvexError("Google Drive returned no file id");
  return { id: data.id, url: docUrl(data.id) };
}

export const GOOGLE_FOLDER_MIME = "application/vnd.google-apps.folder";

export function folderUrl(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`;
}

/** The member-facing link: Docs opens a "Make a copy" prompt instead of the master. */
export function copyUrl(editUrl: string): string {
  return editUrl.replace(/\/edit$/, "/copy");
}

async function driveError(res: Response, what: string): Promise<ConvexError<string>> {
  let detail = "";
  try {
    const err = (await res.json()) as { error?: { message?: string } };
    detail = err.error?.message ?? "";
  } catch {
    // body was not JSON; the status is enough
  }
  return new ConvexError(
    `Google Drive rejected the ${what} (${res.status})${detail ? `: ${detail}` : ""}`
  );
}

/**
 * Creates a folder under `parentId`. Same token and `drive.file` scope as the
 * Docs: the app can only see folders it created, which is all it needs.
 */
export async function createFolder(
  input: { name: string; parentId: string },
  env: DriveEnv,
  fetchFn: FetchFn = fetch
): Promise<{ id: string; url: string }> {
  const token = await getAccessToken(env, fetchFn);
  const res = await fetchFn("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({
      name: input.name,
      mimeType: GOOGLE_FOLDER_MIME,
      parents: [input.parentId],
    }),
  });
  if (!res.ok) throw await driveError(res, "folder");
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new ConvexError("Google Drive returned no folder id");
  return { id: data.id, url: folderUrl(data.id) };
}

/**
 * Finds a folder by exact name directly under `parentId`, or returns null.
 * Lets a module tree be re-run without creating duplicate folders.
 */
export async function findChildFolder(
  input: { name: string; parentId: string },
  env: DriveEnv,
  fetchFn: FetchFn = fetch
): Promise<{ id: string; url: string } | null> {
  const token = await getAccessToken(env, fetchFn);
  const name = input.name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const q = `name = '${name}' and '${input.parentId}' in parents and mimeType = '${GOOGLE_FOLDER_MIME}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`;
  const res = await fetchFn(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw await driveError(res, "folder lookup");
  const data = (await res.json()) as { files?: { id: string }[] };
  const hit = data.files?.[0];
  return hit ? { id: hit.id, url: folderUrl(hit.id) } : null;
}
