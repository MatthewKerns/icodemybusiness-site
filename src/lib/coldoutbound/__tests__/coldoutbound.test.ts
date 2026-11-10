import { describe, it, expect } from "vitest";
import { judgeCampaign, worstVerdict } from "../benchmarks";
import { countWords, lintSequence, lintStep } from "../copyLint";
import { parseCsv, parseProspects, scoreList } from "../listScorecard";

const base = { bounced: 0, replied: 0, positive: 0, hostile: 0, unsubscribed: 0 };
const verdictOf = (findings: ReturnType<typeof judgeCampaign>, metric: string) =>
  findings.find((f) => f.metric === metric)?.verdict;

describe("judgeCampaign", () => {
  it("offers no verdict without a sent total", () => {
    const f = judgeCampaign({ ...base, sent: null });
    expect(f).toHaveLength(1);
    expect(f[0].verdict).toBe("wait");
  });

  it("waits for 200 sends before judging reply rate", () => {
    expect(verdictOf(judgeCampaign({ ...base, sent: 199, replied: 0 }), "reply")).toBe("wait");
    expect(verdictOf(judgeCampaign({ ...base, sent: 200, replied: 1 }), "reply")).toBe("bad");
    expect(verdictOf(judgeCampaign({ ...base, sent: 200, replied: 2 }), "reply")).toBe("ok");
    expect(verdictOf(judgeCampaign({ ...base, sent: 200, replied: 3 }), "reply")).toBe("good");
  });

  it("treats positive reply rate under 500 sends as noise", () => {
    expect(verdictOf(judgeCampaign({ ...base, sent: 499, positive: 20 }), "positive")).toBe("wait");
    expect(verdictOf(judgeCampaign({ ...base, sent: 1000, positive: 20 }), "positive")).toBe("good");
    expect(verdictOf(judgeCampaign({ ...base, sent: 1000, positive: 10 }), "positive")).toBe("ok");
    expect(verdictOf(judgeCampaign({ ...base, sent: 1000, positive: 9 }), "positive")).toBe("warn");
  });

  it("bands bounce rate at 2, 3 and 5 percent", () => {
    const bounce = (bounced: number) => verdictOf(judgeCampaign({ ...base, sent: 1000, bounced }), "bounce");
    expect(bounce(5)).toBe("good");
    expect(bounce(15)).toBe("ok");
    expect(bounce(25)).toBe("warn");
    expect(bounce(35)).toBe("bad");
    expect(bounce(60)).toBe("bad");
    expect(verdictOf(judgeCampaign({ ...base, sent: 40, bounced: 10 }), "bounce")).toBe("wait");
  });

  it("flags hostile over 0.3% and unsubscribes over 2% of sent", () => {
    const f = judgeCampaign({ ...base, sent: 1000, replied: 20, hostile: 4, unsubscribed: 21 });
    expect(verdictOf(f, "hostile")).toBe("bad");
    expect(verdictOf(f, "unsubscribe")).toBe("bad");
    expect(worstVerdict(f)).toBe("bad");
    const calm = judgeCampaign({ ...base, sent: 1000, replied: 20, hostile: 3, unsubscribed: 20 });
    expect(verdictOf(calm, "hostile")).toBeUndefined();
    expect(verdictOf(calm, "unsubscribe")).toBeUndefined();
  });
});

const GOOD_BODY =
  "{{first_name}}, saw that {{company_name}} runs intake by hand across three tools. " +
  "Most owners we talk to lose a full day a week re-keying the same details, and it shows up as slow replies to people ready to buy. " +
  "We built a small workflow that files each request the moment it arrives and drafts the first reply for review. " +
  "Worth sending over a two minute walkthrough? A one word reply works if you would rather I stopped.";

