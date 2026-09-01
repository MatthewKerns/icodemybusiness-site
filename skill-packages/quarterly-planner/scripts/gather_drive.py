#!/usr/bin/env python3
"""Read planning context from Google Drive. READ-ONLY (drive.readonly scope).

Finds a folder by name (or all of My Drive), lists files modified in the window,
and exports Google Docs to plain text so the planner can read your prior
quarterly plan, the V/TO, and strategy docs. Never modifies anything in Drive.

One-time setup: see credentials/README.md (enable Drive API, download an OAuth
"Desktop app" credentials.json into credentials/). First run opens a browser to
authorize; the token is cached in tokens/ (git-ignored — never shared).

Usage:
    python3 gather_drive.py --folder "EOS" --since 120 --out context/drive.md
    python3 gather_drive.py --folder "My Drive" --since 90 --max 25
"""
from __future__ import annotations
import argparse, os, sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
CRED = HERE / "credentials" / "credentials.json"
TOKEN = HERE / "tokens" / "quarterly_planner_token.json"
DOC_MIME = "application/vnd.google-apps.document"


def get_service():
    try:
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
    except ImportError:
        print("Missing deps. Run: pip install -r requirements.txt", file=sys.stderr)
        raise SystemExit(1)

    creds = None
    if TOKEN.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CRED.exists():
                print(f"No credentials at {CRED} — see credentials/README.md", file=sys.stderr)
                raise SystemExit(1)
            flow = InstalledAppFlow.from_client_secrets_file(str(CRED), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN.parent.mkdir(parents=True, exist_ok=True)
        TOKEN.write_text(creds.to_json())
        os.chmod(TOKEN, 0o600)
    return build("drive", "v3", credentials=creds)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--folder", default="My Drive", help='folder name, or "My Drive" for root')
    ap.add_argument("--since", type=int, default=120, help="look-back days")
    ap.add_argument("--max", type=int, default=20, help="max docs to export")
    ap.add_argument("--out", default="context/drive.md")
    args = ap.parse_args()

    svc = get_service()
    after = (datetime.now(timezone.utc) - timedelta(days=args.since)).strftime("%Y-%m-%dT%H:%M:%SZ")

    q = [f"modifiedTime > '{after}'", "trashed = false"]
    if args.folder and args.folder != "My Drive":
        res = svc.files().list(
            q=f"name = '{args.folder}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            fields="files(id,name)", pageSize=1,
        ).execute()
        folders = res.get("files", [])
        if not folders:
            print(f"Folder '{args.folder}' not found — listing all of My Drive instead.", file=sys.stderr)
        else:
            q.append(f"'{folders[0]['id']}' in parents")

    res = svc.files().list(
        q=" and ".join(q),
        fields="files(id,name,mimeType,modifiedTime)",
        orderBy="modifiedTime desc", pageSize=100,
    ).execute()
    files = res.get("files", [])

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    exported = 0
    with out_path.open("w", encoding="utf-8") as o:
        o.write(f"# Google Drive context (folder: {args.folder}, last {args.since} days)\n\n")
        o.write(f"_Read-only. {len(files)} files matched._\n\n")
        if not files:
            o.write("_No files matched._\n")
        o.write("## Files\n\n")
        for f in files:
            o.write(f"- {f['name']}  _({f['mimeType'].split('.')[-1]}, {f['modifiedTime'][:10]})_\n")
        o.write("\n## Document contents (Google Docs, exported as text)\n\n")
        for f in files:
            if f["mimeType"] != DOC_MIME or exported >= args.max:
                continue
            try:
                text = svc.files().export(fileId=f["id"], mimeType="text/plain").execute()
                body = text.decode("utf-8", "ignore") if isinstance(text, bytes) else str(text)
            except Exception as e:  # noqa: BLE001 — surface, keep going
                o.write(f"### {f['name']}\n\n_Could not export: {e}_\n\n")
                continue
            o.write(f"### {f['name']}\n\n```\n{body[:8000].strip()}\n```\n\n")
            exported += 1

    print(f"Wrote {out_path} — {len(files)} files, {exported} docs exported.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
