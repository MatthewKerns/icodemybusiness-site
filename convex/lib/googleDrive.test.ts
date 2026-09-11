import { describe, it, expect } from "vitest";
import {
  copyUrl,
  createFolder,
  createGoogleDoc,
  driveEnvFromProcess,
  findChildFolder,
  getAccessToken,
  GOOGLE_DOC_MIME,
  GOOGLE_FOLDER_MIME,
  type DriveEnv,
  type FetchFn,
} from "./googleDrive";

const ENV: DriveEnv = {
  clientId: "client-id",
  clientSecret: "client-secret",
  refreshToken: "refresh-token",
  folderId: "folder123",
};

type Call = { url: string; init: RequestInit };

/** A fetch double that records calls and answers from a queue. */
function fakeFetch(responses: Response[]): { fetchFn: FetchFn; calls: Call[] } {
  const calls: Call[] = [];
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses.shift();
    if (!next) throw new Error("fakeFetch: no response queued");
    return next;
  }) as FetchFn;
  return { fetchFn, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("driveEnvFromProcess", () => {
  it("names the missing variable without printing any value", () => {
    expect(() =>
      driveEnvFromProcess({
        GOOGLE_OAUTH_CLIENT_ID: "id",
        GOOGLE_OAUTH_CLIENT_SECRET: "secret-value",
        GOOGLE_DRIVE_REFRESH_TOKEN: "",
        SKOOL_WORKSHEETS_FOLDER_ID: "f",
      })
    ).toThrow(/GOOGLE_DRIVE_REFRESH_TOKEN is not set/);
    try {
      driveEnvFromProcess({ GOOGLE_OAUTH_CLIENT_ID: "id" });
    } catch (err) {
      expect(String((err as { data?: unknown }).data ?? err)).not.toContain("secret-value");
    }
  });

  it("reads all four variables", () => {
    expect(
      driveEnvFromProcess({
        GOOGLE_OAUTH_CLIENT_ID: " id ",
        GOOGLE_OAUTH_CLIENT_SECRET: "s",
        GOOGLE_DRIVE_REFRESH_TOKEN: "r",
        SKOOL_WORKSHEETS_FOLDER_ID: "f",
      })
    ).toEqual({ clientId: "id", clientSecret: "s", refreshToken: "r", folderId: "f" });
  });
});

describe("getAccessToken", () => {
  it("exchanges the refresh token", async () => {
    const { fetchFn, calls } = fakeFetch([json({ access_token: "at-1" })]);
    expect(await getAccessToken(ENV, fetchFn)).toBe("at-1");
    expect(calls[0].url).toBe("https://oauth2.googleapis.com/token");
    const body = new URLSearchParams(String(calls[0].init.body));
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("refresh-token");
    expect(body.get("client_id")).toBe("client-id");
  });

  it("fails with the status when Google refuses", async () => {
    const { fetchFn } = fakeFetch([json({ error: "invalid_grant" }, 400)]);
    await expect(getAccessToken(ENV, fetchFn)).rejects.toThrow(/sign-in failed \(400\)/);
  });
});

describe("createGoogleDoc", () => {
  it("uploads HTML as a native Google Doc into the folder and returns the edit URL", async () => {
    const { fetchFn, calls } = fakeFetch([json({ access_token: "at-2" }), json({ id: "doc42" })]);
    const result = await createGoogleDoc(
      { title: "CLK-003 – Log the objective", html: "<h1>Hi</h1>", folderId: "folder123" },
      ENV,
      fetchFn
    );
    expect(result).toEqual({ id: "doc42", url: "https://docs.google.com/document/d/doc42/edit" });

    const upload = calls[1];
    expect(upload.url).toContain("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart");
    const headers = upload.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer at-2");
    expect(headers["Content-Type"]).toMatch(/^multipart\/related; boundary=/);

    const body = String(upload.init.body);
    const metadata = JSON.parse(body.split("\r\n\r\n")[1].split("\r\n")[0]) as {
      name: string;
      mimeType: string;
      parents: string[];
    };
    expect(metadata).toEqual({
      name: "CLK-003 – Log the objective",
      mimeType: GOOGLE_DOC_MIME,
      parents: ["folder123"],
    });
    expect(body).toContain("Content-Type: text/html; charset=UTF-8");
    expect(body).toContain("<h1>Hi</h1>");
  });

  it("surfaces Drive's error message without the token", async () => {
    const { fetchFn } = fakeFetch([
      json({ access_token: "at-3" }),
      json({ error: { message: "File not found: folder123." } }, 404),
    ]);
    await expect(
      createGoogleDoc({ title: "t", html: "<p>x</p>", folderId: "folder123" }, ENV, fetchFn)
    ).rejects.toThrow(/rejected the document \(404\): File not found: folder123\./);
  });
});

describe("createFolder", () => {
  it("creates a folder under the parent with the folder mime type", async () => {
    const { fetchFn, calls } = fakeFetch([json({ access_token: "at-4" }), json({ id: "fold7" })]);
    const result = await createFolder({ name: "03 Your inbox runs your week", parentId: "root1" }, ENV, fetchFn);
    expect(result).toEqual({ id: "fold7", url: "https://drive.google.com/drive/folders/fold7" });
    const create = calls[1];
    expect(create.url).toBe("https://www.googleapis.com/drive/v3/files?fields=id");
    expect((create.init.headers as Record<string, string>).Authorization).toBe("Bearer at-4");
    expect(JSON.parse(String(create.init.body))).toEqual({
      name: "03 Your inbox runs your week",
      mimeType: GOOGLE_FOLDER_MIME,
      parents: ["root1"],
    });
  });

  it("surfaces Drive's error for a bad parent", async () => {
    const { fetchFn } = fakeFetch([
      json({ access_token: "at-5" }),
      json({ error: { message: "File not found: root1." } }, 404),
    ]);
    await expect(createFolder({ name: "x", parentId: "root1" }, ENV, fetchFn)).rejects.toThrow(
      /rejected the folder \(404\): File not found: root1\./
    );
  });
});

describe("findChildFolder", () => {
  it("queries by exact name under the parent and returns the first hit", async () => {
    const { fetchFn, calls } = fakeFetch([json({ access_token: "at-6" }), json({ files: [{ id: "fold9" }] })]);
    const hit = await findChildFolder({ name: "Matthew's module", parentId: "root1" }, ENV, fetchFn);
    expect(hit).toEqual({ id: "fold9", url: "https://drive.google.com/drive/folders/fold9" });
    const q = decodeURIComponent(new URL(calls[1].url).searchParams.get("q") ?? "");
    expect(q).toContain("name = 'Matthew\\'s module'");
    expect(q).toContain("'root1' in parents");
    expect(q).toContain(`mimeType = '${GOOGLE_FOLDER_MIME}'`);
    expect(q).toContain("trashed = false");
  });

  it("returns null when nothing matches", async () => {
    const { fetchFn } = fakeFetch([json({ access_token: "at-7" }), json({ files: [] })]);
    expect(await findChildFolder({ name: "none", parentId: "root1" }, ENV, fetchFn)).toBeNull();
  });
});

describe("copyUrl", () => {
  it("turns the edit link into the member copy link", () => {
    expect(copyUrl("https://docs.google.com/document/d/doc42/edit")).toBe(
      "https://docs.google.com/document/d/doc42/copy"
    );
  });
});
