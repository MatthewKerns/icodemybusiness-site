# Disclaimer

**Read-only on your data.** The quarterly planner only *reads* from your Google
Drive, Apple Notes, and Claude history to build context. It does **not** create,
edit, move, or delete anything in those sources. The only file it writes is your
plan (`quarterly-plan-YYYY-Qn.md`) and a local `./.quarterly-planner/context/`
working folder, in the directory you run it from.

**Your data stays yours.**
- Google Drive uses a **`drive.readonly`** OAuth scope; your `credentials.json`
  and token live only on your machine and are git-ignored. Revoke anytime at
  <https://myaccount.google.com/permissions>.
- Apple Notes export uses macOS Automation permission, which you grant (and can
  revoke) in System Settings → Privacy & Security → Automation.
- Claude history is read from your local `~/.claude` only.
- The captured context (`./.quarterly-planner/context/`) can contain sensitive
  business detail — it is git-ignored by default; delete it when you're done if
  you like.

**No warranty.** Provided "as is", without warranty of any kind.
iCodeMyBusiness is not liable for any loss arising from its use. EOS®,
"Rocks", "Level 10 Meeting", and "V/TO" are concepts from the Entrepreneurial
Operating System; this is an independent tool and is not affiliated with or
endorsed by EOS Worldwide.
