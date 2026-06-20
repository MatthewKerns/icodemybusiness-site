import { describe, it, expect } from "vitest";
import { extractTop3Issues, stripIssuesFence } from "../top3-prompt";

describe("extractTop3Issues", () => {
  it("returns null when no fence present", () => {
    expect(extractTop3Issues("just text")).toBeNull();
  });

  it("parses a valid fenced block", () => {
    const text = `Thanks for sharing that.

\`\`\`top3-issues
{"issues":[{"title":"Cashflow","severity":"high","evidence":"Owner said forecasting breaks after 2 weeks"}]}
\`\`\``;
    const issues = extractTop3Issues(text);
    expect(issues).toHaveLength(1);
    expect(issues?.[0].title).toBe("Cashflow");
    expect(issues?.[0].severity).toBe("high");
  });

  it("caps at 3 issues", () => {
    const text = `\`\`\`top3-issues
{"issues":[
{"title":"A","severity":"high","evidence":"e"},
{"title":"B","severity":"high","evidence":"e"},
{"title":"C","severity":"high","evidence":"e"},
{"title":"D","severity":"high","evidence":"e"}
]}
\`\`\``;
    expect(extractTop3Issues(text)).toHaveLength(3);
  });

  it("defaults unknown severity to medium", () => {
    const text = `\`\`\`top3-issues
{"issues":[{"title":"X","severity":"catastrophic","evidence":"e"}]}
\`\`\``;
    expect(extractTop3Issues(text)?.[0].severity).toBe("medium");
  });

  it("returns null on invalid JSON", () => {
    const text = `\`\`\`top3-issues
not json
\`\`\``;
    expect(extractTop3Issues(text)).toBeNull();
  });

  it("skips entries without a title", () => {
    const text = `\`\`\`top3-issues
{"issues":[{"title":"","severity":"high","evidence":"e"},{"title":"ok","severity":"low","evidence":"e"}]}
\`\`\``;
    expect(extractTop3Issues(text)).toHaveLength(1);
  });
});

describe("stripIssuesFence", () => {
  it("removes the fenced block from the end", () => {
    const text = `Hello there.

\`\`\`top3-issues
{"issues":[]}
\`\`\``;
    expect(stripIssuesFence(text)).toBe("Hello there.");
  });

  it("returns input unchanged when no fence", () => {
    expect(stripIssuesFence("plain")).toBe("plain");
  });
});
