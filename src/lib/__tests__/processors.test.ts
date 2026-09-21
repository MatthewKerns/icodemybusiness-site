import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import { PROCESSORS, FIRST_PARTY_COOKIES } from "../processors";
import PrivacyPage from "@/app/privacy/page";
import { ATTRIBUTION_COOKIE_SOURCE, ATTRIBUTION_COOKIE_VARIANT } from "../constants";

/**
 * /privacy must name everything the code actually sends data to.
 *
 * Until 2026-09-21 it named four processors while the site used ten, and
 * called analytics "aggregate counts" while session replay ran on 10% of visits.
 * On a domain under an ISP trust review (docs/trust-pages.md) a policy that
 * contradicts the page's own network traffic loses the appeal.
 */

const html = renderToStaticMarkup(PrivacyPage());

/** SDKs that send visitor data to a third party, mapped to the processor that must disclose them. */
const SDK_TO_PROCESSOR: Record<string, string> = {
  "@clerk/nextjs": "Clerk",
  convex: "Convex",
  "posthog-js": "PostHog",
  "posthog-node": "PostHog",
  "@sentry/nextjs": "Sentry",
  "@anthropic-ai/sdk": "Anthropic",
  resend: "Resend",
  stripe: "Stripe",
  "@stripe/stripe-js": "Stripe",
};

describe("/privacy discloses every processor", () => {
  it.each(PROCESSORS.map((p) => p.name))("names %s", (name) => {
    expect(html).toContain(name);
  });

  it("covers every data-sending SDK the site depends on", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../package.json"), "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const undisclosed = Object.entries(SDK_TO_PROCESSOR)
      .filter(([sdk]) => sdk in deps)
      .filter(([, name]) => !PROCESSORS.some((p) => p.name.startsWith(name)))
      .map(([sdk, name]) => `${sdk} -> ${name}`);
    expect(undisclosed, "an SDK sends data to a processor /privacy does not name").toEqual([]);
  });

  it("discloses session replay and that analytics never carry email or name", () => {
    expect(html).toMatch(/session replay/i);
    expect(html).toMatch(/never to your email address or name|never your email or name/i);
  });

  it("no longer understates analytics as aggregate counts", () => {
    expect(html).not.toMatch(/aggregate page and referral counts/i);
  });
});

describe("/privacy discloses the site's own cookies", () => {
  it("lists exactly the cookies the middleware sets", () => {
    expect(FIRST_PARTY_COOKIES.map((c) => c.name).sort()).toEqual(
      [ATTRIBUTION_COOKIE_SOURCE, ATTRIBUTION_COOKIE_VARIANT].sort()
    );
    for (const c of FIRST_PARTY_COOKIES) expect(html).toContain(c.name);
  });
});
