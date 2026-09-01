#!/usr/bin/env python3
"""
Compare local folder with Google Drive folder to identify missing files.
"""

import sys
import json
from pathlib import Path
from typing import Dict, Set
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build


# Define paths relative to this script
SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent
TOKENS_DIR = BASE_DIR / "tokens"


def load_credentials():
    """Load and refresh OAuth credentials."""
    token_path = TOKENS_DIR / "google_drive_token.json"

    if not token_path.exists():
        print(f"❌ No token file found at: {token_path}")
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
            print("❌ Token is invalid and cannot be refreshed")
            return None

    return creds


def get_local_files(folder_path: Path, exclude: Set[str] = None) -> Set[str]:
    """Get all filenames in local folder, optionally excluding specified filenames."""
    if not folder_path.exists():
        print(f"❌ Local folder does not exist: {folder_path}")
        return set()

    exclude = exclude or set()
    files = set()
    for file_path in folder_path.iterdir():
        if file_path.is_file() and file_path.name not in exclude:
            files.add(file_path.name)

    return files


def get_google_drive_files_recursive(service, folder_id: str) -> Set[str]:
    """Get all filenames in Google Drive folder and all subfolders."""
    files = set()

    def scan_folder(parent_id: str):
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
                        scan_folder(item['id'])
                    else:
                        files.add(item['name'])

                page_token = results.get('nextPageToken')
                if not page_token:
                    break

        except Exception as e:
            print(f"⚠️  Error scanning folder: {e}")

    scan_folder(folder_id)
    return files


def extract_folder_id(url_or_id: str) -> str:
    """Extract folder ID from Google Drive URL or return as-is if already an ID."""
    if 'drive.google.com' in url_or_id:
        if '/folders/' in url_or_id:
            return url_or_id.split('/folders/')[1].split('?')[0]
    return url_or_id


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Compare local folder with Google Drive folder.")
    parser.add_argument("local_folder", help="Path to local folder")
    parser.add_argument("drive_folder", help="Google Drive folder URL or ID")
    parser.add_argument("--exclude", action="append", default=[], metavar="FILENAME",
                        help="Filename to exclude (can be specified multiple times)")
    args = parser.parse_args()

    local_path = Path(args.local_folder).expanduser().resolve()
    drive_url = args.drive_folder
    exclude_set = set(args.exclude)

    print("=" * 80)
    print("File Comparison: Local vs Google Drive")
    print("=" * 80)
    print()

    # Load credentials
    print("🔑 Loading credentials...")
    creds = load_credentials()
    if not creds:
        sys.exit(1)

    service = build('drive', 'v3', credentials=creds)
    print("✓ Connected to Google Drive\n")

    # Get local files
    print(f"📁 Scanning local folder: {local_path}")
    local_files = get_local_files(local_path, exclude=exclude_set)
    print(f"✓ Found {len(local_files)} local files\n")

    # Get Google Drive files
    folder_id = extract_folder_id(drive_url)
    print(f"☁️  Scanning Google Drive folder (including subfolders): {folder_id}")
    cloud_files = get_google_drive_files_recursive(service, folder_id)
    print(f"✓ Found {len(cloud_files)} files in Google Drive\n")

    # Compare
    missing_in_cloud = local_files - cloud_files

    print("=" * 80)
    print("Results")
    print("=" * 80)
    print()

    if not missing_in_cloud:
        print("✅ All local files are present in Google Drive!")
    else:
        print(f"📤 Files in local folder NOT in Google Drive: {len(missing_in_cloud)}")
        print()

        # Sort by name
        sorted_missing = sorted(missing_in_cloud)

        for i, filename in enumerate(sorted_missing, 1):
            print(f"  {i}. {filename}")

    print()
    print("=" * 80)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
