/**
 * Lints one cold email step against the copy rules in coldoutboundskills
 * (campaign-copywriting, 04-sequence-structure, spam-word-checker — MIT,
 * (c) 2026 GrowthEngineX; THIRD_PARTY_NOTICES.md). The word lists are the
 * repo's, verbatim.
 *
 * One deliberate difference: the repo bans its 32 single words outright
 * ("new", "now", "get", "home", "sales"…), which flags most plain English.
 * Here single words are warnings and phrases are failures, so the list stays
 * useful instead of being ignored.
 */

export type Severity = "fail" | "warn";

export interface LintIssue {
  severity: Severity;
  where: "subject" | "body";
  rule: string;
  message: string;
}

const SINGLE_WORDS = [
  "get", "bank", "credit", "access", "open", "compare", "problem", "now", "billing", "deal",
  "finance", "financial", "claims", "insurance", "mortgage", "soon", "new", "performance",
  "freedom", "home", "sales", "medical", "urgent", "life", "marketing", "investment",
  "diagnostics", "friend", "cash", "invoice", "extra", "purchase",
];

const SHORT_PHRASES = [
  "off chance", "one time", "all good", "following up here", "last note from me here",
  "great fit", "bumping this once", "just following up once", "circle back",
  "one more quick follow-up", "keep this open", "compare notes", "compare notes live",
  "appreciate the reply",
];

const PROMOTIONAL = [
  "$$$", "50% off", "100% guaranteed", "100% free", "100% off", "100% satisfied", "access now",
  "act fast", "act immediately", "act now", "action required", "affordable deal", "amazing",
  "amazing deal", "amazing offer", "apply here", "apply now", "avoid bankruptcy", "bargain",
  "best bargain", "best deal", "best offer", "best price", "best rates", "big profit", "bonus",
  "buy now", "buy today", "call now", "can't live without", "cash bonus", "cash out",
  "claim now", "claim your discount", "click", "click below", "click here", "click this link",
  "contact us immediately", "deal ending soon", "discount", "don't delete", "double your money",
  "double your wealth", "drastically reduced", "earn", "earn cash", "earn extra income",
  "earn money", "easy income", "exclusive deal", "expires today", "extra cash", "extra income",
  "fantastic", "fantastic offer", "fast cash", "final call", "for free", "free access",
  "free consultation", "free gift", "free membership", "free money", "free quote", "free trial",
  "full refund", "get it now", "get out of debt", "get started now", "giveaway", "great news",
  "guaranteed deposit", "guaranteed results", "hurry up", "important information",
  "immediately", "increase revenue", "increase sales", "incredible deal", "instant earnings",
  "instant income", "instant savings", "investment advice", "join millions", "limited time",
  "lowest price", "make money", "million dollars", "money-back guarantee", "must read",
  "no catch", "no cost", "no obligation", "no strings attached", "once in a lifetime", "only $",
  "only available here", "order now", "order today", "please read", "price protection",
  "profits", "promise", "pure profit", "quote", "risk-free", "satisfaction guaranteed", "save $",
  "save big money", "save up to", "sign up free", "special invitation", "special offer",
  "special promotion", "supplies are limited", "take action now", "the best",
  "this won't last", "thousands", "time limited", "today", "top urgent", "trial",
  "unbeatable offer", "unbelievable", "unlimited", "urgent", "what are you waiting for?",
  "while supplies last", "why pay more?", "will not believe", "winner announced", "wonderful",
  "you are a winner", "you will not believe your eyes",
];

const PHISHING = [
  "access your account", "account update", "activate now", "change password", "click to verify",
  "confirm your details", "confidential information", "data breach", "download now",
  "final notice", "important update", "immediate action required", "install now",
  "last warning", "log in now", "new login detected", "password reset",
  "payment details needed", "phishing alert", "security breach", "security update",
  "update account", "verify identity", "warning message",
];

const BLACKLISTED = [
  "100% natural", "adult content", "bet now", "blackjack", "casino bonus", "cure for",
  "diet pill", "doctor recommended", "fat burner", "fast weight loss", "free chips",
  "free spins", "gamble online", "guaranteed weight loss", "jackpot", "lottery winner",
  "medical breakthrough", "miracle cure", "natural remedy", "no prescription needed",
  "online betting", "online casino", "online pharmacy", "pain relief", "poker tournament",
  "prescription drugs", "reverse aging", "risk-free bet", "safe and effective",
  "scientifically proven", "secret formula", "slots jackpot", "spin to win", "vip offer",
  "weight loss", "winning numbers", "xxx",
];

/** campaign-copywriting: phrases that mark an email as a template. */
const BANNED_PHRASES = [
  "i hope this email finds you well", "i wanted to reach out", "i hope you're doing well",
  "just wanted to touch base", "our solution", "i wanted to show you",
  "would love to schedule", "let's hop on a call", "can i get 15 minutes on your calendar",
  "following up on my last note", "one more thought", "just checking in",
];

/** spam-word-checker: a closeout may not promise to stop on silence. */
const SILENCE_CLOSEOUTS = [
  "take silence as a no", "read no reply as a pass", "assume no response means no interest",
  "if i don't hear back", "happy to stay out of the way",
];

const BANNED_SUBJECTS = ["curious", "quick question"];

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-phrase match: bounded by non-word characters where the phrase has word edges. */
function containsPhrase(haystack: string, phrase: string): boolean {
  const start = /^\w/.test(phrase) ? "(?<![\\w])" : "";
  const end = /\w$/.test(phrase) ? "(?![\\w])" : "";
  return new RegExp(start + escapeRe(phrase) + end, "i").test(haystack);
}

