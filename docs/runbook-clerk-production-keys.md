# Runbook — moving production onto real Clerk keys (R-003)

**Status:** open. Production is live on Clerk **development** keys, pointed at another
product's Clerk instance. Written 2026-09-05 by the business-intake session; executed by
Matthew (env values) + the deploy session (build and deploy). Nobody else.

---

## What is wrong

Verified against the served page on `icodemybusiness.com`, not inferred:

| Check | Result |
|---|---|
| Clerk key type baked into the page | **`pk_test`** — 0 occurrences of `pk_live` |
| Clerk frontend host | **`stunning-skunk-51.clerk.accounts.dev`** |
| Sign-in card title | **"Sign in to IDEA Brand Coach"** |
| Badge shown to visitors | Clerk's orange **"Development mode"** |

Three separate problems in one:

1. **Dev keys on a public site.** Clerk development instances show the badge to every visitor
   and carry hard usage limits.
2. **The wrong Clerk application entirely.** Auth on icodemybusiness.com is served by a
   different product's instance, so the sign-in and sign-up screens carry another product's
   name. The assessment's account gate — "Create a free account to keep this report" — leads
   straight to it.
3. **Nobody can reach `/admin`.** `matthew@icodemybusiness.com` gets "Couldn't find your
   account", because the lookup happens in IDEA Brand Coach's user directory. The route itself
   is fine (`src/app/admin/funnel/page.tsx` exists); the identity is the problem.

This was tolerable while `icodemybusiness.com` was a GitHub Pages placeholder. It stopped being
tolerable when the apex was cut over (R-002 closed, 2026-09-05).

---

## Decide this BEFORE touching anything

**Switching Clerk instances orphans every stored identity.** `clerkUserId` holds a subject
issued by the current instance, and it is stored on five tables (`convex/schema.ts`):

`users` · `leads` · `agentSessions` · `applications` · `assessments`

A new instance issues new subjects. Every existing row keeps pointing at an identity that no
longer resolves. Concretely, after the swap:

- The one real `users` row (`user_3IrKKnI8Q7AFlJDP4mOS4DXvlEf`, created 2026-09-04) stops
  matching anyone. **R-010's verification has to be redone.**
- `agentSessions.clerkUserId` set by `bindToAccount` no longer matches, so those conversations
  become unreachable to their owner and — because of the ownership guard in
  `assertMayUseSession` — unreachable to everyone. They are not deleted, just orphaned.
- `assessments.clerkUserId` set by `claim`/`submit` drops out of `portalListForUser`, so a
  visitor's saved report disappears from their portal.

**Matthew's call, one of:**

- **(a) Write them off.** Defensible today: there is one real user and a handful of sessions.
  Cheapest, and the data stays in the tables for reference.
- **(b) Re-map by email.** `leads`, `applications` and `assessments` carry `email`; users can be
  re-bound after they sign in again to the new instance. Needs a one-off migration function and
  is only worth it if real customer reports exist by then.

Do not start the swap until this is answered — doing it after means guessing which orphans were
real.

---

## The change-over, in order

### 1. Matthew: create/confirm the production Clerk instance
It must be **iCodeMyBusiness's own** application, not another product's, and a **production**
instance (keys begin `pk_live_` / `sk_live_`). Configure the JWT template named **`convex`** —
`convex/auth.config.js` pins `applicationID: "convex"`, so a template with any other name makes
every `ctx.auth.getUserIdentity()` return null.

### 2. Matthew: set the values. Never commit them, never paste them into a session.

| Where | Name | Notes |
|---|---|---|
| VPS `/opt/icodemybusiness-site/.env.build` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **baked at build time** |
| VPS `/opt/icodemybusiness-site/.env.build` | `CLERK_SECRET_KEY` | runtime; read by `@clerk/nextjs` |
| Convex (`neat-hamster-414`) | `CLERK_JWT_ISSUER_DOMAIN` | the new instance's issuer |

All three already exist under those names — this is a value change, not a new variable.

### 3. Deploy session: Convex first
Set `CLERK_JWT_ISSUER_DOMAIN`, then push Convex. If the app ships first it will hand Convex
tokens from an issuer Convex does not trust, and `getUserIdentity()` returns null — which fails
**silently**, not loudly: the ownership guards in `convex/agentSessions.ts` treat a null identity
as "not the owner", `discoveryAssessments.claim` and `submit` stop binding, and every
`requireRole` admin query refuses. Verify names only with
`scripts/convex-env-names.sh --prod`; never `npx convex env list`, which prints values (the
`convex-secret-guard` hook blocks it, and it blocks it because a live `RESEND_API_KEY` reached a
transcript that way on 2026-09-04).

