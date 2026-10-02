import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BUSINESS, LEGAL_ENTITY_LINE, organizationJsonLd } from "../business";
import { Footer } from "@/components/landing/Footer";
import AboutPage from "@/app/about/page";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";

/**
 * One business identity, on every surface a reviewer reads.
 *
 * Until 2026-09-22 the footer carried only a trade name and an email, while the
 * legal pages named "iCodeMyBusiness (Matthew Kerns)" with no entity, state or
 * governing law. On a domain under an ISP trust review (docs/trust-pages.md),
 * "is there a real business behind this?" is the question; these tests pin the
 * answer to src/lib/business.ts so the surfaces cannot drift apart again.
 */
const surfaces = {
  footer: renderToStaticMarkup(Footer()),
  about: renderToStaticMarkup(AboutPage()),
  privacy: renderToStaticMarkup(PrivacyPage()),
  terms: renderToStaticMarkup(TermsPage()),
};

describe("business identity", () => {
  it.each(Object.entries(surfaces))("%s names the legal entity", (_name, html) => {
    expect(html).toContain(BUSINESS.legalName);
    expect(html).toContain(BUSINESS.email);
  });

  it("footer and legal pages state the entity type and state", () => {
    for (const html of [surfaces.footer, surfaces.about, surfaces.terms, surfaces.privacy]) {
      expect(html).toContain(LEGAL_ENTITY_LINE);
    }
  });

  it("terms carry a governing-law clause for the state of formation", () => {
    expect(surfaces.terms).toMatch(/Governing law/);
    expect(surfaces.terms).toContain(`laws of the State of ${BUSINESS.jurisdiction}`);
  });

  it("no surface still describes the business as an unincorporated person", () => {
    for (const html of Object.values(surfaces)) {
      expect(html).not.toContain("iCodeMyBusiness (Matthew Kerns)");
    }
  });

  it("address and phone render everywhere as soon as BUSINESS carries them", () => {
    // Today they are unset; the surfaces must not invent placeholders.
    if (!BUSINESS.telephone) for (const html of Object.values(surfaces)) expect(html).not.toMatch(/tel:/);
    if (!BUSINESS.postalAddress) for (const html of Object.values(surfaces)) expect(html).not.toMatch(/PostalAddress|Suite|PMB/);
  });
});

describe("Organization JSON-LD", () => {
  const org = organizationJsonLd();

  it("agrees with the footer", () => {
    expect(org.legalName).toBe(BUSINESS.legalName);
    expect(org.email).toBe(BUSINESS.email);
    expect(org.url).toBe(BUSINESS.url);
    for (const href of org.sameAs as string[]) expect(surfaces.footer).toContain(href);
  });

  it("omits telephone and address rather than emitting undefined", () => {
    if (!BUSINESS.telephone) expect(org).not.toHaveProperty("telephone");
    if (!BUSINESS.postalAddress) expect(org).not.toHaveProperty("address");
    expect(JSON.stringify(org)).not.toContain("undefined");
  });
});
