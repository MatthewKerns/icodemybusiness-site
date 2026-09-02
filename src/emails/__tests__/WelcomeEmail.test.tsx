import { describe, it, expect, afterEach } from "vitest";
import { render } from "@react-email/render";
import { WelcomeEmail } from "../WelcomeEmail";

const saved = process.env.NEXT_PUBLIC_APP_URL;
afterEach(() => {
  if (saved === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = saved;
});

describe("WelcomeEmail", () => {
  it("points the CTA at the configured app host's public /free-tools page", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://staging.icodemybusiness.com";
    const html = await render(WelcomeEmail({ email: "person@example.com" }));
    expect(html).toContain('href="https://staging.icodemybusiness.com/free-tools"');
    expect(html).not.toContain("/portal/");
    expect(html).not.toContain("srv1757482.hstgr.cloud");
  });

  it("falls back to staging (never the apex placeholder or retired VPS host) when unset", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const html = await render(WelcomeEmail({ email: "person@example.com" }));
    expect(html).toContain('href="https://staging.icodemybusiness.com/free-tools"');
  });

  it("tells readers to whitelist the real sending address", async () => {
    const html = await render(WelcomeEmail({ email: "person@example.com", name: "Sam" }));
    expect(html).toContain("matthew@icodemybusiness.com");
    expect(html).not.toContain("hello@icodemybusiness.com");
    expect(html).toContain("Hey Sam,");
  });
});
