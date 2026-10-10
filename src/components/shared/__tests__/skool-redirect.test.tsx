/**
 * /skool is the link that goes in off-site bios (the YouTube channel
 * description first). It must log the visit with its UTM tags, then forward to
 * the real Skool community — and still offer a plain link if the forward fails.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const capture = vi.fn();
vi.mock("posthog-js", () => ({ default: { __loaded: true, capture: (...a: unknown[]) => capture(...a) } }));

import { SkoolRedirect, SKOOL_REDIRECT_DELAY_MS, utmProperties } from "../SkoolRedirect";
import { SKOOL_COMMUNITY_URL } from "@/lib/constants";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";

const replace = vi.fn();
const realLocation = window.location;

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...realLocation, search: "?utm_source=youtube&utm_medium=channel_description&x=1", replace },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  capture.mockReset();
  replace.mockReset();
  Object.defineProperty(window, "location", { configurable: true, value: realLocation });
});

describe("utmProperties", () => {
  it("keeps only the UTM tags that are present", () => {
    expect(utmProperties("?utm_source=youtube&utm_campaign=&ref=abc")).toEqual({ utm_source: "youtube" });
  });
});

describe("SkoolRedirect", () => {
  it("logs the visit with its UTM tags", () => {
    render(<SkoolRedirect />);
    expect(capture).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.SKOOL_REDIRECT,
      { destination: SKOOL_COMMUNITY_URL, utm_source: "youtube", utm_medium: "channel_description" },
      { transport: "sendBeacon" }
    );
  });

  it("forwards to the Skool community after the delay, not before", () => {
    render(<SkoolRedirect />);
    vi.advanceTimersByTime(SKOOL_REDIRECT_DELAY_MS - 1);
    expect(replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(replace).toHaveBeenCalledWith(SKOOL_COMMUNITY_URL);
  });

  it("offers a plain link to Skool", () => {
    render(<SkoolRedirect />);
    expect(screen.getByRole("link", { name: /Continue to Skool/ })).toHaveAttribute("href", SKOOL_COMMUNITY_URL);
  });
});
