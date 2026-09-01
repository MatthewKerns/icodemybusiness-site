#!/usr/bin/env python3
"""
Archive ~/Downloads to Google Drive with verify-before-delete safety.

- Creates "Downloads Archive" folder + Files/Videos/Apps subfolders in Drive
  (required because OAuth scope is drive.file — only app-created folders are
  visible to this app).
- Skips anything modified in the last N days (default 30).
- Top-level loose files: routed by extension to Files/Videos/Apps.
- Top-level subdirectories: zipped (one at a time, /tmp staging) and uploaded.
- Verifies every uploaded name appears in a recursive Drive scan before
  deleting anything locally.
"""

import argparse
import json
import os
import shutil
import sys
import time
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload


SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent
TOKENS_DIR = BASE_DIR / "tokens"
FOLDER_CONFIG_PATH = BASE_DIR / "downloads_archive_folder.json"

STAGING_DIR = Path("/tmp/downloads_archive_staging")

ROOT_FOLDER_NAME = "Downloads Archive"
SUBFOLDER_NAMES = ("Files", "Videos", "Apps")

VIDEO_EXTS = {".mov", ".mp4", ".mkv", ".avi", ".webm", ".m4v"}
APP_EXTS = {".app", ".dmg", ".pkg"}
SKIP_NAMES = {".DS_Store", ".localized"}


def load_credentials():
    token_path = TOKENS_DIR / "google_drive_token.json"
    if not token_path.exists():
        print(f"❌ No token file: {token_path}")
        return None

    with open(token_path) as f:
        token_data = json.load(f)

    creds = Credentials(
        token=token_data.get("token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri=token_data.get("token_uri"),
        client_id=token_data.get("client_id"),
        client_secret=token_data.get("client_secret"),
        scopes=token_data.get("scopes", []),
    )

    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            token_data["token"] = creds.token
            with open(token_path, "w") as f:
                json.dump(token_data, f, indent=2)
        else:
            print("❌ Token invalid and cannot refresh — run authenticate.py")
            return None

    return creds


def format_size(n: int) -> str:
    if n < 1024 * 1024:
        return f"{n / 1024:.1f} KB"
    if n < 1024 ** 3:
        return f"{n / (1024 ** 2):.1f} MB"
    return f"{n / (1024 ** 3):.2f} GB"


def categorize(name: str) -> str:
    ext = Path(name).suffix.lower()
    if ext in VIDEO_EXTS:
        return "Videos"
    if ext in APP_EXTS:
        return "Apps"
    return "Files"


def should_archive_file(p: Path, cutoff_mtime: float) -> bool:
    if p.name in SKIP_NAMES or p.name.startswith("."):
        return False
    try:
        return p.stat().st_mtime < cutoff_mtime
    except OSError:
        return False


def dir_is_settled(p: Path, cutoff_mtime: float) -> bool:
    """True iff no file inside p (recursive) was modified after cutoff_mtime."""
    try:
        for root, _dirs, files in os.walk(p):
            for name in files:
                fp = os.path.join(root, name)
                try:
                    if os.stat(fp).st_mtime >= cutoff_mtime:
                        return False
                except OSError:
                    continue
    except OSError:
        return False
    return True


def dir_size(p: Path) -> int:
    total = 0
    try:
        for root, _dirs, files in os.walk(p):
            for name in files:
                try:
                    total += os.stat(os.path.join(root, name)).st_size
                except OSError:
                    continue
    except OSError:
        pass
    return total


def create_folder(service, name: str, parent_id: Optional[str] = None) -> str:
    body = {"name": name, "mimeType": "application/vnd.google-apps.folder"}
    if parent_id:
        body["parents"] = [parent_id]
    f = service.files().create(body=body, fields="id").execute()
    return f["id"]


def folder_exists(service, folder_id: str) -> bool:
    try:
        f = service.files().get(fileId=folder_id, fields="id,trashed").execute()
        return not f.get("trashed", False)
    except Exception:
        return False


def ensure_archive_folders(service, dry_run: bool = False) -> Dict[str, str]:
    """Returns {'root': id, 'Files': id, 'Videos': id, 'Apps': id}. Persists to JSON."""
    if FOLDER_CONFIG_PATH.exists():
        with open(FOLDER_CONFIG_PATH) as f:
            cached = json.load(f)
        if all(k in cached for k in ("root",) + SUBFOLDER_NAMES) and all(
            folder_exists(service, cached[k]) for k in ("root",) + SUBFOLDER_NAMES
        ):
            return cached
        print("⚠️  Cached folder IDs stale — recreating")

    if dry_run:
        return {k: f"<would-create:{k}>" for k in ("root",) + SUBFOLDER_NAMES}

    root_id = create_folder(service, ROOT_FOLDER_NAME)
    ids = {"root": root_id}
    for sub in SUBFOLDER_NAMES:
        ids[sub] = create_folder(service, sub, parent_id=root_id)

    with open(FOLDER_CONFIG_PATH, "w") as f:
        json.dump(ids, f, indent=2)

    return ids


def get_drive_names_recursive(service, folder_id: str) -> Set[str]:
    names: Set[str] = set()

    def scan(parent_id: str):
        query = f"'{parent_id}' in parents and trashed=false"
        page_token = None
        while True:
            res = service.files().list(
                q=query,
                spaces="drive",
                fields="nextPageToken, files(id, name, mimeType)",
                pageSize=1000,
                pageToken=page_token,
            ).execute()
            for item in res.get("files", []):
                if item["mimeType"] == "application/vnd.google-apps.folder":
                    scan(item["id"])
                else:
                    names.add(item["name"])
            page_token = res.get("nextPageToken")
            if not page_token:
                break

    scan(folder_id)
    return names


def upload_file(service, path: Path, parent_id: str) -> Optional[str]:
    try:
        media = MediaFileUpload(str(path), resumable=True)
        f = service.files().create(
            body={"name": path.name, "parents": [parent_id]},
            media_body=media,
            fields="id,name",
        ).execute()
        return f["id"]
    except Exception as e:
        print(f"  ❌ Upload failed: {e}")
        return None


def zip_subdir(subdir: Path, staging: Path) -> Path:
    staging.mkdir(parents=True, exist_ok=True)
    zip_path = staging / f"{subdir.name}.zip"
    if zip_path.exists():
        zip_path.unlink()
    # ZIP format can't represent timestamps before 1980-01-01. Build ZipInfo
    # manually so we can clamp the date_time and still write file contents.
    min_dt = (1980, 1, 1, 0, 0, 0)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, allowZip64=True) as zf:
        for root, _dirs, files in os.walk(subdir):
            for name in files:
                if name in SKIP_NAMES:
                    continue
                full = Path(root) / name
                arc = str(full.relative_to(subdir.parent))
                try:
                    st = full.stat()
                    dt = time.localtime(st.st_mtime)[:6]
                    if dt < min_dt:
                        dt = min_dt
                    zi = zipfile.ZipInfo(filename=arc, date_time=dt)
                    zi.compress_type = zipfile.ZIP_DEFLATED
                    zi.external_attr = (st.st_mode & 0xFFFF) << 16
                    with open(full, "rb") as src:
                        zf.writestr(zi, src.read())
                except OSError as e:
                    print(f"  ⚠️  Skipping {full}: {e}")
    return zip_path