/** Words in a body, with spintax and merge variables counted once each. */
export function countWords(text: string): number {
  const plain = text
    .replace(/\{\{[^}]*\}\}/g, "x")
    .replace(/\{([^{}|]*)\|[^{}]*\}/g, "$1")
    .replace(/%signature%/gi, "");
  return plain.split(/\s+/).filter(Boolean).length;
}

export interface LintInput {
  subject: string;
  body: string;
  /** 0-based position in the sequence. */
  stepIndex: number;
}

export function lintStep({ subject, body, stepIndex }: LintInput): LintIssue[] {
  const issues: LintIssue[] = [];
  const add = (severity: Severity, where: "subject" | "body", rule: string, message: string) =>
    issues.push({ severity, where, rule, message });

  const s = subject.trim();
  const b = body.trim();

  // --- Subject --------------------------------------------------------------
  if (stepIndex === 1) {
    if (s) add("warn", "subject", "thread", "Email 2 threads under email 1: leave its subject blank.");
  } else if (!s) {
    add("fail", "subject", "missing", "This step starts a new thread and needs a subject.");
  } else {
    const words = s.replace(/\{\{[^}]*\}\}/g, "x").split(/\s+/).filter(Boolean).length;
    if (words > 4) add("warn", "subject", "length", `Subject is ${words} words. Aim for 2 to 4, unless the subject carries the whole offer.`);
    for (const banned of BANNED_SUBJECTS) {
      if (s.toLowerCase().replace(/[?.!]/g, "").trim() === banned) {
        add("fail", "subject", "overused", `"${s}" is an overused subject line.`);
      }
    }
  }

  // --- Body -----------------------------------------------------------------
  if (!b) {
    add("fail", "body", "missing", "This step has no body.");
    return issues;
  }
  const words = countWords(b);
  if (words > 125) add("fail", "body", "length", `${words} words. Keep it to 50-90 (125 at most with real personalization).`);
  else if (words > 90) add("warn", "body", "length", `${words} words. Aim for 50-90.`);
  else if (words < 50) add("warn", "body", "length", `${words} words. Aim for 50-90.`);

  if (/^\s*(hi|hello|hey)\b/i.test(b)) {
    add("warn", "body", "greeting", "Open with the first name alone, with no Hi / Hello / Hey in front of it.");
  }
  const links = b.match(/https?:\/\/\S+/gi)?.length ?? 0;
  if (stepIndex === 0 && links > 0) add("fail", "body", "links", "No links in the first email.");
  else if (links > 1) add("warn", "body", "links", `${links} links. Keep it to one at most.`);

  for (const [where, text] of [["subject", s], ["body", b]] as const) {
    if (!text) continue;
    if (text.includes("—")) add("fail", where, "em-dash", "Contains an em dash. Use a comma or a full stop.");
    if (/!{2,}/.test(text)) add("fail", where, "exclamation", "More than one exclamation mark in a row.");
    const caps = text
      .replace(/\{\{[^}]*\}\}/g, "")
      .match(/\b[A-Z]{4,}\b/g);
    if (caps) add("warn", where, "caps", `All-caps word: ${Array.from(new Set(caps)).slice(0, 3).join(", ")}.`);
    if (/\{\{\s*company\s*\}\}/i.test(text)) add("fail", where, "variable", "Use {{company_name}}, not {{company}}.");
    if (/(?<!\{)\{[a-z_]+\}(?!\})/.test(text)) add("fail", where, "variable", "Merge variables need double braces: {{first_name}}.");

    for (const p of BANNED_PHRASES) if (containsPhrase(text, p)) add("fail", where, "template-phrase", `"${p}" reads as a template.`);
    for (const p of SILENCE_CLOSEOUTS) if (containsPhrase(text, p)) add("fail", where, "closeout", `"${p}": don't promise to stop on silence. Ask for a one-word reply instead.`);
    for (const p of SHORT_PHRASES) if (containsPhrase(text, p)) add("fail", where, "spam-phrase", `Spam-filter phrase: "${p}".`);
    for (const p of PROMOTIONAL) if (containsPhrase(text, p)) add("fail", where, "promotional", `Promotional wording: "${p}".`);
    for (const p of PHISHING) if (containsPhrase(text, p)) add("fail", where, "phishing", `Reads like a security warning: "${p}".`);
    for (const p of BLACKLISTED) if (containsPhrase(text, p)) add("fail", where, "blacklisted", `Blacklisted category: "${p}".`);

    const hits = SINGLE_WORDS.filter((w) => containsPhrase(text, w));
    if (hits.length > 0) add("warn", where, "spam-word", `Words spam filters weigh: ${hits.join(", ")}.`);
  }

  // The same phrase can sit in more than one list ("urgent"); report it once.
  const seen = new Set<string>();
  return issues.filter((i) => {
    const key = `${i.where}|${i.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Sequence-level checks — 04-sequence-structure. */
export function lintSequence(steps: { delayDays: number }[]): string[] {
  const notes: string[] = [];
  if (steps.length === 0) return ["No steps yet. A cold sequence is 4 emails."];
  if (steps.length < 3) notes.push(`${steps.length} step${steps.length === 1 ? "" : "s"}. Fewer than 3 leaves replies on the table; 4 is the usual length.`);
  if (steps.length > 4) notes.push(`${steps.length} steps. More than 4 starts to feel like spam.`);
  steps.forEach((step, i) => {
    if (i > 0 && step.delayDays < 2) notes.push(`Email ${i + 1} goes ${step.delayDays} day(s) after the one before. Leave 3 to 4 days.`);
  });
  return notes;
}
