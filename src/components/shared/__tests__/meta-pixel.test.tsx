/**
 * The Meta Pixel must load once with our id, send a PageView for every route
 * (the landing one from the base code, later ones from the effect), and send
 * the two Tier 1 conversions as Meta standard events with no parameters.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("next/script", () => ({
  default: ({ id, children }: { id: string; children: string }) => (
    <script data-testid={id}>{children}</script>
  ),
}));
vi.mock("posthog-js", () => ({ default: { __loaded: false, capture: vi.fn() } }));

import { MetaPixel } from "../MetaPixel";
import { META_PIXEL_ID, trackMeta } from "@/lib/meta-pixel";
import { analytics } from "@/lib/analytics";

const fbq = vi.fn();

beforeEach(() => {
  window.fbq = fbq;
});

afterEach(() => {
  cleanup();
  fbq.mockReset();
  delete window.fbq;
  pathname = "/";
});

describe("trackMeta", () => {
  it("is a no-op when the pixel has not loaded", () => {
    delete window.fbq;
    expect(() => trackMeta("Lead")).not.toThrow();
  });

  it("sends the standard event with no parameters", () => {
    trackMeta("Lead");
    expect(fbq).toHaveBeenCalledWith("track", "Lead");
  });
});

describe("MetaPixel", () => {
  it("loads the base code with our pixel id, automatic events off", () => {
    const { getByTestId } = render(<MetaPixel />);
    const code = getByTestId("meta-pixel").textContent ?? "";
    expect(code).toContain(`fbq('init','${META_PIXEL_ID}')`);
    expect(code).toContain(`fbq('set','autoConfig',false,'${META_PIXEL_ID}')`);
    expect(code).toContain("fbq('track','PageView')");
  });

  it("leaves the landing PageView to the base code, then sends one per route change", () => {
    const { rerender } = render(<MetaPixel />);
    expect(fbq).not.toHaveBeenCalled();
    pathname = "/consulting";
    rerender(<MetaPixel />);
    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith("track", "PageView");
  });
});

describe("conversions reach Meta even when PostHog is not loaded", () => {
  it("lead captured sends Lead", () => {
    analytics.leadCaptured("email-capture");
    expect(fbq).toHaveBeenCalledWith("track", "Lead");
  });

  it("consultation booked sends Schedule", () => {
    analytics.consultationBooked();
    expect(fbq).toHaveBeenCalledWith("track", "Schedule");
  });
});