def plan_loose_files(downloads: Path, cutoff_mtime: float) -> List[Path]:
    out: List[Path] = []
    for p in downloads.iterdir():
        # Skip macOS .app bundles (they appear as dirs but should be zipped as a unit)
        if p.is_file() and should_archive_file(p, cutoff_mtime):
            out.append(p)
    return sorted(out)


def plan_subdirs(downloads: Path, cutoff_mtime: float) -> Tuple[List[Path], List[Path]]:
    """Returns (settled_subdirs_to_archive, skipped_too_recent)."""
    settled: List[Path] = []
    skipped: List[Path] = []
    for p in sorted(downloads.iterdir()):
        if not p.is_dir() or p.name.startswith("."):
            continue
        if dir_is_settled(p, cutoff_mtime):
            settled.append(p)
        else:
            skipped.append(p)
    return settled, skipped


def print_dry_run(downloads: Path, loose: List[Path], settled: List[Path], skipped: List[Path], max_age_days: int):
    print("=" * 80)
    print(f"DRY RUN — archive plan for {downloads}")
    print(f"Recency filter: skip anything modified in last {max_age_days} days")
    print("=" * 80)

    by_cat: Dict[str, List[Path]] = {"Files": [], "Videos": [], "Apps": []}
    for f in loose:
        by_cat[categorize(f.name)].append(f)

    total_loose_bytes = sum(f.stat().st_size for f in loose if f.exists())
    print(f"\n📄 Loose files to upload: {len(loose)} ({format_size(total_loose_bytes)})")
    for cat in ("Files", "Videos", "Apps"):
        items = by_cat[cat]
        if not items:
            continue
        cat_bytes = sum(p.stat().st_size for p in items if p.exists())
        print(f"  → {cat}: {len(items)} files ({format_size(cat_bytes)})")
        for p in items[:5]:
            print(f"      {p.name}  ({format_size(p.stat().st_size)})")
        if len(items) > 5:
            print(f"      ... and {len(items) - 5} more")

    total_subdir_bytes = sum(dir_size(d) for d in settled)
    print(f"\n📁 Subdirectories to zip+upload: {len(settled)} (uncompressed ~{format_size(total_subdir_bytes)})")
    for d in settled[:10]:
        print(f"      {d.name}/  (~{format_size(dir_size(d))})")
    if len(settled) > 10:
        print(f"      ... and {len(settled) - 10} more")

    if skipped:
        print(f"\n⏭️  Subdirectories SKIPPED (recent activity): {len(skipped)}")
        for d in skipped[:10]:
            print(f"      {d.name}/")
        if len(skipped) > 10:
            print(f"      ... and {len(skipped) - 10} more")

    print(f"\nTotal estimated upload: {format_size(total_loose_bytes + total_subdir_bytes)}")
    print(f"Destination: Drive folder \"{ROOT_FOLDER_NAME}\" (created on real run)")
    print("\n(No API calls made. No files uploaded. No files deleted.)")


