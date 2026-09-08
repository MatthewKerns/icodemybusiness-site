# Skool worksheets — how `/admin/x` creates Google Docs

Every tactic in the X post engine can have one worksheet: a native Google Doc, owned by
Matthew, in **one designated Drive folder** (`Skool Worksheets`). Members of the Skool
community get the copy link (`<doc url with /copy instead of /edit>`); Matthew edits the master.
The admin page creates the Docs itself through the Google Drive API — no Claude session in the
loop — and skills feed it drafted content.

## Pieces

| Piece | Where |
|---|---|
| `xTactics.worksheetUrl`, `worksheetDraft` | `convex/schema.ts` |
| `xTactics:createWorksheetDoc` (action) — Create button | `convex/xTactics.ts` |
| `xTactics:createDocFromMarkdown` (action) — any doc, no tactic | `convex/xTactics.ts` |
| `xTactics:setWorksheetDraft`, `setWorksheet` (mutations) | `convex/xTactics.ts` |
| Drive API client (token refresh, multipart upload → Google Doc) | `convex/lib/googleDrive.ts` |
| Worksheet body: draft → HTML, or the scaffold | `convex/lib/worksheet.ts` |
| Buttons: Create worksheet / Open worksheet / Link worksheet | `src/app/admin/x/page.tsx` |
| One-time sign-in + folder creation | `scripts/google-drive-oauth.mjs` |
| Skill that drafts from transcripts and creates docs | `.claude/skills/skool-worksheet/` (local) |

## One-time setup (Matthew)

1. Google Cloud console → a project (any) → **APIs & Services → Enable** the *Google Drive API*.
2. **Credentials → Create credentials → OAuth client ID**, application type **Desktop app**.
   Copy the client id and secret. (If the consent screen is in "Testing", add
   12kernsmatthew@gmail.com as a test user.)
3. From the repo root:
   ```bash
   GOOGLE_OAUTH_CLIENT_ID='…' GOOGLE_OAUTH_CLIENT_SECRET='…' node scripts/google-drive-oauth.mjs
   ```
   It opens the Google consent page (sign in as the Drive owner, 12kernsmatthew@gmail.com),
   receives the grant on `127.0.0.1`, creates the `Skool Worksheets` folder, and prints four
   `npx convex env set …` commands. Nothing is saved to disk.
4. Run those four commands for the dev deployment, and again with `--prod` for production
   (`neat-hamster-414`). Names only, to check: `scripts/convex-env-names.sh --prod`.
5. In Drive: drag `Skool Worksheets` into `iCodeMyBusiness / Skool Academy` (optional; the id is
   stable), then **Share → General access → Anyone with the link → Viewer** — once. Every doc
   inside inherits it, which is what makes the `/copy` link work for members.

Scope is `drive.file`: the token can only see files and folders this app created. A leaked
token cannot read the rest of the Drive. To revoke: myaccount.google.com/permissions.

## How a worksheet gets made

- **Create worksheet** (admin page, per tactic): `createWorksheetDoc` builds the body — the
  skill-drafted `worksheetDraft` if there is one, otherwise a scaffold around the tactic's own
  text flagged `[Matthew: …]` — converts it to HTML, uploads it as a native Google Doc into the
  folder, and stores the edit URL on the tactic. The row flips to **Open worksheet**.
- **Skill path**: `/skool-worksheet` reads the academy outline and transcripts, drafts Markdown,
  stores it with `setWorksheetDraft`, then either calls `createWorksheetDoc` or leaves the
  "draft ready" badge for Matthew to click Create.
- **Docs without a tactic** (module "Start here" pages, imports): `createDocFromMarkdown`.
- **Link worksheet** stays for pasting an existing Doc's URL; only `docs.google.com/document`
  links are accepted.

CLI form (owner-gated functions need a mocked owner identity on the dev deployment):

```bash
ID='{"subject":"cli-skool","tokenIdentifier":"cli|skool","email":"matthew@icodemybusiness.com","emailVerified":true}'
npx convex run xTactics:createWorksheetDoc '{"id":"<xTactics _id>"}' --identity "$ID"
npx convex run xTactics:createDocFromMarkdown '{"title":"1.0 Start here","markdown":"# …"}' --identity "$ID"
```

## Errors you will see

| Message | Meaning |
|---|---|
| `Google Drive is not connected: <VAR> is not set` | step 4 above not done for this deployment |
| `Google Drive sign-in failed (400)` | refresh token revoked or client changed — run the script again |
| `Google Drive rejected the document (404): File not found` | `SKOOL_WORKSHEETS_FOLDER_ID` is not a folder this token created (`drive.file`) |
