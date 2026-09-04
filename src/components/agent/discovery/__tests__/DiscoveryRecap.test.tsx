/**
 * Regression test for the recap that rendered as one spliced sentence.
 *
 * The shipped version fed five answers through a prose template
 * ("...${problem} is costing you roughly ${cost}."), which assumed lowercase
 * clause fragments while the extractor produced whole sentences. Live output:
 *
 *   "...spent largely on coding work. is costing you roughly At least 40 of
 *    their 60+ hours a week... If nothing changes, If nothing changes, they
 *    stay stuck..."
 *
 * Rows cannot splice, so these cases pin the contract: one row per question,
 * each showing exactly what was stored, and no connective copy that can
 * collide with the visitor's own words.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: null, isSignedIn: false, isLoaded: true }),
}));

import { DiscoveryRecap } from "../DiscoveryRecap";
import { DISCOVERY_QUESTIONS } from "@/content/discovery-questions";

const answers = {
  problem: { summary: "You chase invoices by hand every week.", quotes: [] },
  cost: { summary: "It costs you about a day a week.", quotes: [] },
  history: { summary: "It started two years ago.", quotes: [] },
  stakes: {
    summary: "If nothing changes, you stay stuck at the same rate.",
    quotes: [],
  },
  outcome: { summary: "Invoices go out by themselves.", quotes: [] },
};

const noop = () => {};
const noopAsync = async () => {};

const renderRecap = (props: Record<string, unknown> = {}) =>
  render(
    <DiscoveryRecap
      answers={answers}
      busy={false}
      onCorrect={noop}
      onSubmit={noopAsync}
      {...props}
    />
  );

afterEach(cleanup);

describe("DiscoveryRecap", () => {
  it("renders one labelled row per question, in order", () => {
    renderRecap();
    expect(screen.getAllByRole("term").map((n) => n.textContent)).toEqual(
      DISCOVERY_QUESTIONS.map((q) => q.rowLabel)
    );
    expect(
      screen.getAllByRole("definition").map((n) => n.textContent)
    ).toEqual(DISCOVERY_QUESTIONS.map((q) => answers[q.key].summary));
  });

  it("does not repeat a phrase the visitor's own answer already contains", () => {
    // The defect this file exists for: the template said "If nothing changes,"
    // and the stored summary opened with it too, so it rendered twice.
    const { container } = renderRecap();
    const occurrences =
      container.textContent?.match(/If nothing changes/g) ?? [];
    expect(occurrences).toHaveLength(2); // once as the label, once in the answer
  });

  it("reports when the correction box is opened, before anything is typed", () => {
    const onCorrectionOpened = vi.fn();
    renderRecap({ onCorrectionOpened });
    fireEvent.click(screen.getByRole("button", { name: /not quite/i }));
    expect(onCorrectionOpened).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/what did I get wrong/i)).toBeInTheDocument();
  });

  it("reports the accept the moment it is clicked, before the email form", () => {
    // discovery_recap_confirmed only fires once an address is in, so without
    // this the guest who accepts and then abandons the form leaves no trace.
    const onAccepted = vi.fn();
    const onSubmit = vi.fn(async () => {});
    renderRecap({ onAccepted, onSubmit });
    fireEvent.click(screen.getByRole("button", { name: /yes, that's right/i }));
    expect(onAccepted).toHaveBeenCalledTimes(1);
    expect(onAccepted).toHaveBeenCalledWith(true); // signed out: email form next
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("hands the correction back trimmed, once", () => {
    const onCorrect = vi.fn();
    renderRecap({ onCorrect });
    fireEvent.click(screen.getByRole("button", { name: /not quite/i }));
    fireEvent.change(screen.getByLabelText(/what did I get wrong/i), {
      target: { value: "  closer to two days  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /update the recap/i }));
    expect(onCorrect).toHaveBeenCalledTimes(1);
    expect(onCorrect).toHaveBeenCalledWith("closer to two days");
  });

  it("still renders every row when the flow captured nothing", () => {
    renderRecap({ answers: {} });
    expect(screen.getAllByRole("definition")).toHaveLength(
      DISCOVERY_QUESTIONS.length
    );
    expect(screen.getAllByText("Not captured")).toHaveLength(
      DISCOVERY_QUESTIONS.length
    );
  });
});
