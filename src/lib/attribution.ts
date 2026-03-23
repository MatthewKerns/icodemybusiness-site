/**
 * Server-side attribution helpers.
 * Read attribution source/variant from cookie stores (Next.js RequestCookies or similar).
 */

interface CookieStore {
  get(name: string): { value: string } | undefined;
}

export interface Attribution {
  source: string | null;
  variant: string | null;
}

export function getAttribution(cookies: CookieStore): Attribution {
  const source = cookies.get("icmb_source")?.value ?? null;
  const variant = cookies.get("icmb_variant")?.value ?? null;
  return { source, variant };
}
