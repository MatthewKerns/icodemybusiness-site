#!/usr/bin/env node
/**
 * One-time setup for the Skool worksheets Drive connection (docs/skool-worksheets.md).
 *
 * Signs Matthew's Google account in once with scope `drive.file` (the app can
 * only touch files it creates), creates the designated "Skool Worksheets"
 * folder with that grant, and prints the four `npx convex env set` commands to
 * run. Nothing is written to disk. Node built-ins only.
 *
 *   GOOGLE_OAUTH_CLIENT_ID=… GOOGLE_OAUTH_CLIENT_SECRET=… node scripts/google-drive-oauth.mjs
 *
 * The client id/secret come from a Google Cloud OAuth client of type
 * "Desktop app" with the Drive API enabled. Not part of any deploy path.
 */
import http from "node:http";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER_NAME = "Skool Worksheets";

async function ask(question) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || (await ask("OAuth client id: "));
const clientSecret =
  process.env.GOOGLE_OAUTH_CLIENT_SECRET || (await ask("OAuth client secret: "));
if (!clientId || !clientSecret) {
  console.error("Both the client id and the client secret are required.");
  process.exit(2);
}

const state = crypto.randomBytes(16).toString("hex");

const { code, redirectUri } = await new Promise((resolve, reject) => {
  let redirectUri = "";
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname !== "/callback") {
      res.writeHead(404).end();
      return;
    }
    if (url.searchParams.get("state") !== state) {
      res.writeHead(400).end("State mismatch — run the script again.");
      reject(new Error("state mismatch"));
      return;
    }
    const err = url.searchParams.get("error");
    if (err) {
      res.writeHead(400).end(`Google returned: ${err}`);
      reject(new Error(err));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" }).end(
      "Connected. You can close this tab and go back to the terminal."
    );
    resolve({ code: url.searchParams.get("code"), redirectUri });
    setTimeout(() => server.close(), 100);
  });
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    redirectUri = `http://127.0.0.1:${port}/callback`;
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
    }).toString();
    console.log("\nOpen this in the browser signed in as the Drive owner (12kernsmatthew@gmail.com):\n");
    console.log(authUrl.toString());
    console.log("");
    execFile("open", [authUrl.toString()], () => {});
  });
  server.on("error", reject);
});

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  }).toString(),
});
const tokens = await tokenRes.json();
if (!tokenRes.ok || !tokens.refresh_token) {
  console.error("Token exchange failed:", tokenRes.status, tokens.error ?? "", tokens.error_description ?? "");
  console.error("If there is no refresh_token, revoke the app at myaccount.google.com/permissions and run again.");
  process.exit(1);
}

const folderRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,webViewLink", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${tokens.access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
});
const folder = await folderRes.json();
if (!folderRes.ok || !folder.id) {
  console.error("Could not create the folder:", folderRes.status, folder.error?.message ?? "");
  process.exit(1);
}

console.log(`\nCreated Drive folder "${FOLDER_NAME}": ${folder.webViewLink}`);
console.log("Move it into iCodeMyBusiness / Skool Academy in Drive if you like — the id stays the same.\n");
console.log("Now set the Convex env (run these yourself; add --prod for the production deployment):\n");
console.log(`  npx convex env set GOOGLE_OAUTH_CLIENT_ID '${clientId}'`);
console.log(`  npx convex env set GOOGLE_OAUTH_CLIENT_SECRET '${clientSecret}'`);
console.log(`  npx convex env set GOOGLE_DRIVE_REFRESH_TOKEN '${tokens.refresh_token}'`);
console.log(`  npx convex env set SKOOL_WORKSHEETS_FOLDER_ID '${folder.id}'`);
console.log("\nThen share the folder once in Drive: Share → General access → Anyone with the link → Viewer.");
