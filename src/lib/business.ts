/**
 * The business identity, in one place.
 *
 * The footer, /about, /privacy, /terms and the Organization JSON-LD in the root
 * layout all render from this object, so they cannot disagree. A reputation
 * reviewer checking "is there a real business behind this domain" reads exactly
 * these fields — and this domain is under an ISP trust review (Comcast ticket
 * IH270482834; docs/trust-pages.md), where a footer that says one thing and a
 * privacy policy that says another is a finding.
 *
 * `postalAddress` and `telephone` are deliberately optional: the LLC's virtual
 * address (iPostal) and business line are being set up. Add them here and every
 * surface picks them up; src/lib/__tests__/business.test.ts pins that.
 */
export const BUSINESS = {
  /** Trade name, as shown in the brand mark. */
  name: "iCodeMyBusiness",
  /** Registered entity, exactly as formed. */
  legalName: "iCodeMyBusiness LLC",
  entityDescription: "a California limited liability company",
  /** Governing law and venue for /terms. */
  jurisdiction: "California",
  url: "https://icodemybusiness.com",
  email: "matthew@icodemybusiness.com",
  founder: "Matthew Kerns",
  telephone: undefined as string | undefined,
  postalAddress: undefined as
    | { streetAddress: string; addressLocality: string; addressRegion: string; postalCode: string; addressCountry: "US" }
    | undefined,
  /** Public profiles; also emitted as JSON-LD `sameAs`. */
  sameAs: {
    youtube: "https://youtube.com/@icodemybusiness",
    x: "https://x.com/icodemybusiness",
    tiktok: "https://tiktok.com/@icodemybusiness",
  },
} as const;

/** "iCodeMyBusiness LLC, a California limited liability company" */
export const LEGAL_ENTITY_LINE = `${BUSINESS.legalName}, ${BUSINESS.entityDescription}`;

/** schema.org Organization for the root layout. Only fields we actually have. */
export function organizationJsonLd() {
  const org: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    url: BUSINESS.url,
    email: BUSINESS.email,
    founder: { "@type": "Person", name: BUSINESS.founder },
    sameAs: Object.values(BUSINESS.sameAs),
  };
  if (BUSINESS.telephone) org.telephone = BUSINESS.telephone;
  if (BUSINESS.postalAddress) org.address = { "@type": "PostalAddress", ...BUSINESS.postalAddress };
  return org;
}
