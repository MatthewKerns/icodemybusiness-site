import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PROCESSORS,
  FIRST_PARTY_COOKIES,
  GOOGLE_ADS_PROCESSOR,
  GOOGLE_ADS_COOKIE_SENTENCE,
  activeProcessors,
  isGoogleAdsTagId,
} from "../processors";
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

describe("/privacy matches the Meta Pixel the site loads", () => {
  // The pixel is an advertising tool. Until 2026-10-04 the policy said in bold
  // that data was never used for advertising; with the pixel live that sentence
  // would be the policy-vs-network-traffic mismatch described above.
  it("names Meta as a processor and its _fbp cookie", () => {
    expect(PROCESSORS.some((p) => p.name.startsWith("Meta"))).toBe(true);
    expect(html).toContain("Meta Pixel");
    expect(html).toContain("_fbp");
  });

  it("tells visitors how to opt out of interest-based ads (Meta Business Tools Terms)", () => {
    expect(html).toMatch(/opt out of interest-based ads/i);
    expect(html).toContain("https://www.facebook.com/adpreferences");
    expect(html).toContain("https://optout.aboutads.info");
  });

  it("no longer claims data is never used for advertising", () => {
    expect(html).not.toMatch(/never use it for advertising/i);
    expect(html).not.toMatch(/none are used for advertising/i);
  });
});

describe("Google Ads tag id", () => {
  it.each(["AW-18511931386", "AW-1"])("accepts %s", (id) => {
    expect(isGoogleAdsTagId(id)).toBe(true);
  });

  it.each([
    undefined,
    "",
    "G-123",
    "AW-",
    "AW-abc",
    "aw-123",
    " AW-123",
    "AW-123 ",
    "AW-123\n",
    "AW-123-456",
    "AW-1';alert(1)//",
  ])("rejects %j", (id) => {
    expect(isGoogleAdsTagId(id)).toBe(false);
  });
});

describe("activeProcessors", () => {
  it("is exactly the always-on list while the Google Ads tag is off", () => {
    for (const off of [undefined, "", "G-123", "AW-"]) {
      expect(activeProcessors(off)).toEqual(PROCESSORS);
    }
    expect(PROCESSORS.some((p) => p.name.startsWith("Google"))).toBe(false);
  });

  it("adds Google Ads, and only it, when the tag is on", () => {
    expect(activeProcessors("AW-18511931386")).toEqual([...PROCESSORS, GOOGLE_ADS_PROCESSOR]);
  });
});

describe("/privacy matches the Google Ads tag in both states", () => {
  const ENV = "NEXT_PUBLIC_GOOGLE_ADS_TAG_ID";
  const TAG = "AW-18511931386";
  // renderToStaticMarkup escapes apostrophes; compare as the visitor reads them.
  const privacyWith = (tagId: string | undefined) => {
    if (tagId === undefined) delete process.env[ENV];
    else vi.stubEnv(ENV, tagId);
    return renderToStaticMarkup(PrivacyPage()).replace(/&#x27;/g, "'");
  };
  const entry = (p: { name: string; purpose: string; data: string }) =>
    `<strong>${p.name}</strong> — ${p.purpose}. Receives ${p.data}.`;
  const entryCount = (page: string) => page.split("Receives ").length - 1;
  const cookiesEnd = "past visitors.";

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env[ENV];
  });

  it("off: renders exactly the always-on processors and never mentions Google", () => {
    const page = privacyWith(undefined);
    for (const p of activeProcessors(undefined)) expect(page).toContain(entry(p));
    expect(entryCount(page)).toBe(PROCESSORS.length);
    expect(page).not.toMatch(/google/i);
    expect(page).not.toContain(GOOGLE_ADS_COOKIE_SENTENCE);
    expect(page).toContain(`${cookiesEnd}</p>`);
  });

  it("off: an empty or malformed id renders the same page as an unset one", () => {
    const unset = privacyWith(undefined);
    for (const bad of ["", "G-123", "AW-"]) expect(privacyWith(bad)).toBe(unset);
  });

  it("on: renders every active processor, including Google Ads, and nothing extra", () => {
    const page = privacyWith(TAG);
    for (const p of activeProcessors(TAG)) expect(page).toContain(entry(p));
    expect(page).toContain(entry(GOOGLE_ADS_PROCESSOR));
    expect(entryCount(page)).toBe(PROCESSORS.length + 1);
  });

  it("on: the Cookies paragraph says Google's tag sets its own cookies, and still never claims none are for advertising", () => {
    const page = privacyWith(TAG);
    expect(GOOGLE_ADS_COOKIE_SENTENCE).toBe(
      "Google's advertising tag sets its own cookies to measure our ads."
    );
    expect(page).toContain(`${cookiesEnd} ${GOOGLE_ADS_COOKIE_SENTENCE}</p>`);
    expect(page).not.toMatch(/none are used for advertising/i);
  });

  it("does not put the tag id on the page", () => {
    expect(privacyWith(TAG)).not.toContain(TAG);
  });
});
