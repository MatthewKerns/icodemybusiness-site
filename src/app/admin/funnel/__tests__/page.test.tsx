/**
 * Render tests for the owner-only funnel map.
 *
 * These exist because the page is behind the /admin gate, so nobody can look at
 * the rendered output without an owner login — including during a cutover, when
 * the first person to see it would be the operator on the live site. The gate
 * returning a redirect proves the route is protected; it proves nothing about
 * what renders after sign-in. These tests cover that gap: the constraint verdict
 * and its reasoning, the per-step counts, the unmeasured steps, and the two
 * states the page can be in before data arrives.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import AdminFunnelPage from "../page";

const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({ useQuery: () => mockUseQuery() }));
vi.mock("next/link", () => ({
  default: ({ children, ...p }: { children: React.ReactNode }) => <a {...p}>{children}</a>,
}));

const NOW = Date.UTC(2026, 8, 4);
const SINCE = NOW - 30 * 86_400_000;

function report(over: Record<string, unknown> = {}) {
  return {
    window: { days: 30, since: SINCE, until: NOW },
    steps: [
      { key: "arrived", label: "Page views (all pages)", n: 65, measured: true, source: "pageViews rows" },
      { key: "splash_entered", label: "Passed the splash", n: 40, measured: true, source: "visitorEvents splash_entered" },
      { key: "assessment_started", label: "Started the assessment", n: 12, measured: true, source: "visitorEvents assessment_started" },
      { key: "answering", label: "Answered question 1", n: 10, measured: true, source: "visitorEvents discovery_stage_advanced" },
      { key: "recap", label: "Reached the recap", n: 8, measured: true, source: "stage 5" },
      { key: "email", label: "Gave an email", n: 6, measured: true, source: "visitorEvents discovery_assessment_completed" },
      { key: "book_click", label: "Clicked book a call", n: 4, measured: true, source: "visitorEvents book_call_clicked" },
      { key: "booked", label: "Booked a call", n: 0, measured: false, source: "PostHog only — no Convex write" },
    ],
    transitions: [
      { from: "arrived", to: "splash_entered", entered: 65, advanced: 40, rate: 0.61, lost: 25, excluded: "page views are not people" },
      { from: "splash_entered", to: "assessment_started", entered: 40, advanced: 12, rate: 0.3, lost: 28 },
    ],
    constraint: {
      kind: "step",
      stepKey: "assessment_started",
      title: 'Biggest loss: "Passed the splash" → "Started the assessment"',
      why: ["40 reached the splash; 12 went on (30%). 28 people were lost here.", "Window: last 30 days, 65 page views."],
      nextAction: "Work on what happens between the splash and the assessment.",
    },
    gaps: ['"Booked a call" is not written to Convex; it cannot appear here until it is.'],
    sampled: { events: 120, pageViews: 65, truncated: false },
    ...over,
  };
}

afterEach(() => { cleanup(); mockUseQuery.mockReset(); });

describe("/admin/funnel — constraint identifier", () => {
  it("shows the verdict, its reasoning, and what moves it", () => {
    mockUseQuery.mockReturnValue(report());
    render(<AdminFunnelPage />);

    expect(screen.getByText(/Biggest loss/)).toBeInTheDocument();
    expect(screen.getByText(/28 people were lost here/)).toBeInTheDocument();
    expect(screen.getByText(/Work on what happens between the splash/)).toBeInTheDocument();
    expect(screen.getByText("step")).toBeInTheDocument();
  });

  it("marks the constraint step in the map and carries its count", () => {
    mockUseQuery.mockReturnValue(report());
    render(<AdminFunnelPage />);

    expect(screen.getByText("Start the assessment")).toBeInTheDocument();
    expect(screen.getAllByText("constraint").length).toBeGreaterThan(0);
    expect(screen.getByText("12")).toBeInTheDocument(); // assessment_started count
  });

  it("says a step is not counted rather than showing a misleading zero", () => {
    mockUseQuery.mockReturnValue(report());
    render(<AdminFunnelPage />);

    expect(screen.getByText("not counted here")).toBeInTheDocument();
    expect(screen.getAllByText("unmeasured").length).toBeGreaterThan(0);
    expect(screen.getByText(/is not written to Convex/)).toBeInTheDocument();
  });

  it("renders the traffic verdict when there are too few visitors to judge", () => {
    mockUseQuery.mockReturnValue(
      report({
        constraint: {
          kind: "traffic",
          stepKey: "arrived",
          title: "Not enough visitors to judge anything below the front door",
          why: ["3 page views in the last 30 days; 50 is the floor."],
          nextAction: "Get traffic to this deployment.",
        },
      }),
    );
    render(<AdminFunnelPage />);

    expect(screen.getByText(/Not enough visitors/)).toBeInTheDocument();
    expect(screen.getByText(/50 is the floor/)).toBeInTheDocument();
    expect(screen.getByText("traffic")).toBeInTheDocument();
  });

  it("shows a loading state instead of an empty page before the query resolves", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<AdminFunnelPage />);

    expect(screen.getByText("Funnel map")).toBeInTheDocument();
    expect(screen.getByText("Computing…")).toBeInTheDocument();
    expect(screen.queryByText(/Biggest loss/)).not.toBeInTheDocument();
  });

  it("always links out to the PostHog dashboard, loaded or not", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<AdminFunnelPage />);
    const link = screen.getByRole("link", { name: /Open the reality in PostHog/ });
    expect(link).toHaveAttribute("href", expect.stringContaining("dashboard/933266"));
  });
});
