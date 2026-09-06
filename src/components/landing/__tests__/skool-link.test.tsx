/**
 * Both "Join the Inner Circle" buttons must point at the real Skool community.
 *
 * They drifted once: each carried a guessed slug (skool.com/icodemybusiness) that
 * 404'd on the live site until 2026-09-06. The community is unlisted, so the slug
 * cannot be discovered — it is whatever Matthew's Skool settings say, held in one
 * constant that both surfaces read.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SKOOL_COMMUNITY_URL } from "@/lib/constants";
import { CommunityBanner } from "../CommunityBanner";
import { Footer } from "../Footer";

vi.mock("next/link", () => ({
  default: ({ children, href, ...p }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...p}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe("Skool community link", () => {
  it("is the real community slug, not a guess", () => {
    expect(SKOOL_COMMUNITY_URL).toBe("https://www.skool.com/icodemybusiness-9679");
  });

  it("CommunityBanner links to it", () => {
    render(<CommunityBanner />);
    expect(screen.getByRole("link", { name: /Join on Skool/ })).toHaveAttribute("href", SKOOL_COMMUNITY_URL);
  });

  it("Footer links to it", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /Join the Inner Circle/ })).toHaveAttribute("href", SKOOL_COMMUNITY_URL);
  });
});
