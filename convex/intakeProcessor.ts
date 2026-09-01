import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { callClaude } from "./lib/anthropic";

// Background drafting runs in Convex actions (so it continues after the user
// leaves the chat). The Anthropic call itself lives in lib/anthropic.ts, shared
// with the objectives reorganization agent. The model stays pinned here so
// extracting the helper did not change this agent's behaviour.
const MODEL = "claude-opus-4-7";

function contextString(intakeProfile: unknown, messages: { role: string; content: string }[]): string {
  const profile = intakeProfile
    ? `Extracted intake profile (JSON):\n${JSON.stringify(intakeProfile, null, 2)}`
    : "No structured profile was extracted.";
  const transcript = messages
    .map((m) => `${m.role === "user" ? "Owner" : "Agent"}: ${m.content}`)
    .join("\n")
    .slice(0, 12_000);
  return `${profile}\n\n---\nConversation transcript:\n${transcript}`;
}

const PREDRAFT_SYSTEM = `You are an e-commerce automation strategist at iCodeMyBusiness. From a partial intake conversation, write a tight preliminary analysis (max ~250 words) of this seller's biggest automation opportunities: where they're losing time, which workflows are automatable, and the 2-3 highest-leverage "AI VA" agents to build for them. This is an internal working note that a later step will build on — be concrete, cite what they actually said, and never invent numbers.`;

const PROCESS_SYSTEM = `You are an e-commerce automation strategist at iCodeMyBusiness. You are given an intake conversation with an Amazon/e-commerce seller who applied for a "Custom E-Commerce Tools Set" (a bespoke set of AI automations / "AI VAs" built for their store).

Produce a JSON object with EXACTLY two string fields and nothing else:

{
  "freeValue": "<markdown the user receives by email — genuinely useful, no fluff>",
  "internalProposal": "<internal-only next-steps proposal — never shown to the user>"
}

"freeValue": A short, high-value deliverable the seller gets for free now: their top 3 automation opportunities, each with the specific task it removes and the rough time it saves, plus one concrete quick win they can do this week without us. Warm, concise, credible. Do NOT include pricing, contracts, or a sales pitch — earn the next conversation with value.

"internalProposal": Our internal "next steps to working together" plan: the AI VAs we'd build for them (named, scoped), suggested build order, a tiered subscription fit, open questions to resolve on a call, and a qualification read (fit / budget signals / urgency). This is for the team only.

Rules: never invent numbers or facts the seller didn't give — mark gaps as gaps. Output ONLY the JSON object.`;

function parseTwoFields(text: string): { freeValue: string; internalProposal: string } | null {
  // Tolerate ```json fences.
  let body = text.trim();
  const fence = body.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) body = fence[1].trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(body.slice(start, end + 1)) as {
      freeValue?: unknown;
      internalProposal?: unknown;
    };
    const freeValue = typeof parsed.freeValue === "string" ? parsed.freeValue : "";
    const internalProposal =
      typeof parsed.internalProposal === "string" ? parsed.internalProposal : "";
    if (!freeValue && !internalProposal) return null;
    return { freeValue, internalProposal };
  } catch {
    return null;
  }
}

/**
 * Mid-conversation: start analysing as soon as context is rich enough, so the
 * heavy work is partly done by the time the user submits. Stores a working note
 * on the session. Non-blocking — the user keeps chatting.
 */
export const preDraft = internalAction({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const ctxData = await ctx.runQuery(
      internal.agentSessions.internalGetSession,
      { sessionId: args.sessionId }
    );
    if (!ctxData) return;
    const text = await callClaude(
      PREDRAFT_SYSTEM,
      contextString(ctxData.session.intakeProfile, ctxData.messages),
      800,
      MODEL,
    );
    if (text) {
      await ctx.runMutation(internal.agentSessions.internalStorePreDraft, {
        sessionId: args.sessionId,
        preDraft: text,
      });
    }
  },
});

/**
 * On submit: finalize the free-value deliverable (emailed to the user) and the
 * internal proposal (admin-only), then send the follow-up email.
 */
export const processApplication = internalAction({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(
      internal.applications.internalGetApplication,
      { applicationId: args.applicationId }
    );
    if (!data) return;
    const { app, preDraft: pre } = data;

    let userInput = contextString(app.intakeProfile, []);
    if (pre) userInput += `\n\n---\nPreliminary analysis (from mid-chat):\n${pre}`;

    const out = await callClaude(PROCESS_SYSTEM, userInput, 2500, MODEL);
    const parsed = out ? parseTwoFields(out) : null;

    // Resilient fallback so the user-facing flow works even if drafting fails
    // (e.g. ANTHROPIC_API_KEY missing in Convex env). Admin can draft manually.
    const freeValue =
      parsed?.freeValue ||
      "Thanks for sharing where your store is spending time. We're putting together your top automation opportunities and will follow up shortly with specifics.";
    const internalProposal =
      parsed?.internalProposal ||
      "[Auto-draft unavailable — draft the next-steps proposal manually from the intake profile and transcript.]";

    if (!out) {
      await ctx.runMutation(internal.applications.internalSetError, {
        applicationId: args.applicationId,
        error: "Background drafting unavailable (check Convex ANTHROPIC_API_KEY).",
      });
    }

    await ctx.runMutation(internal.applications.internalStoreResults, {
      applicationId: args.applicationId,
      freeValue,
      internalProposal,
    });

    // Send the follow-up email with the free value.
    await ctx.scheduler.runAfter(0, internal.emails.sendEcommerceFollowupEmail, {
      email: app.email,
      name: app.name,
      freeValue,
    });
    await ctx.runMutation(internal.applications.internalMarkFollowupSent, {
      applicationId: args.applicationId,
    });
  },
});