### 4. Deploy session: rebuild — a restart is not enough
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is a build-time constant: `Dockerfile` declares it at
`ARG` :16 and `ENV` :30, and Next.js inlines it into the client bundle. The VPS `deploy.sh`
needs a matching `--build-arg` line. Restarting the container keeps the old key baked in and
looks like the change did nothing.

### 5. The sign-in you do next decides whether you can reach `/admin`

This is the step most likely to look like the whole change failed, because the symptom is
identical to the problem being fixed: "you are not allowed in".

The owner gate resolves through **three** environment variables, any one of which is sufficient
(`src/lib/owner.ts:21-40`):

| Variable | Matches on |
|---|---|
| `OWNER_EMAILS` | exact address |
| `OWNER_EMAIL_DOMAINS` | the domain of the identity's email |
| `OWNER_CLERK_USER_IDS` | exact Clerk subject |

Two things the instance swap does to that:

- **Any subject in `OWNER_CLERK_USER_IDS` goes stale.** It was issued by the old instance and
  does not exist in the new one. Worse, `requireRole` only returns the helpful "no owner
  allowlist is configured" message when **all three** are empty (`convex/lib/auth.ts:105-113`);
  a stale-but-populated list produces a bare `Forbidden`, which reads as a permissions bug
  rather than a config one. Clear it in the same push that sets the issuer domain.
- **`OWNER_EMAIL_DOMAINS` only helps if the account you create matches it.** As of 2026-09-05
  the VPS `.env.build` carries no `OWNER_*` key at all, so the Convex-side domain rule is the
  only thing standing between Matthew and `/admin`.

**So: create the account on the new instance as `matthew@icodemybusiness.com`.** The real
account on the old instance was a personal gmail address; signing up with a personal address
again against `OWNER_EMAIL_DOMAINS=icodemybusiness.com` locks you out of `/admin/*` on the live
site, and middleware redirects to `/forbidden`.

This also explains why the `convex` JWT template must carry the **`email`** claim, not just
`sub`: `isOwnerEmail` reads the identity's email, so without it the domain rule cannot match
even when the variable is set correctly.

Once signed in, add the new subject to `OWNER_CLERK_USER_IDS` so admin access no longer depends
on the email claim alone.

### 6. Remember there is only one container
The VPS runs a single `icodemybusiness-site`; the apex and `staging.` both route to it through
Traefik. **There is no separate staging to rehearse on.** This change goes straight to
production, which is the strongest argument for doing it at a quiet hour and having the rollback
ready first.

---

## Verification

Ordered so the cheapest disproof comes first.

1. **Key type flipped** — the served page contains `pk_live` and no `pk_test`:
   `curl -s https://icodemybusiness.com | grep -oE 'pk_test|pk_live' | sort | uniq -c`
2. **Right application** — the sign-in card says iCodeMyBusiness, not another product, and the
   "Development mode" badge is gone.
3. **Convex trusts the new issuer** — sign in, then confirm a `users` row appears for the new
   subject: `npx convex data users --limit 5`. A null identity produces no row and no error,
   so absence here is the signal.
4. **Admin reachable** — `/admin/funnel` loads for an owner account instead of bouncing. A bare
   `Forbidden` here means the allowlist is populated but stale; `/forbidden` means the identity
   resolved and simply is not an owner (wrong email domain — see step 5).
5. **Ownership guards still work** — start an assessment signed out, sign in mid-conversation,
   confirm the session binds (`discovery_session_bound` in PostHog 206048) and that
   `/portal/assessments` lists it. This exercises `assertMayUseSession` end to end and is the
   check most likely to catch a half-applied change.
6. **Anonymous path unbroken** — a signed-out assessment still completes. Auth changes have a
   habit of breaking the path with no auth in it.

## Rollback

Put the previous values back in `.env.build` and Convex, rebuild, redeploy. The old instance is
not deleted by any step here, so rollback is a value change plus a rebuild — same cost as the
change itself. Rows written under new-instance subjects during the window will then be the
orphans instead; note the window's start and end so they can be found.

---

Related: `docs/DEPLOY.md` (deploy contract — still describes prod as a pending cutover and needs
updating), `docs/ROADMAP.md` R-003 and R-010, `convex/auth.config.js`.
