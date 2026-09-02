# scripts/ — area rules

- `deploy-staging.sh` is the **only** way code reaches staging, and only the deploy session runs it.
  It deploys one commit that is already on `origin/main`, from a clean `git archive`, after running the
  gates (`lint`, `tsc`, `test`) on the VPS, pushing Convex first when `convex/` changed. Evidence goes to
  `docs/release/DEPLOY_QUEUE.md` and `DEPLOY_LOG` on the VPS.
- There is no flag to skip the gates. If a gate cannot run, the deploy does not happen.
- `git-hooks/pre-push` is installed by `npm run prepare` (`core.hooksPath`); it runs `tsc` + the test
  suite before any push to `main`. Do not bypass it with `--no-verify` (blocked by the test-guard hook).
- The VPS-side `deploy.sh` (modes `build` | `staging` | `cutover`) is not in git; changes to it are
  made over ssh and recorded in `docs/DEPLOY.md`.
