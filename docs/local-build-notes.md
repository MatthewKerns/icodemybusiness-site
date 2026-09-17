# Building this site from a fresh worktree

Notes from 2026-09-17, after three builds failed for reasons that had nothing to
do with the change being tested.

## A fresh worktree has no local config, so the build fails

The main checkout builds because it carries an untracked local config file that
is never committed and is copied along whenever the directory is synced
somewhere. A worktree created with `git worktree add` gets **only tracked
files**, so it has no such config and `next build` fails during "Collecting page
data", in this order:

1. `Error: @clerk/nextjs: Missing publishableKey` — thrown while prerendering the
   first page that renders a Clerk component.
2. Once a publishable key exists: `Error: NEXT_PUBLIC_CONVEX_URL is not set` while
   prerendering `/admin/*`.

Neither failure means the branch is broken.

## Dummy values are enough for a build check

To prove a branch compiles and renders, pass placeholders. No real secret is
needed, and none should be copied to a build host:

```sh
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk \
CLERK_SECRET_KEY=placeholder-any-non-empty-value \
NEXT_PUBLIC_CONVEX_URL=https://example-dummy-123.convex.cloud \
SKIP_ENV_VALIDATION=1 \
npx next build
```

Only the **publishable** key has to be well-formed: Clerk parses it, so a random
string fails there. Any non-empty value works for the secret key and for the
Convex URL, and this doc deliberately avoids writing either in its real prefix
form, so grepping the repo never trips a secret scanner. Pages that talk to Clerk
or Convex at
runtime obviously won't function with placeholders — this is for compile,
prerender and static-output checks only. `.env.example` lists the full set if a
page needs more.

## `next build | tail` hides the build's exit code

```sh
npx next build 2>&1 | tail -30     # $? is tail's status — always 0
```

A failing build read as a passing one this way, and the page list in the tail
output looked like a normal route table. Redirect, then check the build itself:

```sh
npx next build > /tmp/build.log 2>&1; echo "exit=$?"; tail -30 /tmp/build.log
```

## Where to run it

The laptop is a 16 GB machine that thrashes under a Next build. Offload:

```sh
~/bin/offload-run --dir <worktree> --slug <name> --lane node-full -- '<command>'
```

Pass the placeholders above with `--env`, one per variable.