describe("lintStep", () => {
  const rules = (input: Parameters<typeof lintStep>[0]) => lintStep(input).map((i) => i.rule);

  it("passes a plain, well-sized first email", () => {
    const issues = lintStep({ subject: "question for {{first_name}}", body: GOOD_BODY, stepIndex: 0 });
    expect(issues.filter((i) => i.severity === "fail")).toEqual([]);
    expect(countWords(GOOD_BODY)).toBeGreaterThanOrEqual(50);
    expect(countWords(GOOD_BODY)).toBeLessThanOrEqual(90);
  });

  it("fails em dashes, template phrases and links in email 1", () => {
    const r = rules({
      subject: "question for {{first_name}}",
      body: `I hope this email finds you well — see https://example.com. ${GOOD_BODY}`,
      stepIndex: 0,
    });
    expect(r).toContain("em-dash");
    expect(r).toContain("template-phrase");
    expect(r).toContain("links");
  });

  it("fails promotional and silence-based wording, but only warns on single words", () => {
    const issues = lintStep({
      subject: "question for {{first_name}}",
      body: `${GOOD_BODY} Act now for a free trial. If I don't hear back I will leave it there. We have a new plan.`,
      stepIndex: 2,
    });
    const by = (rule: string) => issues.find((i) => i.rule === rule);
    expect(by("promotional")?.severity).toBe("fail");
    expect(by("closeout")?.severity).toBe("fail");
    expect(by("spam-word")?.severity).toBe("warn");
    expect(by("spam-word")?.message).toContain("new");
  });

  it("matches whole words only", () => {
    const issues = lintStep({
      subject: "renewal for {{first_name}}",
      body: GOOD_BODY.replace("slow replies", "knowledge gaps"),
      stepIndex: 0,
    });
    // "renewal" and "knowledge" contain "new"/"now" but are not those words.
    expect(issues.find((i) => i.rule === "spam-word")).toBeUndefined();
  });

  it("checks the subject by position", () => {
    expect(rules({ subject: "", body: GOOD_BODY, stepIndex: 0 })).toContain("missing");
    expect(rules({ subject: "", body: GOOD_BODY, stepIndex: 1 })).not.toContain("missing");
    expect(rules({ subject: "a bump", body: GOOD_BODY, stepIndex: 1 })).toContain("thread");
    expect(rules({ subject: "Quick question", body: GOOD_BODY, stepIndex: 0 })).toContain("overused");
    expect(rules({ subject: "one two three four five six", body: GOOD_BODY, stepIndex: 0 })).toContain("length");
  });

  it("catches the wrong merge variables and a greeting prefix", () => {
    const r = rules({
      subject: "question for {first_name}",
      body: `Hi {{first_name}}, about {{company}}. ${GOOD_BODY}`,
      stepIndex: 0,
    });
    expect(r.filter((x) => x === "variable").length).toBeGreaterThanOrEqual(2);
    expect(r).toContain("greeting");
  });

  it("does not read spintax as a single-brace variable, and counts one option", () => {
    const body = `{Saw|Noticed} that ${GOOD_BODY}`;
    expect(rules({ subject: "question for {{first_name}}", body, stepIndex: 0 })).not.toContain("variable");
    expect(countWords("{Saw|Noticed|Spotted} this")).toBe(2);
  });

  it("flags length at both ends", () => {
    expect(rules({ subject: "a b", body: "Too short to say anything.", stepIndex: 0 })).toContain("length");
    const long = lintStep({ subject: "a b", body: Array(130).fill("word").join(" "), stepIndex: 0 });
    expect(long.find((i) => i.rule === "length")?.severity).toBe("fail");
  });
});

describe("lintSequence", () => {
  it("wants 3 to 4 steps with days between them", () => {
    expect(lintSequence([])).toHaveLength(1);
    expect(lintSequence([{ delayDays: 0 }])[0]).toContain("Fewer than 3");
    expect(lintSequence(Array(5).fill({ delayDays: 3 }))[0]).toContain("More than 4");
    expect(lintSequence([{ delayDays: 0 }, { delayDays: 3 }, { delayDays: 4 }, { delayDays: 4 }])).toEqual([]);
    expect(lintSequence([{ delayDays: 0 }, { delayDays: 1 }, { delayDays: 4 }])[0]).toContain("Email 2");
  });
});

describe("list scorecard", () => {
  it("parses quoted commas and newlines", () => {
    expect(parseCsv('a,"b, c","d\ne"\nf,g,h\n')).toEqual([
      ["a", "b, c", "d\ne"],
      ["f", "g", "h"],
    ]);
  });

  it("reads a header row by column name, in any order", () => {
    const { rows, hasVerification } = parseProspects(
      "First Name,Email,company_name,email_status\nJane,jane@acme.com,Acme,valid\n"
    );
    expect(hasVerification).toBe(true);
    expect(rows).toEqual([
      { email: "jane@acme.com", firstName: "Jane", company: "Acme", verification: "valid" },
    ]);
  });

  it("reads bare addresses when there is no header", () => {
    const { rows } = parseProspects("a@x.com\nb@y.com, Bea, Lee\n");
    expect(rows).toEqual([{ email: "a@x.com" }, { email: "b@y.com", firstName: "Bea", lastName: "Lee" }]);
  });

  it("grades a clean verified list A+ and an unverified one down", () => {
    const clean = Array.from({ length: 20 }, (_, i) => ({
      email: `person${i}@company${i}.com`,
      firstName: "Jane",
      lastName: "Doe",
      title: "Founder",
      verification: "valid",
    }));
    const good = scoreList(clean, true)!;
    expect(good.grade).toBe("A+");
    expect(good.issues).toEqual([]);

    const unverified = scoreList(
      clean.map((r) => ({ email: r.email, firstName: r.firstName, lastName: r.lastName, title: r.title })),
      false
    )!;
    expect(unverified.dimensions.find((d) => d.key === "verification")?.score).toBe(0);
    expect(unverified.overall).toBe(71);
    expect(unverified.grade).toBe("C");
    expect(unverified.issues[0]).toContain("No verification column");
  });

  it("penalises duplicates, role addresses, junior titles and placeholder names", () => {
    const rows = [
      { email: "info@acme.com", firstName: "Info", lastName: "Team", verification: "valid" },
      { email: "info@acme.com", firstName: "Info", lastName: "Team", verification: "valid" },
      { email: "sam@acme.com", firstName: "SAM", lastName: "Lee", title: "Marketing Intern", verification: "invalid" },
      { email: "kim@beta.com", firstName: "Kim", verification: "valid" },
    ];
    const card = scoreList(rows, true)!;
    const score = (key: string) => card.dimensions.find((d) => d.key === key)!.score;
    expect(score("verification")).toBe(75);
    expect(score("duplicates")).toBe(0);
    expect(score("role-addresses")).toBe(0);
    expect(score("bad-titles")).toBe(0);
    // "Info" is a placeholder, "SAM" is all caps, and Kim has no last name.
    expect(score("names")).toBe(0);
    expect(card.grade).toBe("F");
  });

  it("returns nothing for an empty list", () => {
    expect(scoreList([], false)).toBeNull();
  });
});
