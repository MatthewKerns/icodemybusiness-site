#!/usr/bin/env python3
"""
Archive Utility - Uploads files to appropriate Google Drive subfolders.

This utility:
1. Scans local folder for all files
2. Scans Google Drive folder AND all subfolders recursively
3. Identifies which files are missing
4. Uploads files to appropriate subfolders based on file type
5. Falls back to parent folder if no appropriate subfolder exists

Usage: python3 archive.py <local_folder> <drive_folder_id>
"""

import sys
import json
from pathlib import Path
from typing import Dict, Set, Optional
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload


SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent
TOKENS_DIR = BASE_DIR / "tokens"


def load_credentials():
    """Load and refresh OAuth credentials."""
    token_path = TOKENS_DIR / "google_drive_token.json"

    if not token_path.exists():
        print(f"❌ No token file found: {token_path}")
        return None

    with open(token_path, 'r') as f:
        token_data = json.load(f)

    creds = Credentials(
        token=token_data.get('token'),
        refresh_token=token_data.get('refresh_token'),
        token_uri=token_data.get('token_uri'),
        client_id=token_data.get('client_id'),
        client_secret=token_data.get('client_secret'),
        scopes=token_data.get('scopes', [])
    )

    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            token_data['token'] = creds.token
            with open(token_path, 'w') as f:
                json.dump(token_data, f, indent=2)
        else:
            print("❌ Token is invalid")
            return None

    return creds


def get_local_files(folder_path: Path) -> Dict[str, Path]:
    """Get local files (excludes .DS_Store)."""
    files = {}
    for file_path in folder_path.iterdir():
        if file_path.is_file() and file_path.name != '.DS_Store':
            files[file_path.name] = file_path
    return files


def get_cloud_structure(service, folder_id: str) -> tuple[Set[str], Dict[str, str]]:
    """
    Get all filenames in Drive folder AND map of subfolder names to IDs.
    Returns: (set of all filenames, dict of subfolder names to IDs)
    """
    files = set()
    subfolders = {}

    def scan_folder(parent_id: str, is_root: bool = False):
        try:
            query = f"'{parent_id}' in parents and trashed=false"
            page_token = None

            while True:
                results = service.files().list(
                    q=query,
                    spaces='drive',
                    fields='nextPageToken, files(id, name, mimeType)',
                    pageSize=1000,
                    pageToken=page_token
                ).execute()

                items = results.get('files', [])

                for item in items:
                    if item['mimeType'] == 'application/vnd.google-apps.folder':
                        # Store subfolder info if at root level
                        if is_root:
                            subfolders[item['name']] = item['id']
                        # Recursively scan subfolder
                        scan_folder(item['id'], is_root=False)
                    elif item['name'] != '.DS_Store':
                        files.add(item['name'])

                page_token = results.get('nextPageToken')
                if not page_token:
                    break

        except Exception as e:
            print(f"⚠️  Error scanning: {e}")

    scan_folder(folder_id, is_root=True)
    return files, subfolders


def determine_target_folder(filename: str, subfolders: Dict[str, str], parent_id: str) -> str:
    """
    Determine which folder to upload to based on filename and available subfolders.
    Returns folder ID.
    """
    # Video patterns
    video_extensions = {'.mov', '.mp4', '.avi', '.mkv', '.webm', '.m4v'}
    is_video = (Path(filename).suffix.lower() in video_extensions or
                'Screen Recording' in filename or
                'screen recording' in filename.lower())

    # Screenshot patterns (including zip files with "Screenshot" in name)
    screenshot_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp'}
    is_screenshot = (Path(filename).suffix.lower() in screenshot_extensions or
                     'Screenshot' in filename or
                     'screenshot' in filename.lower())

    # Special case: .zip files with "Screenshot" in the name should go to screenshots folder
    if filename.lower().endswith('.zip') and 'screenshot' in filename.lower():
        is_screenshot = True
        is_video = False

    # Check for appropriate subfolders
    if is_video:
        # Look for ScreenRecordings or similar folder
        for folder_name, folder_id in subfolders.items():
            if 'recording' in folder_name.lower() or 'video' in folder_name.lower():
                return folder_id

    if is_screenshot:
        # Look for Screenshots or similar folder
        for folder_name, folder_id in subfolders.items():
            if 'screenshot' in folder_name.lower() or 'screen shot' in folder_name.lower():
                return folder_id

    # Default to parent folder
    return parent_id


