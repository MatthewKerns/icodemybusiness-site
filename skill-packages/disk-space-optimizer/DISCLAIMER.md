# Disclaimer — read before any live run

This software is provided **"as is", without warranty of any kind**, express or
implied. You run it entirely at your own risk. The authors and iCodeMyBusiness
LLC are **not liable** for any data loss, corruption, downtime, cost, or damage
arising from its use.

**This toolkit can permanently delete files and Docker resources on your
machine.** Specifically, when run live (not `--dry-run`) and approved:

- It deletes local screenshots/recordings and Downloads **after** it believes
  they are safely in your Google Drive. Verify-before-delete is a strong
  safeguard, **not a guarantee**.
- It can delete stale `node_modules`, system caches, and (via the bundled
  `docker-resource-manager`) Docker images/containers/build cache.
- Docker has no trash. Removed images must be rebuilt or re-pulled.

Your responsibilities:

- **Always run `--dry-run` first** and read the plan.
- Configure `PROTECTED_GLOBS` with your active projects so a sweep can't touch
  their dependencies.
- Keep independent backups of anything irreplaceable.
- Confirm your Drive uploads actually arrived (run with `--no-delete` first)
  before ever trusting deletion.
- Review each AskUserQuestion proposal carefully — approval is *your* decision,
  and it is final.

The design intent is "measure, propose, and only act on explicit approval." It
will not delete without asking. But you remain the last line of defense. By
using this skill you accept these terms and full responsibility for the outcome.