def confirm(prompt: str, force: bool) -> bool:
    if force:
        return True
    try:
        ans = input(f"{prompt} [y/N]: ").strip().lower()
    except EOFError:
        return False
    return ans in ("y", "yes")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--downloads-path", default=str(Path.home() / "Downloads"))
    ap.add_argument("--max-age-days", type=int, default=30,
                    help="Skip files/dirs modified within this many days (default 30)")
    ap.add_argument("--dry-run", action="store_true",
                    help="Show plan without touching Drive or disk")
    ap.add_argument("--no-delete", action="store_true",
                    help="Upload + verify but never delete local files")
    ap.add_argument("--force", action="store_true",
                    help="Skip all confirmation prompts")
    ap.add_argument("--folders-only", action="store_true",
                    help="Create (or reuse) Drive folders, print URL, exit — no uploads")
    args = ap.parse_args()

    downloads = Path(args.downloads_path).expanduser().resolve()
    if not downloads.is_dir():
        print(f"❌ Not a directory: {downloads}")
        sys.exit(1)

    cutoff_mtime = (datetime.now() - timedelta(days=args.max_age_days)).timestamp()

    if args.folders_only:
        print("🔑 Loading credentials...")
        creds = load_credentials()
        if not creds:
            sys.exit(1)
        service = build("drive", "v3", credentials=creds)
        print("📂 Ensuring Drive archive folders exist...")
        folders = ensure_archive_folders(service)
        url = f"https://drive.google.com/drive/folders/{folders['root']}"
        print(f"\n✅ Drive folder ready:\n  {url}")
        print(f"\nSubfolder IDs: " + ", ".join(f"{k}={v[:8]}…" for k, v in folders.items() if k != "root"))
        print(f"Persisted to: {FOLDER_CONFIG_PATH}")
        return

    print(f"🔍 Scanning {downloads}...")
    loose = plan_loose_files(downloads, cutoff_mtime)
    settled, skipped = plan_subdirs(downloads, cutoff_mtime)

    if args.dry_run:
        print_dry_run(downloads, loose, settled, skipped, args.max_age_days)
        return

    if not loose and not settled:
        print("✅ Nothing to archive (everything is recent or already gone).")
        return

    # Live run: need credentials + folders
    print("🔑 Loading credentials...")
    creds = load_credentials()
    if not creds:
        sys.exit(1)
    service = build("drive", "v3", credentials=creds)

    print("📂 Ensuring Drive archive folders exist...")
    folders = ensure_archive_folders(service)
    root_url = f"https://drive.google.com/drive/folders/{folders['root']}"

    print("🔁 Scanning Drive for already-uploaded names (idempotent skip)...")
    existing_drive_names = get_drive_names_recursive(service, folders["root"])
    print(f"  Found {len(existing_drive_names)} existing names — these will be skipped")

    skipped_loose = [p for p in loose if p.name in existing_drive_names]
    loose = [p for p in loose if p.name not in existing_drive_names]
    skipped_subdirs = [d for d in settled if f"{d.name}.zip" in existing_drive_names]
    settled = [d for d in settled if f"{d.name}.zip" not in existing_drive_names]

    total_loose_bytes = sum(p.stat().st_size for p in loose if p.exists())
    total_subdir_bytes = sum(dir_size(d) for d in settled)

    print("\n" + "=" * 80)
    print("READY TO UPLOAD")
    print("=" * 80)
    print(f"Drive folder: {root_url}")
    print(f"  • Loose files to upload:  {len(loose):>4} ({format_size(total_loose_bytes)})")
    print(f"  • Subdir zips to upload:  {len(settled):>4} (uncompressed ~{format_size(total_subdir_bytes)})")
    print(f"  • Already in Drive (skip): {len(skipped_loose)} loose, {len(skipped_subdirs)} subdirs")
    print(f"  • Will delete locally after verification: {'NO' if args.no_delete else 'YES'}")

    if not confirm("\n🔎 Open the Drive folder above and confirm it's the right destination. Proceed?", args.force):
        print("Aborted by user. Drive folder remains (empty); nothing uploaded or deleted.")
        return

    uploaded_names: Set[str] = set()
    uploaded_loose: List[Path] = []
    uploaded_subdirs: List[Path] = []
    failures: List[str] = []

    # ── Phase 1: loose files ──────────────────────────────────────────────
    print("\n── Uploading loose files ──")
    for i, p in enumerate(loose, 1):
        cat = categorize(p.name)
        target = folders[cat]
        size_str = format_size(p.stat().st_size)
        print(f"  [{i}/{len(loose)}] {cat}/  {p.name}  ({size_str})", end=" ", flush=True)
        if upload_file(service, p, target):
            uploaded_names.add(p.name)
            uploaded_loose.append(p)
            print("✓")
        else:
            failures.append(p.name)
            print("✗")

    # ── Phase 2: subdir zips ──────────────────────────────────────────────
    STAGING_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\n── Zipping + uploading subdirs (staging: {STAGING_DIR}) ──")
    for i, d in enumerate(settled, 1):
        print(f"  [{i}/{len(settled)}] {d.name}/  → zip...", end=" ", flush=True)
        try:
            zip_path = zip_subdir(d, STAGING_DIR)
        except Exception as e:
            print(f"✗ ({e})")
            failures.append(f"{d.name}.zip")
            continue
        zsize = format_size(zip_path.stat().st_size)
        target = folders["Apps"] if d.name.endswith(".app") else folders["Files"]
        print(f"({zsize}) → upload...", end=" ", flush=True)
        if upload_file(service, zip_path, target):
            uploaded_names.add(zip_path.name)
            uploaded_subdirs.append(d)
            print("✓")
        else:
            failures.append(zip_path.name)
            print("✗")
        try:
            zip_path.unlink()
        except OSError:
            pass

    # Clean staging
    try:
        shutil.rmtree(STAGING_DIR, ignore_errors=True)
    except OSError:
        pass

    # ── Phase 3: verify ───────────────────────────────────────────────────
    print("\n── Verifying uploads (recursive Drive scan) ──")
    time.sleep(2)
    drive_names = get_drive_names_recursive(service, folders["root"])
    # Verify both fresh uploads and items skipped as already-present
    expected = uploaded_names | {p.name for p in skipped_loose} | {f"{d.name}.zip" for d in skipped_subdirs}
    missing = expected - drive_names

    print(f"  Drive has {len(drive_names)} files under \"{ROOT_FOLDER_NAME}\"")
    print(f"  We uploaded {len(uploaded_names)} names — missing in Drive: {len(missing)}")

    if missing:
        print("\n⚠️  Some uploaded names not found in Drive — local files preserved:")
        for n in sorted(missing)[:20]:
            print(f"    {n}")
        if len(missing) > 20:
            print(f"    ... and {len(missing) - 20} more")
        if failures:
            print(f"  Plus {len(failures)} upload failures during this run.")
        print("\nSAFE EXIT: nothing deleted locally.")
        sys.exit(2)

    if failures:
        print(f"\n⚠️  {len(failures)} uploads failed during this run. Local files preserved.")
        print("SAFE EXIT: nothing deleted locally.")
        sys.exit(2)

    print("✅ All uploaded names verified in Drive.")

    if args.no_delete:
        print("\n--no-delete set: skipping local deletion. Done.")
        return

    # ── Phase 4: delete locally ───────────────────────────────────────────
    # Delete both fresh uploads AND items skipped as already-uploaded (which
    # are verified-present in Drive by the check above).
    to_delete_files = uploaded_loose + [p for p in skipped_loose if p.exists()]
    to_delete_dirs = uploaded_subdirs + [d for d in skipped_subdirs if d.exists()]
    print(f"\n── Deleting verified local files ── ({len(to_delete_files)} files, {len(to_delete_dirs)} dirs)")
    freed = 0
    for p in to_delete_files:
        try:
            freed += p.stat().st_size
            p.unlink()
        except OSError as e:
            print(f"  ⚠️  Could not delete {p.name}: {e}")
    for d in to_delete_dirs:
        try:
            freed += dir_size(d)
            shutil.rmtree(d)
        except OSError as e:
            print(f"  ⚠️  Could not delete {d.name}/: {e}")

    print(f"\n✅ Done. Local space reclaimed: {format_size(freed)}")
    print(f"   Drive folder: {root_url}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n❌ Interrupted")
        sys.exit(1)
