import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * www must redirect to the apex, and ONLY www.
 *
 * www and the apex served identical HTML — a duplicate-site signal to the ISP
 * reputation engines blocking this domain (docs/trust-pages.md). Both hosts
 * reach this container through one Traefik router, so the redirect lives in
 * next.config.js. The dangerous failure is a host match that also catches the
 * apex: that redirects icodemybusiness.com to itself forever and takes the
 * live site down. These tests read the config's source because next.config.js
 * is CommonJS with no type declarations.
 */
const source = fs.readFileSync(path.resolve(__dirname, "../../../next.config.js"), "utf8");

describe("canonical host redirect", () => {
  it("redirects www to the apex, permanently", () => {
    expect(source).toMatch(
      /has:\s*\[\s*\{\s*type:\s*'host',\s*value:\s*'www\.icodemybusiness\.com'\s*\}\s*\]\s*,\s*destination:\s*'https:\/\/icodemybusiness\.com\/:path\*',\s*permanent:\s*true/
    );
  });

  it("never host-matches the apex itself (that would loop the live site)", () => {
    const hostValues = Array.from(source.matchAll(/type:\s*'host',\s*value:\s*'([^']+)'/g)).map((m) => m[1]);
    expect(hostValues).not.toContain("icodemybusiness.com");
    for (const v of hostValues) expect(v).not.toMatch(/[*.]?\*|\(|\|/); // no wildcard or regex host
  });

  it("does not set a site-wide canonical in the root layout (every page would claim to be the homepage)", () => {
    const layout = fs.readFileSync(path.resolve(__dirname, "../layout.tsx"), "utf8");
    expect(layout).toContain('metadataBase: new URL("https://icodemybusiness.com")');
    expect(layout).not.toMatch(/alternates:\s*\{\s*canonical/);
  });
});
