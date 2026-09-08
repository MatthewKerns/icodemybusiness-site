import { describe, it, expect } from "vitest";
import {
  documentHtml,
  markdownToHtml,
  worksheetHtml,
  worksheetMarkdown,
  worksheetTitle,
  type WorksheetRow,
} from "./worksheet";

const ROW: WorksheetRow = {
  tacticId: "CLK-003",
  pillar: "clockify",
  text: "Log the problem you're solving, not the task you're doing",
  source: "interview 2026-09-02",
  worksheetDraft: undefined,
};

describe("worksheetTitle", () => {
  it("prefixes the tactic id and keeps short text whole", () => {
    expect(worksheetTitle(ROW)).toBe(
      "CLK-003 – Log the problem you're solving, not the task you're doing"
    );
  });

  it("truncates long text with an ellipsis", () => {
    const title = worksheetTitle({ tacticId: "WRT-002", text: "x".repeat(100) });
    expect(title.startsWith("WRT-002 – ")).toBe(true);
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual("WRT-002 – ".length + 60);
  });
});

describe("markdownToHtml", () => {
  it("renders the worksheet template shapes", () => {
    const html = markdownToHtml(
      [
        "# Time slicing",
        "",
        "Module 1 · Clockify · Training 1.4",
        "",
        "**Expected Lesson Outcome:** the next block cut into chunks.",
        "",
        "## Do this",
        "",
        "1. What did you get done in the last 30 minutes?",
        "   Answer: ________________",
        "2. How long until the next thing? ______ minutes",
        "",
        "- Every slice became an entry.",
        "- ~~a rule you crossed out~~",
      ].join("\n")
    );
    expect(html).toContain("<h1>Time slicing</h1>");
    expect(html).toContain("<h2>Do this</h2>");
    expect(html).toContain("<strong>Expected Lesson Outcome:</strong>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>What did you get done in the last 30 minutes?<br>Answer: ________________</li>");
    expect(html).toContain("<li>How long until the next thing? ______ minutes</li>");
    expect(html).toContain("<ul>\n<li>Every slice became an entry.</li>");
    expect(html).toContain("<s>a rule you crossed out</s>");
    expect(html).not.toContain("<p></p>");
  });

  it("escapes HTML in the source", () => {
    expect(markdownToHtml("Use <b>tags</b> & things")).toBe(
      "<p>Use &lt;b&gt;tags&lt;/b&gt; &amp; things</p>"
    );
  });
});

describe("worksheet body", () => {
  it("uses the skill's draft when there is one", () => {
    const md = worksheetMarkdown({ ...ROW, worksheetDraft: "# Drafted\n\n1. First question" });
    expect(md).toBe("# Drafted\n\n1. First question");
    expect(worksheetHtml({ ...ROW, worksheetDraft: "# Drafted" })).toContain("<h1>Drafted</h1>");
  });

  it("falls back to a scaffold around the tactic and flags it for Matthew", () => {
    const md = worksheetMarkdown(ROW);
    expect(md).toContain("# Log the problem you're solving, not the task you're doing");
    expect(md).toContain("Module 1 · Clockify · tactic CLK-003");
    expect(md).toContain("[Matthew:");
    expect(md).toContain("interview 2026-09-02");
    const html = worksheetHtml(ROW);
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("<h2>Do this</h2>");
  });

  it("documentHtml wraps arbitrary markdown", () => {
    expect(documentHtml("# Start here")).toContain("<body><h1>Start here</h1></body>");
  });
});
