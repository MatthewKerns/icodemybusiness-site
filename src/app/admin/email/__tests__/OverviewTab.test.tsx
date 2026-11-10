/**
 * Render tests for the Overview tab of /admin/email.
 *
 * The page is behind the owner gate, so nobody sees it rendered without an
 * owner login. These cover what the owner relies on at a glance: the "needs
 * you" list, and the difference between "nobody opened" and "opens are not
 * being recorded" — showing 0 for the second would be a false report.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { OverviewTab } from "../_components/OverviewTab";

const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({ useQuery: (...args: unknown[]) => mockUseQuery(...args) }));
vi.mock("next/link", () => ({
  default: ({ children, ...p }: { children: React.ReactNode }) => <a {...p}>{children}</a>,
}));

const STAGES = { new: 0, contacted: 0, replied: 0, interested: 0, booked: 0, won: 0, lost: 0 };

function overview(over: Record<string, unknown> = {}) {
  return {
    window: { days: 30, since: 0, until: 1 },
    leads: { total: 4, inWindow: 2, consented: 1, byStage: { ...STAGES, new: 4 }, bySource: {} },
    sends: { sent: 3, failed: 0, byTemplate: {} },
    engagement: {
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      callbacks: 0,
      lastCallbackAt: null,
    },
    suppressions: { byReason: {} },
    sequences: { paused: true, enrollments: { active: 0, paused: 0, exited: 0 }, stepsTotal: 16, stepsAuthored: 0 },
    outbound: {
      campaigns: { draft: 0, live: 0, paused: 0, done: 0 },
      reportedSent: 0,
      reportedBounced: 0,
      prospects: { total: 0, byStage: { ...STAGES } },
      replies: { inWindow: 0, byCategory: {}, unhandled: 0 },
    },
    inboxes: { total: 0, byStatus: {}, backups: 0, backupMin: 3, backupMax: 5 },
    setup: {
      resendApiKey: true,
      resendFromEmail: true,
      resendWebhookSecret: false,
      unsubscribeSecret: false,
      mailingAddress: false,
    },
    truncated: false,
    ...over,
  };
}

const FUNNEL = {
  constraint: { title: "Traffic is the constraint" },
  steps: [
    { key: "arrived", label: "Page views (all pages)", n: 12, measured: true },
    { key: "booked", label: "Booked a call", n: 0, measured: false },
  ],
};

/** The tab subscribes to two queries; answer each by its argument shape. */
function serve(data: unknown, funnel: unknown = FUNNEL) {
  let call = 0;
  mockUseQuery.mockImplementation(() => (call++ % 2 === 0 ? data : funnel));
}

afterEach(() => {
  cleanup();
  mockUseQuery.mockReset();
});

describe("OverviewTab", () => {
  it("shows a loading state before data arrives", () => {
    serve(undefined, undefined);
    render(<OverviewTab go={() => {}} />);
    expect(screen.getByText("Loading…")).toBeTruthy();
  });

  it("says engagement is not recorded when no webhook is set up, instead of showing zero", () => {
    serve(overview());
    render(<OverviewTab go={() => {}} />);
    expect(screen.getAllByText("not recorded")).toHaveLength(4);
    expect(screen.getByText(/RESEND_WEBHOOK_SECRET in the Convex env/)).toBeTruthy();
  });

  it("shows real engagement numbers once callbacks are arriving", () => {
    serve(
      overview({
        setup: {
          resendApiKey: true,
          resendFromEmail: true,
          resendWebhookSecret: true,
          unsubscribeSecret: true,
          mailingAddress: true,
        },
        engagement: {
          delivered: 3,
          opened: 2,
          clicked: 1,
          bounced: 0,
          complained: 0,
          callbacks: 6,
          lastCallbackAt: Date.now() - 60_000,
        },
      })
    );
    render(<OverviewTab go={() => {}} />);
    expect(screen.queryByText("not recorded")).toBeNull();
    expect(screen.getByText("67%")).toBeTruthy(); // 2 opened of 3 delivered
    expect(screen.getByText(/Receiving callbacks/)).toBeTruthy();
  });

  it("lists what needs the owner and takes them there", () => {
    const go = vi.fn();
    const data = overview();
    data.outbound.replies.unhandled = 2;
    serve(data);
    render(<OverviewTab go={go} />);
    expect(screen.getByText("Needs you")).toBeTruthy();
    expect(screen.getByText("2 replies are waiting on an answer.")).toBeTruthy();
    expect(screen.getByText(/0 backup inboxes warming or ready. Keep 3 to 5/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open replies" }));
    expect(go).toHaveBeenCalledWith("replies");
  });

  it("says so when nothing is waiting", () => {
    const data = overview();
    data.leads.byStage = { ...STAGES, contacted: 4 };
    data.inboxes.backups = 3;
    serve(data);
    render(<OverviewTab go={() => {}} />);
    expect(screen.getByText("Nothing is waiting on you")).toBeTruthy();
  });

  it("marks a funnel step nothing counts as not counted", () => {
    serve(overview());
    render(<OverviewTab go={() => {}} />);
    expect(screen.getByText("Traffic is the constraint")).toBeTruthy();
    expect(screen.getByText("not counted")).toBeTruthy();
  });
});
