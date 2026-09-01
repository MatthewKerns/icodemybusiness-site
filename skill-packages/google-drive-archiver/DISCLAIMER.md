# Disclaimer — read before any live run

This software is provided **"as is", without warranty of any kind**, express
or implied. You run it at your own risk. The authors and iCodeMyBusiness LLC
are **not liable** for any data loss, corruption, cost, or damage arising from
its use.

**It can delete files on your computer.** With deletion enabled
(`--force` without `--no-delete`), it removes local files after it believes
they are safely in Google Drive. The verify-before-delete check is a strong
safeguard, **not a guarantee**. You are responsible for your own backups.

Before trusting it with deletion:

- Run with `--dry-run` first, every time, and read the plan.
- Then run with `--no-delete` and confirm the files really arrived in your Drive.
- Keep an independent backup of anything irreplaceable.
- Treat `credentials/credentials.json` and `tokens/*.json` as private secrets.
  Anyone with the token can access the Google Drive scopes you granted.

By using this skill you accept these terms and full responsibility for the
outcome on your machine and your Google account.
