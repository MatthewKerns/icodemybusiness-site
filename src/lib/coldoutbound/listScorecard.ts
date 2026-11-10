/**
 * Grades a prospect list before it is mailed. A port of
 * list-quality-scorecard/scripts/score-list.ts from coldoutboundskills (MIT,
 * (c) 2026 GrowthEngineX; THIRD_PARTY_NOTICES.md) — the script's formulas and
 * weights, not the looser prose in its SKILL.md. The two ICP dimensions
 * (title relevance, ICP fit) are left out: they need an ICP file this
 * dashboard does not have, and the script excludes them too when it is absent.
 */

export interface ProspectRow {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  website?: string;
  linkedinUrl?: string;
  /** Verification status from the list tool, if the file carried one. */
  verification?: string;
}

/** A CSV parser that respects quoted commas and quoted newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === "," || c === "\t") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

const COLUMN_ALIASES: Record<keyof ProspectRow, string[]> = {
  email: ["email", "email_address", "work_email", "e-mail"],
  firstName: ["first_name", "firstname", "first"],
  lastName: ["last_name", "lastname", "last"],
  company: ["company_name", "company", "organization", "account"],
  title: ["title", "job_title", "position"],
  website: ["website", "company_domain", "domain", "company_website", "url"],
  linkedinUrl: ["linkedin_url", "linkedin", "person_linkedin_url"],
  verification: ["email_status", "verification_status", "mv_status"],
};

const norm = (h: string) => h.trim().toLowerCase().replace(/[\s-]+/g, "_");

/**
 * Turn pasted text into prospect rows. A header row is used when one of its
 * cells is an email column; otherwise every line is read as a bare address
 * (or "address, first name, last name, company").
 */
export function parseProspects(text: string): { rows: ProspectRow[]; hasVerification: boolean } {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], hasVerification: false };
  const header = table[0].map(norm);
  const emailCol = header.findIndex((h) => COLUMN_ALIASES.email.includes(h));

  if (emailCol === -1) {
    const order: (keyof ProspectRow)[] = ["email", "firstName", "lastName", "company"];
    return {
      rows: table.map((cells) => {
        const row: ProspectRow = { email: "" };
        order.forEach((key, i) => {
          const value = cells[i]?.trim();
          if (value) row[key] = value;
        });
        return row;
      }),
      hasVerification: false,
    };
  }

  const index = {} as Record<keyof ProspectRow, number>;
  for (const key of Object.keys(COLUMN_ALIASES) as (keyof ProspectRow)[]) {
    index[key] = header.findIndex((h) => COLUMN_ALIASES[key].includes(h));
  }
  const rows = table.slice(1).map((cells) => {
    const row: ProspectRow = { email: "" };
    for (const key of Object.keys(index) as (keyof ProspectRow)[]) {
      const value = index[key] >= 0 ? cells[index[key]]?.trim() : undefined;
      if (value) row[key] = value;
    }
    return row;
  });
  return { rows, hasVerification: index.verification >= 0 };
}

