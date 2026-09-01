#!/usr/bin/env python3
"""
Google Drive OAuth authentication script.
Creates fresh OAuth tokens for accessing Google Drive.
"""

import os
import json
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials

# If modifying these scopes, delete the token file.
SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/documents.readonly',  # Google Docs read access
]

# Define paths relative to this script
SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent
CREDENTIALS_DIR = BASE_DIR / "credentials"
TOKENS_DIR = BASE_DIR / "tokens"

def authenticate():
    """Authenticate and save credentials."""

    # Check for credentials file
    credentials_file = CREDENTIALS_DIR / "credentials.json"

    if not credentials_file.exists():
        print("\n❌ No OAuth client credentials found!")
        print(f"\nExpected location: {credentials_file}")
        print("\nTo set up Google Drive API:")
        print("1. Go to https://console.cloud.google.com/")
        print("2. Create/select a project")
        print("3. Enable Google Drive API")
        print("4. Create OAuth 2.0 credentials (Desktop app)")
        print("5. Download the JSON file")
        print(f"6. Save it as: {credentials_file}")
        return None

    try:
        # Run OAuth flow
        flow = InstalledAppFlow.from_client_secrets_file(
            str(credentials_file),
            SCOPES
        )

        # This will open a browser window for authentication
        print("\n🔐 Opening browser for Google authentication...")
        print("Please authorize the application in your browser.")

        creds = flow.run_local_server(port=0)

        # Save the credentials
        TOKENS_DIR.mkdir(parents=True, exist_ok=True)
        token_path = TOKENS_DIR / "google_drive_token.json"

        token_data = {
            'token': creds.token,
            'refresh_token': creds.refresh_token,
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': creds.scopes
        }

        with open(token_path, 'w') as token:
            json.dump(token_data, token, indent=2)

        print(f"\n✅ Authentication successful!")
        print(f"📁 Token saved to: {token_path}")
        print("\nYou can now use this token to access Google Drive.")

        return creds

    except Exception as e:
        print(f"\n❌ Authentication failed: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("=" * 60)
    print("Google Drive OAuth Authentication")
    print("=" * 60)
    print(f"\nCredentials directory: {CREDENTIALS_DIR}")
    print(f"Tokens directory: {TOKENS_DIR}\n")
    authenticate()
