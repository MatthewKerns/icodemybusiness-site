<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Deployment

- **Hosting:** Dokploy (Docker-based)
- **Staging:** Every push to `main` auto-deploys to `staging.icodemybusiness.com`
- **Build:** Uses `Dockerfile` (multi-stage: deps → build → runner with standalone output)
- **Note:** `docker-compose.yml` exists for local dev / env reference but Dokploy should be configured to use `Dockerfile` directly, not docker-compose
