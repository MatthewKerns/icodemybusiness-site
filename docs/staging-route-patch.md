# Patch: take `staging.icodemybusiness.com` off the public internet

**Status: NOT APPLIED.** This is a hand-applied change on the VPS, written up for
Matthew. Nothing in this repo applies it.

**Until it is applied, `staging.icodemybusiness.com` is still publicly reachable
by anyone with the URL.** The middleware change that shipped with this branch only
adds `X-Robots-Tag: noindex, nofollow` and a disallow-all `robots.txt` for that
host: it asks crawlers to stay away, and stops nobody.

## Why

`staging.icodemybusiness.com` serves a byte-identical copy of the apex (83,973
bytes from both, measured 2026-09-15) from the same container. A duplicate of a
site on a second host is a cloned-site signal to a reputation scanner, and this
domain is currently blocked by Comcast Advanced Security (ticket IH270482834).
See `docs/trust-pages.md`.

## Where the route is defined

`/opt/icodemybusiness-site/deploy.sh` on the VPS (`root@2.25.207.149`,
`srv1757482.hstgr.cloud`). That tree is a deployed copy with **no git**, so this
is the one place to edit and it must be edited on the server.

One container, `icodemybusiness-site`, carries two routers:

```sh
# in run(), ~line 36-42 — the STAGING router, plus the shared service definition
docker run -d --name "$NAME" --restart unless-stopped \
    ...
    -l traefik.enable=true \
    -l "traefik.http.routers.icmb.rule=Host(\`${host}\`)" \
    -l traefik.http.routers.icmb.entrypoints=websecure \
    -l traefik.http.routers.icmb.tls.certresolver=letsencrypt \
    -l traefik.http.services.icmb.loadbalancer.server.port=3000 \

# in staging(), ~line 57-60 — the LIVE apex router, pointing at that same service
    -l "traefik.http.routers.icmb-apex.rule=Host(\`icodemybusiness.com\`) || Host(\`www.icodemybusiness.com\`)" \
    -l traefik.http.routers.icmb-apex.entrypoints=websecure \
    -l traefik.http.routers.icmb-apex.tls.certresolver=letsencrypt \
    -l traefik.http.routers.icmb-apex.service=icmb
```

**Read this before editing:** the script's own comments record that on 2026-09-05
`staging()` recreated the container with only the staging label and silently took
the live apex down until someone noticed. The apex router `icmb-apex` names
`service=icmb`, and that service is defined by the
`traefik.http.services.icmb.loadbalancer.server.port` label in `run()`. **Keep the
`services.icmb` label. Remove only the three `routers.icmb.*` labels.** Delete the
service label and the live site goes down.

## Option A — remove the staging route (recommended)

In `run()`, drop these three lines and keep everything else:

```sh
    -l "traefik.http.routers.icmb.rule=Host(\`${host}\`)" \
    -l traefik.http.routers.icmb.entrypoints=websecure \
    -l traefik.http.routers.icmb.tls.certresolver=letsencrypt \
```

Then redeploy the container the normal way. Afterwards:

- `curl -sI https://icodemybusiness.com/` → 200 (must still work)
- `curl -sI https://www.icodemybusiness.com/` → 200 (must still work)
- `curl -sI https://staging.icodemybusiness.com/` → 404 from Traefik, no route

Staging then only exists as a name in DNS and in old certificates. Deploys keep
working; you simply verify on the apex, which is what the 2026-09-05 note says
already happens in practice.

## Option B — keep staging, behind a password

If a reachable staging host is still wanted, put HTTP basic auth in front of that
router instead of removing it:

```sh
    -l "traefik.http.middlewares.icmb-staging-auth.basicauth.users=<htpasswd line>" \
    -l traefik.http.routers.icmb.middlewares=icmb-staging-auth \
```

Generate the `<htpasswd line>` yourself (`htpasswd -nB <user>`) and paste it on the
server — I don't handle passwords. A scanner then sees an auth challenge rather
than a second copy of the marketing site.

## Verify either way

```sh
ssh root@2.25.207.149 'curl -sI -o /dev/null -w "%{http_code}\n" https://icodemybusiness.com/'
ssh root@2.25.207.149 'curl -sI -o /dev/null -w "%{http_code}\n" https://staging.icodemybusiness.com/'
```

Apex must stay 200. Staging should be 404 (option A) or 401 (option B).
