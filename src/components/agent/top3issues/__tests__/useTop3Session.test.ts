import { describe, it, expect } from "vitest";
import {
  top3Reducer,
  initialState,
  canAcceptFile,
  allThreeConfirmed,
  MAX_FILES,
  MAX_BYTES_PER_FILE,
} from "../useTop3Session";
import type { AttachedFile, Issue } from "../types";

const file = (overrides: Partial<AttachedFile> = {}): AttachedFile => ({
  storageId: `s-${Math.random()}`,
  name: "doc.txt",
  size: 1024,
  mime: "text/plain",
  extractedChars: 100,
  ...overrides,
});

const issue = (overrides: Partial<Issue> = {}): Issue => ({
  title: "Cashflow is opaque",
  severity: "high",
  evidence: "Owner cannot forecast next 30 days",
  ...overrides,
});

describe("top3Reducer", () => {
  it("appends a user message on user-send", () => {
    const s = top3Reducer(initialState("abc"), {
      type: "user-send",
      messageId: "m1",
      content: "hello",
    });
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]).toMatchObject({ role: "user", content: "hello" });
  });

  it("streams assistant deltas into a single message", () => {
    let s = top3Reducer(initialState("abc"), {
      type: "assistant-start",
      messageId: "a1",
    });
    s = top3Reducer(s, {
      type: "assistant-delta",
      messageId: "a1",
      chunk: "Hi ",
    });
    s = top3Reducer(s, {
      type: "assistant-delta",
      messageId: "a1",
      chunk: "there",
    });
    s = top3Reducer(s, { type: "assistant-finish", messageId: "a1" });

    expect(s.isStreaming).toBe(false);
    expect(s.messages[0].content).toBe("Hi there");
    expect(s.messages[0].pending).toBe(false);
  });

  it("caps draftIssues to 3", () => {
    const s = top3Reducer(initialState("abc"), {
      type: "issues-update",
      issues: [issue(), issue(), issue(), issue()],
    });
    expect(s.draftIssues).toHaveLength(3);
  });

  it("rejects file-attached past MAX_FILES", () => {
    let s = initialState("abc");
    for (let i = 0; i < MAX_FILES; i++) {
      s = top3Reducer(s, { type: "file-attached", file: file() });
    }
    const s2 = top3Reducer(s, { type: "file-attached", file: file() });
    expect(s2.files).toHaveLength(MAX_FILES);
  });

  it("rejects file-attached when total bytes exceeded", () => {
    let s = initialState("abc");
    s = top3Reducer(s, {
      type: "file-attached",
      file: file({ size: 10 * 1024 * 1024 }),
    });
    const s2 = top3Reducer(s, {
      type: "file-attached",
      file: file({ size: 10 * 1024 * 1024 }),
    });
    expect(s2.files).toHaveLength(1);
  });

  it("removes a file by storageId", () => {
    const f1 = file({ storageId: "a" });
    const f2 = file({ storageId: "b" });
    let s = initialState("abc");
    s = top3Reducer(s, { type: "file-attached", file: f1 });
    s = top3Reducer(s, { type: "file-attached", file: f2 });
    s = top3Reducer(s, { type: "file-remove", storageId: "a" });
    expect(s.files.map((f) => f.storageId)).toEqual(["b"]);
  });

  it("clears error on reset-error", () => {
    const s = top3Reducer(
      { ...initialState("abc"), error: "boom" },
      { type: "reset-error" }
    );
    expect(s.error).toBeUndefined();
  });

  it("error action stops streaming", () => {
    const s = top3Reducer(
      { ...initialState("abc"), isStreaming: true },
      { type: "error", message: "nope" }
    );
    expect(s.isStreaming).toBe(false);
    expect(s.error).toBe("nope");
  });
});

describe("canAcceptFile", () => {
  it("rejects oversized single file", () => {
    const result = canAcceptFile(initialState("x"), MAX_BYTES_PER_FILE + 1);
    expect(result.ok).toBe(false);
  });

  it("accepts a reasonable file", () => {
    expect(canAcceptFile(initialState("x"), 1024).ok).toBe(true);
  });
});

describe("allThreeConfirmed", () => {
  it("requires exactly 3 issues with title + evidence", () => {
    expect(allThreeConfirmed([])).toBe(false);
    expect(allThreeConfirmed([issue(), issue()])).toBe(false);
    expect(allThreeConfirmed([issue(), issue(), issue()])).toBe(true);
    expect(
      allThreeConfirmed([issue(), issue(), issue({ title: "" })])
    ).toBe(false);
  });
});
