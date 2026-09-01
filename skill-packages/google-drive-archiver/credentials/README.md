# Put your own Google OAuth client here

This folder ships **empty on purpose**. No credentials or tokens are
included in this package — you bring your own. Nothing leaves your machine
except the files you choose to upload to *your* Google Drive.

## Get a `credentials.json` (one-time, ~3 minutes)

1. Go to <https://console.cloud.google.com/> and create (or select) a project.
2. **APIs & Services → Library →** enable the **Google Drive API**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID.**
   - Application type: **Desktop app**.
4. Download the JSON and save it as `credentials/credentials.json` (this exact path).

The file looks like this (these are *not* secrets in the dangerous sense —
they identify your OAuth app — but still keep them private):

```json
{
  "installed": {
    "client_id": "....apps.googleusercontent.com",
    "project_id": "your-project",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "....",
    "redirect_uris": ["http://localhost"]
  }
}
```

## Then authenticate (browser flow)

```bash
python3 scripts/authenticate.py
```

This opens a browser, asks you to authorize, and writes
`tokens/google_drive_token.json` locally. The token is git-ignored and must
never be shared — anyone holding it can read/write the Drive scopes you granted.

## Scope note

`authenticate.py` requests `drive.file` (among read scopes), so the app can
**only see and manage files it created itself** — it cannot read the rest of
your Drive. Archived folders are created by the app under "Downloads Archive"
and "ScreenShot Archive".