export interface Dimension {
  key: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface Scorecard {
  total: number;
  overall: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  action: string;
  dimensions: Dimension[];
  issues: string[];
}

const VERIFIED = new Set(["ok", "verified", "valid"]);
const ROLE_LOCALS = new Set([
  "info", "contact", "hello", "hi", "sales", "team", "support", "admin", "noreply", "no-reply",
  "office", "marketing",
]);
const BAD_TITLES = [
  /\bintern(ship)?\b/i, /\bassistant\b/i, /\bcoordinator\b/i, /\bstudent\b/i, /\bpart.time\b/i,
  /\bretired\b/i, /\btrainee\b/i,
];
const FAKE_NAMES = new Set(["admin", "info", "contact", "test", "user", "n/a", "na"]);

function isFakeName(first: string | undefined, last: string | undefined): boolean {
  if (!first || !last) return true;
  if (first.length > 2 && first === first.toUpperCase() && /[A-Z]/.test(first)) return true;
  if (/\d/.test(first) || /\d/.test(last)) return true;
  return FAKE_NAMES.has(first.toLowerCase()) || FAKE_NAMES.has(last.toLowerCase());
}

export function scoreList(rows: ProspectRow[], hasVerification: boolean): Scorecard | null {
  const total = rows.length;
  if (total === 0) return null;
  const pctOf = (n: number) => (n / total) * 100;

  const verified = rows.filter((r) => VERIFIED.has((r.verification ?? "").toLowerCase())).length;
  const emails = rows.map((r) => r.email.trim().toLowerCase());
  const dupes = total - new Set(emails).size;
  const domains = rows.map((r) => (r.website || r.email.split("@")[1] || "").toLowerCase());
  const perDomain = new Map<string, number>();
  for (const d of domains) perDomain.set(d, (perDomain.get(d) ?? 0) + 1);
  const avgPerDomain = total / Math.max(1, perDomain.size);
  const crowded = Array.from(perDomain.values()).filter((n) => n > 5).length;
  const badTitles = rows.filter((r) => r.title && BAD_TITLES.some((re) => re.test(r.title!))).length;
  const role = rows.filter((r) => ROLE_LOCALS.has(r.email.split("@")[0]?.toLowerCase() ?? "")).length;
  const fake = rows.filter((r) => isFakeName(r.firstName, r.lastName)).length;
  const rolePct = pctOf(role);

  const dimensions: Dimension[] = [
    {
      key: "verification",
      label: "Email verification",
      score: hasVerification ? Math.round(pctOf(verified)) : 0,
      weight: 2,
      detail: hasVerification ? `${verified} of ${total} verified` : "no verification column in the file",
    },
    {
      key: "duplicates",
      label: "Duplicate emails",
      score: Math.max(0, Math.round(100 - pctOf(dupes) * 20)),
      weight: 1,
      detail: `${dupes} duplicate${dupes === 1 ? "" : "s"}`,
    },
    {
      key: "domains",
      label: "People per company",
      score: avgPerDomain < 2 ? 100 : avgPerDomain < 5 ? 60 : 30,
      weight: 1,
      detail: `${avgPerDomain.toFixed(1)} per domain on average`,
    },
    {
      key: "bad-titles",
      label: "Wrong-seniority titles",
      score: Math.max(0, Math.round(100 - pctOf(badTitles) * 10)),
      weight: 1,
      detail: `${badTitles} intern / assistant / coordinator / student / retired`,
    },
    {
      key: "role-addresses",
      label: "Role addresses",
      score: rolePct < 5 ? 100 : rolePct < 15 ? Math.round(100 - (rolePct - 5) * 5) : 0,
      weight: 1,
      detail: `${role} info@ / sales@ / support@ style`,
    },
    {
      key: "names",
      label: "Name quality",
      score: Math.round(((total - fake) / total) * 100),
      weight: 1,
      detail: `${fake} missing or placeholder name${fake === 1 ? "" : "s"}`,
    },
  ];

  const weightSum = dimensions.reduce((a, d) => a + d.weight, 0);
  const overall = Math.round(dimensions.reduce((a, d) => a + d.score * d.weight, 0) / weightSum);
  const grade = overall >= 93 ? "A+" : overall >= 90 ? "A" : overall >= 80 ? "B" : overall >= 70 ? "C" : overall >= 60 ? "D" : "F";
  const action = {
    "A+": "Ready to send.",
    A: "Ready to send.",
    B: "Minor fixes, then send.",
    C: "Fix the top issues first.",
    D: "Needs serious cleanup.",
    F: "Do not send. Rebuild the list.",
  }[grade];

  const issues: string[] = [];
  if (!hasVerification) issues.push("No verification column. Verify every address before sending.");
  else if (verified < total) issues.push(`${total - verified} unverified addresses.`);
  if (dupes > 0) issues.push(`${dupes} duplicate emails.`);
  if (role > 0) issues.push(`${role} role addresses (info@, sales@…).`);
  if (badTitles > 0) issues.push(`${badTitles} wrong-seniority titles.`);
  if (crowded > 0) issues.push(`${crowded} compan${crowded === 1 ? "y has" : "ies have"} more than 5 people. Cap at 2 to 3 each.`);
  if (pctOf(fake) > 5) issues.push(`${fake} rows with a missing or placeholder name.`);

  return { total, overall, grade, action, dimensions, issues: issues.slice(0, 5) };
}
