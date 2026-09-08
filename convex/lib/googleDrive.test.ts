import { describe, it, expect } from "vitest";
import {
  createGoogleDoc,
  driveEnvFromProcess,
  getAccessToken,
  GOOGLE_DOC_MIME,
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
