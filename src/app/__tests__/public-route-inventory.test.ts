import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import sitemap from "../sitemap";
import robots from "../robots";

/**
 * Every page this app can serve must be accounted for: advertised in the
 * sitemap, fenced off in robots.txt, or listed below with a written reason.
 *
 * Why this exists: icodemybusiness.com is blocked by Comcast and Cox Advanced
 * Security (ticket IH270482834; see docs/trust-pages.md). A reputation scanner
 * scores what a domain serves, not what it links to, so an unaccounted-for page
 * is exactly how a dev route (/test-error-boundaries, whose bundle shipped a
 * mock email form) and a directory of script archives (/downloads/*.zip) ended
 * up public without anyone deciding they should be.
 */

const APP_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.resolve(__dirname, "../../../public");

/** Routes that are deliberately public but unlisted, and why. */
const UNLISTED: Record<string, string> = {
  "/vsl": "noindex duplicate of / used as an ad landing page",
  "/testimonials": "draft; 404s unless NEXT_PUBLIC_ENABLE_TESTIMONIALS_DRAFT, and noindex",
  "/subscribe": "server-redirects to /consulting",
  "/subscribe/success": "post-checkout confirmation, only reached from Stripe",
  "/connect/mango": "sub-page of /connect, linked from it",
  "/connect/builder-tools": "sub-page of /connect, linked from it",
};

/** Walk src/app and turn every page.tsx into the route it serves. */
function pageRoutes(dir: string, segments: string[] = []): string[] {
  const routes: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "api") continue;
      const isGroup = entry.name.startsWith("(") && entry.name.endsWith(")");
      // A catch-all like [[...sign-in]] serves its parent path.
      const isCatchAll = entry.name.startsWith("[[...") || entry.name.startsWith("[...");
      const next = isGroup || isCatchAll ? segments : [...segments, entry.name];
      routes.push(...pageRoutes(path.join(dir, entry.name), next));
    } else if (entry.name === "page.tsx") {
      routes.push("/" + segments.join("/"));
    }
  }
  return routes;
}

const listed = new Set(
  sitemap().map((e) => new URL(e.url).pathname.replace(/\/$/, "") || "/")
);

const rules = robots().rules;
const disallowed = (Array.isArray(rules) ? rules : [rules]).flatMap((r) =>
  r.disallow === undefined ? [] : Array.isArray(r.disallow) ? r.disallow : [r.disallow]
);

function isDisallowed(route: string): boolean {
  return disallowed.some((prefix) => route === prefix.replace(/\/$/, "") || route.startsWith(prefix));
}

const routes = pageRoutes(APP_DIR);

describe("public route inventory", () => {
  it("finds the app's pages (guards against the walk silently matching nothing)", () => {
    expect(routes).toContain("/");
    expect(routes).toContain("/privacy");
    expect(routes).toContain("/sign-in");
  });

  it.each(routes)("%s is in the sitemap, disallowed in robots, or allow-listed with a reason", (route) => {
    const accounted = listed.has(route) || isDisallowed(route) || route in UNLISTED;
    expect(accounted, `${route} is served but not accounted for`).toBe(true);
  });

  it("every sitemap entry is a real page (a sitemap URL that 404s is what a trust review notices)", () => {
    for (const url of Array.from(listed)) expect(routes, `${url} is in the sitemap but has no page`).toContain(url);
  });

  it("every allow-list entry is a real page, so the list can't rot", () => {
    for (const route of Object.keys(UNLISTED)) expect(routes).toContain(route);
  });

  it("ships no test or dev route to production", () => {
    const offenders = routes.filter((r) =>
      r.split("/").some((seg) => /^test-|-test$|^test$|^dev$|^debug$/.test(seg))
    );
    expect(offenders).toEqual([]);
  });
});

describe("public/ serves no executable archives", () => {
  it("has no archive or script files anywhere under public/", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(zip|tar|tgz|gz|7z|rar|dmg|pkg|exe|msi|sh|py|command|bat|ps1)$/i.test(entry.name)) {
          offenders.push(path.relative(PUBLIC_DIR, full));
        }
      }
    };
    walk(PUBLIC_DIR);
    // Tools are published on GitHub and linked from /free-tools; this domain must
    // not distribute them. See skill-packages/build.sh.
    expect(offenders).toEqual([]);
  });
});
