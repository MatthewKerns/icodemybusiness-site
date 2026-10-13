/**
 * The Google Ads tag ships OFF. It must render nothing unless the build was given
 * a valid `AW-<digits>` id, and when on it must load gtag.js for that id and run
 * Google's config snippet. /privacy follows the same switch (processors.test.ts).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import vm from "node:vm";
import { render, cleanup } from "@testing-library/react";

vi.mock("next/script", () => ({
  default: ({
    id,
    src,
    strategy,
    children,
  }: {
    id?: string;
    src?: string;
    strategy?: string;
    children?: string;
  }) => (
    <script data-testid={id ?? "loader"} data-src={src} data-strategy={strategy}>
      {children}
    </script>
  ),
}));

import { GoogleAdsTag } from "../GoogleAdsTag";

const ENV = "NEXT_PUBLIC_GOOGLE_ADS_TAG_ID";
const TAG = "AW-18511931386";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  delete process.env[ENV];
});

describe("GoogleAdsTag is off by default", () => {
  it("renders nothing when the env var is unset", () => {
    delete process.env[ENV];
    const { container } = render(<GoogleAdsTag />);
    expect(container.innerHTML).toBe("");
  });

  it.each(["", "G-123", "AW-", "AW-abc", "aw-123", " AW-123", "AW-1';alert(1)//"])(
    "renders nothing for %j",
    (value) => {
      vi.stubEnv(ENV, value);
      const { container } = render(<GoogleAdsTag />);
      expect(container.innerHTML).toBe("");
    }
  );
});

describe("GoogleAdsTag when given a valid id", () => {
  it("loads gtag.js for that id after the page is interactive", () => {
    vi.stubEnv(ENV, TAG);
    const { getByTestId } = render(<GoogleAdsTag />);
    const loader = getByTestId("loader");
    expect(loader.getAttribute("data-src")).toBe(
      `https://www.googletagmanager.com/gtag/js?id=${TAG}`
    );
    expect(loader.getAttribute("data-strategy")).toBe("afterInteractive");
  });

  it("runs Google's config snippet for that id", () => {
    vi.stubEnv(ENV, TAG);
    const { getByTestId } = render(<GoogleAdsTag />);
    const snippet = getByTestId("google-ads-tag");
    expect(snippet.getAttribute("data-strategy")).toBe("afterInteractive");
    const code = snippet.textContent ?? "";
    expect(code).toContain("window.dataLayer = window.dataLayer || [];");
    expect(code).toContain("function gtag(){dataLayer.push(arguments);}");
    expect(code).toContain("gtag('js', new Date());");
    expect(code).toContain(`gtag('config', '${TAG}');`);

    // Execute it for real: it must queue exactly [js, <Date>] then [config, <id>].
    const sandbox: Record<string, unknown> = {};
    sandbox.window = sandbox;
    vm.runInNewContext(code, sandbox);
    const queue = (sandbox.dataLayer as ArrayLike<unknown>[]).map((args) => Array.from(args));
    expect(queue).toHaveLength(2);
    expect(queue[0][0]).toBe("js");
    expect(queue[1]).toEqual(["config", TAG]);
  });
});

describe("the tag id is never in source", () => {
  const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), "utf8");

  it("comes only from the env var, not from the component or the layout", () => {
    expect(read("../GoogleAdsTag.tsx")).not.toMatch(/AW-\d/);
    expect(read("../../../app/layout.tsx")).not.toMatch(/AW-\d/);
  });

  it("is mounted exactly once, in the root layout", () => {
    const layout = read("../../../app/layout.tsx");
    expect(layout.match(/<GoogleAdsTag \/>/g)).toHaveLength(1);
  });
});