def format_size(size_bytes: int) -> str:
    """Format size."""
    if size_bytes < 1024*1024:
        return f"{size_bytes/1024:.1f} KB"
    elif size_bytes < 1024*1024*1024:
        return f"{size_bytes/(1024*1024):.1f} MB"
    else:
        return f"{size_bytes/(1024*1024*1024):.2f} GB"


def upload_file(service, file_path: Path, parent_folder_id: str):
    """Upload a file."""
    try:
        file_metadata = {
            'name': file_path.name,
            'parents': [parent_folder_id]
        }

        media = MediaFileUpload(str(file_path), resumable=True)

        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, size'
        ).execute()

        return file

    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None


def extract_folder_id(url_or_id: str) -> str:
    """Extract folder ID from URL."""
    if 'drive.google.com' in url_or_id:
        if '/folders/' in url_or_id:
            return url_or_id.split('/folders/')[1].split('?')[0]
    return url_or_id


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 archive.py <local_folder> <drive_folder_id>")
        print("\nExample:")
        print('  python3 archive.py "~/Desktop/Screenshots" "YOUR_DRIVE_FOLDER_ID"')
        sys.exit(1)

    local_path = Path(sys.argv[1]).expanduser().resolve()
    folder_id = extract_folder_id(sys.argv[2])

    if not local_path.exists():
        print(f"❌ Local folder not found: {local_path}")
        sys.exit(1)

    print("=" * 80)
    print("Archive to Google Drive with Auto-Organization")
    print("=" * 80)
    print()

    # Load credentials
    print("🔑 Loading credentials...")
    creds = load_credentials()
    if not creds:
        sys.exit(1)

    service = build('drive', 'v3', credentials=creds)
    print("✓ Connected\n")

    # Get local files
    print(f"📁 Scanning local: {local_path}")
    local_files = get_local_files(local_path)
    print(f"✓ Found {len(local_files)} local files\n")

    # Get cloud structure
    print(f"☁️  Scanning Google Drive (folder ID: {folder_id})")
    cloud_files, subfolders = get_cloud_structure(service, folder_id)
    print(f"✓ Found {len(cloud_files)} files in Google Drive")

    if subfolders:
        print(f"✓ Found {len(subfolders)} subfolders:")
        for name, fid in subfolders.items():
            print(f"  - {name}")
    print()

    # Find missing
    missing_names = set(local_files.keys()) - cloud_files

    if not missing_names:
        print("✅ All files already in Google Drive!")
        return

    missing_sorted = sorted(missing_names)

    print(f"📤 Files to upload: {len(missing_sorted)}")
    print()

    # Upload with smart routing
    uploaded = []
    failed = []

    for i, filename in enumerate(missing_sorted, 1):
        file_path = local_files[filename]
        size_str = format_size(file_path.stat().st_size)

        # Determine target folder
        target_folder = determine_target_folder(filename, subfolders, folder_id)
        target_name = "parent folder"
        for name, fid in subfolders.items():
            if fid == target_folder:
                target_name = name
                break

        print(f"  [{i}/{len(missing_sorted)}] Uploading {filename} ({size_str}) → {target_name}...", end='', flush=True)

        result = upload_file(service, file_path, target_folder)

        if result:
            uploaded.append(filename)
            print(" ✓")
        else:
            failed.append(filename)
            print(" ✗")

    # Summary
    print()
    print("=" * 80)
    print("Upload Complete")
    print("=" * 80)
    print(f"\n✅ Successfully uploaded: {len(uploaded)}/{len(missing_sorted)} files")

    if failed:
        print(f"\n❌ Failed: {len(failed)} files")
        for filename in failed:
            print(f"  - {filename}")

    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
