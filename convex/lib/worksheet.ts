import type { Doc } from "../_generated/dataModel";

/**
 * Worksheet bodies for the Skool Academy. A skill drafts Markdown onto the
 * tactic (`worksheetDraft`); when there is none, a scaffold around the
 * tactic's own words is used and marked as such. Both become the HTML that
 * Drive converts into a native Google Doc.
 */
export type WorksheetRow = Pick<
  Doc<"xTactics">,
  "tacticId" | "text" | "source" | "pillar" | "worksheetDraft"
>;

export const MODULE_BY_PILLAR = {
  clockify: { n: 1, name: "Clockify" },
  paper: { n: 2, name: "Plan on Paper" },
  writing: { n: 3, name: "Writing Clarity" },
  claude: { n: 4, name: "Claude" },
} as const;

const TITLE_MAX = 60;

export function worksheetTitle(row: Pick<WorksheetRow, "tacticId" | "text">): string {
  const text = row.text.trim().replace(/\s+/g, " ");
  const short = text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX - 1).trimEnd()}…` : text;
  return `${row.tacticId} – ${short}`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inline markdown: **bold**, *italic*, `code`, ~~strike~~ (after escaping). */
function inline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
}

/**
 * Small block-level Markdown → HTML: `#`–`###` headings, `-` lists, `1.` lists
 * (indented continuation lines such as `   Answer: ____` stay inside the item),
 * horizontal rules, paragraphs. Enough for the worksheet template; not a
 * general converter.
 */
export function markdownToHtml(md: string): string {
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join("<br>")}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const raw of md.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      flushPara();
      closeList();
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (/^(---|\*\*\*)$/.test(line.trim())) {
      flushPara();
      closeList();
      out.push("<hr>");
      continue;
    }
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    if (ol || ul) {
      flushPara();
      const kind = ol ? "ol" : "ul";
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inline((ol ?? ul)![1])}</li>`);
      continue;
    }
    if (list && /^\s+\S/.test(line)) {
      // continuation of the previous list item
      const last = out.pop()!;
      out.push(last.replace(/<\/li>$/, `<br>${inline(line.trim())}</li>`));
      continue;
    }
    closeList();
    para.push(line.trim());
  }
  flushPara();
  closeList();
  return out.join("\n");
}

export function documentHtml(markdown: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${markdownToHtml(
    markdown
  )}</body></html>`;
}

/** Used when no skill has drafted the worksheet: the tactic's words plus blanks, flagged for Matthew. */
export function worksheetScaffold(row: WorksheetRow): string {
  const m = MODULE_BY_PILLAR[row.pillar];
  return [
    `# ${row.text.trim()}`,
    "",
    `Module ${m.n} · ${m.name} · tactic ${row.tacticId}`,
    "",
    "**What you will finish:** [Matthew: the artifact the member leaves with]",
    "",
    "## What this is",
    "",
    row.text.trim(),
    "",
    `*Source: ${row.source}*`,
    "",
    "[Matthew: this worksheet was scaffolded from the tactic alone. Add your words, or run /skool-worksheet to draft it from the transcripts.]",
    "",
    "## Do this",
    "",
    "1. Where does this show up in your week right now?",
    "   Answer: ________________________________________________",
    "2. What would change if you did it for the next 7 days?",
    "   Answer: ________________________________________________",
    "3. Do it once today. What happened?",
    "   Answer: ________________________________________________",
    "",
    "## You are done when",
    "",
    "- You have done it once and written down what happened.",
    "",
    "## Post your check-in (in the community)",
    "",
    `- The tactic: ${row.tacticId}`,
    "- What happened when I tried it: [___]",
    "",
  ].join("\n");
}

export function worksheetMarkdown(row: WorksheetRow): string {
  const draft = row.worksheetDraft?.trim();
  return draft ? draft : worksheetScaffold(row);
}

export function worksheetHtml(row: WorksheetRow): string {
  return documentHtml(worksheetMarkdown(row));
}
