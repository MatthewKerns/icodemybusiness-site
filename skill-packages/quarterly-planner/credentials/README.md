# Google Drive — one-time read-only setup

The quarterly planner can read your prior plans and V/TO from Google Drive. This
folder ships **empty on purpose** — you bring your own OAuth credentials so the
tool only ever touches *your* Drive, read-only. Skip this entirely if you'd
rather paste your plan in or use a local Drive mount.

## Steps

1. Go to <https://console.cloud.google.com/> → create (or pick) a project.
2. **APIs & Services → Library** → enable the **Google Drive API**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - Application type: **Desktop app**.
4. **Download JSON** and save it here as `credentials/credentials.json`.
5. First run of `gather_drive.py` opens a browser to authorize. The resulting
   token is written to `../tokens/quarterly_planner_token.json`.

## Scope & safety

- The tool requests **`drive.readonly`** only — it can read your files but
  **cannot create, edit, or delete** anything.
- `credentials.json` and everything under `tokens/` are git-ignored
  (see `../.gitignore`). **Never commit or share them.**
- Revoke access anytime at <https://myaccount.google.com/permissions>.
