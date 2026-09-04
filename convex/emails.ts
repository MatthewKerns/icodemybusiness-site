import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import {
  createUnsubscribeToken,
  unsubscribeUrl,
} from "./lib/unsubscribeToken";

// Email styles matching WelcomeEmail patterns: black bg, gold accent, Inter font, 580px container
const emailStyles = {
  body: 'background-color:#000000;margin:0;padding:0;font-family:Inter,Helvetica,Arial,sans-serif;',
  container: 'max-width:580px;margin:0 auto;padding:20px;',
  header: 'text-align:center;padding:24px 0;border-bottom:1px solid #222;',
  logo: 'color:#D4AF37;font-size:24px;font-weight:700;margin:0;',
  heading: 'color:#ffffff;font-size:22px;font-weight:600;margin:24px 0 12px;',
  paragraph: 'color:#cccccc;font-size:15px;line-height:1.6;margin:0 0 16px;',
  label: 'color:#999999;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;',
  value: 'color:#ffffff;font-size:15px;margin:0 0 16px;',
  button: 'display:inline-block;background-color:#D4AF37;color:#000000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;',
  footer: 'text-align:center;padding:24px 0;border-top:1px solid #222;margin-top:24px;',
  footerText: 'color:#666666;font-size:12px;margin:0;',
  hr: 'border:none;border-top:1px solid #222;margin:20px 0;',
  listItem: 'color:#cccccc;font-size:15px;line-height:1.6;margin:0 0 8px;padding-left:8px;',
  badge: 'display:inline-block;background-color:rgba(212,175,55,0.15);color:#D4AF37;padding:4px 10px;border-radius:4px;font-size:13px;font-weight:600;',
};

interface FooterOptions {
  /**
   * Present only on marketing sends. Transactional email (the welcome, the
   * discovery report) is something the visitor asked for and deliberately does
   * NOT carry List-Unsubscribe — unsubscribing from a receipt is meaningless.
   */
  unsubscribeUrl?: string;
}

function wrapHtml(
  subject: string,
  bodyContent: string,
  footer: FooterOptions = {}
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${subject}</title></head>
<body style="${emailStyles.body}">
<div style="${emailStyles.container}">
  <div style="${emailStyles.header}">
    <p style="${emailStyles.logo}">iCodeMyBusiness</p>
  </div>
  ${bodyContent}
  <div style="${emailStyles.footer}">
    <p style="${emailStyles.footerText}">&copy; ${new Date().getFullYear()} iCodeMyBusiness. All rights reserved.</p>
    ${mailingAddressHtml()}
    <p style="${emailStyles.footerText}">If this email landed in spam, please mark it as &ldquo;Not Spam&rdquo;.</p>
    ${
      footer.unsubscribeUrl
        ? `<p style="${emailStyles.footerText}"><a href="${footer.unsubscribeUrl}" style="color:#666666;">Unsubscribe</a></p>`
        : ""
    }
  </div>
</div>
</body>
</html>`;
}

/**
 * CAN-SPAM requires a valid physical postal address in commercial email.
 * MAILING_ADDRESS is Matthew's to supply (docs/matthew-story-intake.md F5) —
 * an agent inventing one would be a legal defect, not a copy nit. When it is
 * absent the footer omits it and `sendSequenceStep` refuses to send at all.
 */
function mailingAddressHtml(): string {
  const address = process.env.MAILING_ADDRESS;
  if (!address) return "";
  return `<p style="${emailStyles.footerText}">${escapeHtml(address)}</p>`;
}

interface SendResult {
  ok: boolean;
  resendId?: string;
  error?: string;
  /** HTTP status from Resend. 4xx is permanent; 5xx and network errors retry. */
  status?: number;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  /** Custom headers, e.g. List-Unsubscribe. Resend passes these through. */
  headers?: Record<string, string>;
  /** Resend de-duplicates on this for 24h — belt-and-braces over our own ledger. */
  idempotencyKey?: string;
  tags?: { name: string; value: string }[];
}

async function sendEmail(opts: SendEmailOptions): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not configured — skipping email");
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "matthew@icodemybusiness.com";
  const fromName = opts.fromName ?? "iCodeMyBusiness";

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (opts.idempotencyKey) {
    requestHeaders["Idempotency-Key"] = opts.idempotencyKey.slice(0, 256);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.headers ? { headers: opts.headers } : {}),
      ...(opts.tags ? { tags: opts.tags } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Resend API error (${res.status}): ${text}`);
    return {
      ok: false,
      status: res.status,
      error: `Resend ${res.status}: ${text.slice(0, 200)}`,
    };
  }
  let resendId: string | undefined;
  try {
    const data = (await res.json()) as { id?: string };
    resendId = data.id;
  } catch {
    // Body is optional for our purposes.
  }
  return { ok: true, status: res.status, resendId };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Minimal markdown → HTML for emailed deliverables (headings, bullets, bold).
function mdToHtml(md: string): string {
  const lines = escapeHtml(md).split("\n");
  const out: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bold = (s: string) =>
      s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    if (/^#{1,3}\s+/.test(line)) {
      closeList();
      out.push(
        `<p style="${emailStyles.label}">${bold(line.replace(/^#{1,3}\s+/, ""))}</p>`
      );
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        out.push('<ul style="margin:0 0 16px;padding-left:20px;">');
        inList = true;
      }
      out.push(
        `<li style="${emailStyles.listItem}">${bold(line.replace(/^[-*]\s+/, ""))}</li>`
      );
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      out.push(`<p style="${emailStyles.paragraph}">${bold(line)}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}

// HUBSPOT INTEGRATION POINT: after sending booking email, sync deal stage to "discovery_call_scheduled" in HubSpot

// Follow-up email for "Custom E-Commerce Tools Set" applications — delivers the
// free-value deliverable drafted in the background (see intakeProcessor.ts).
export const sendEcommerceFollowupEmail = internalAction({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    freeValue: v.string(),
  },
  handler: async (_ctx, args) => {
    const greeting = args.name ? `Hi ${args.name},` : "Hi there,";
    const bodyContent = `
  <div style="padding:24px 0;">
    <p style="${emailStyles.heading}">${greeting}</p>
    <p style="${emailStyles.paragraph}">
      Thanks for telling us about your store. Here&rsquo;s a head start &mdash;
      your top automation opportunities, on us:
    </p>
    <hr style="${emailStyles.hr}">
    ${mdToHtml(args.freeValue)}
    <hr style="${emailStyles.hr}">
    <p style="${emailStyles.paragraph}">
      We&rsquo;re putting together a tailored set of AI tools for your store and
      will follow up with next steps. Just reply to this email anytime &mdash; a
      real human reads every message.
    </p>
  </div>`;
    const subject =
      "Your e-commerce automation opportunities — from iCodeMyBusiness";
    const html = wrapHtml(subject, bodyContent);
    await sendEmail({ to: args.email, subject, html });
  },
});

export const sendCalendlyBookingEmail = internalAction({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    painPoints: v.optional(v.array(v.string())),
    calendlyUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const greeting = args.name ? `Hi ${args.name},` : "Hi there,";

    let painPointsHtml = "";
    if (args.painPoints && args.painPoints.length > 0) {
      const items = args.painPoints
        .slice(0, 3)
        .map((p) => `<li style="${emailStyles.listItem}">${p}</li>`)
        .join("");
      painPointsHtml = `
        <p style="${emailStyles.paragraph}">Based on our conversation, here&rsquo;s what we identified:</p>
        <ul style="margin:0 0 20px;padding-left:20px;">${items}</ul>`;
    }

    const bodyContent = `
  <div style="padding:24px 0;">
    <p style="${emailStyles.heading}">${greeting}</p>
    <p style="${emailStyles.paragraph}">
      Thanks for chatting with Alex, our AI assistant. Based on what you shared,
      a quick discovery call is the best next step to map out a solution tailored to your business.
    </p>
    ${painPointsHtml}
    <p style="${emailStyles.paragraph}">
      In a 30-minute discovery call, we&rsquo;ll dig into the specifics and outline a clear path forward &mdash;
      no pressure, just clarity.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${args.calendlyUrl}" style="${emailStyles.button}">Book Your Discovery Call</a>
    </div>
    <p style="${emailStyles.paragraph}" style="color:#999;">
      This link will take you to our Calendly page where you can pick a time that works for you.
    </p>
  </div>`;

    const subject = "Your Custom Discovery Call — Book Now";
    const html = wrapHtml(subject, bodyContent);
    await sendEmail({ to: args.email, subject, html });
  },
});

export const sendRoadmapNotification = internalAction({
  args: {
    visitorEmail: v.string(),
    visitorName: v.optional(v.string()),
    summary: v.optional(v.string()),
    painPoints: v.optional(v.array(v.string())),
    qualificationScore: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    conversationId: v.string(),
    adminUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (!adminEmail) {
      console.error("ADMIN_NOTIFICATION_EMAIL not configured — skipping notification");
      return;
    }

    const visitorDisplay = args.visitorName ?? args.visitorEmail;
    const durationDisplay = args.durationSeconds
      ? `${Math.floor(args.durationSeconds / 60)}m ${args.durationSeconds % 60}s`
      : "N/A";

    let painPointsHtml = "";
    if (args.painPoints && args.painPoints.length > 0) {
      const items = args.painPoints
        .map((p) => `<li style="${emailStyles.listItem}">${p}</li>`)
        .join("");
      painPointsHtml = `
        <p style="${emailStyles.label}">PAIN POINTS</p>
        <ul style="margin:0 0 20px;padding-left:20px;">${items}</ul>`;
    }

    const scoreHtml = args.qualificationScore
      ? `<p style="${emailStyles.label}">QUALIFICATION SCORE</p>
         <p style="${emailStyles.value}"><span style="${emailStyles.badge}">${args.qualificationScore}/5</span></p>`
      : "";

    const bodyContent = `
  <div style="padding:24px 0;">
    <p style="${emailStyles.heading}">New Roadmap Request</p>
    <hr style="${emailStyles.hr}">

    <p style="${emailStyles.label}">VISITOR</p>
    <p style="${emailStyles.value}">${args.visitorName ?? "Unknown"} &mdash; ${args.visitorEmail}</p>

    <p style="${emailStyles.label}">CONVERSATION DURATION</p>
    <p style="${emailStyles.value}">${durationDisplay}</p>

    ${scoreHtml}

    ${args.summary ? `<p style="${emailStyles.label}">SUMMARY</p><p style="${emailStyles.paragraph}">${args.summary}</p>` : ""}

    ${painPointsHtml}

    <div style="text-align:center;margin:28px 0;">
      <a href="${args.adminUrl}" style="${emailStyles.button}">View in Dashboard</a>
    </div>
  </div>`;

    const subject = `New Roadmap Request — ${visitorDisplay}`;
    const html = wrapHtml(subject, bodyContent);
    await sendEmail({ to: adminEmail, subject, html, fromName: "iCodeMyBusiness Alert" });
  },
});

// Discovery assessment report — the visitor-facing summary drafted in the
// background (see discoveryProcessor.ts). Records the outcome in emailSends so
// delivery can be audited from the database, then marks the assessment.
export const sendDiscoveryReportEmail = internalAction({
  args: {
    assessmentId: v.id("assessments"),
    email: v.string(),
    name: v.optional(v.string()),
    summary: v.object({
      problem: v.string(),
      impact: v.string(),
      history: v.string(),
      stakes: v.string(),
      idealOutcome: v.string(),
      recommendedPath: v.string(),
      thisWeekAction: v.string(),
    }),
    pathName: v.string(),
    pathWhat: v.string(),
    bookingUrl: v.string(),
    /** True when the model was unavailable and the summary is the raw answers. */
    degraded: v.optional(v.boolean()),
    /**
     * The visitor's own verbatim phrases, captured on every assessment turn
     * and — until now — never shown back to them, even though the drafting
     * prompt calls this deliverable "a mirror held up to what they said"
     * (convex/discoveryProcessor.ts). Optional so an in-flight caller that
     * predates this argument still sends a valid report.
     */
    quotes: v.optional(v.array(v.string())),
    /** e.g. "$4,000 / month" — rendered only when the visitor gave a figure. */
    costLabel: v.optional(v.string()),
    /** What they corrected when the recap got something wrong. */
    correction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const greeting = args.name ? `Hi ${escapeHtml(args.name)},` : "Hi there,";
    const intro = args.degraded
      ? "Here are your answers from the assessment, exactly as you gave them. My read on them comes on the call."
      : "Here is the write-up from your assessment.";
    const s = args.summary;
    const row = (label: string, text: string) => `
    <p style="${emailStyles.label}">${label}</p>
    <p style="${emailStyles.value}">${escapeHtml(text)}</p>`;

    // Quotes are stored deliberately un-normalized so they stay verbatim, which
    // means a quote can contain the newlines the visitor typed into a textarea
    // (and routinely does on the degraded path). Collapse whitespace for HTML
    // only — the words themselves are never edited.
    const quotes = (args.quotes ?? [])
      .map((q) => q.replace(/\s+/g, " ").trim())
      .filter((q) => q.length > 0);

    const quotesBlock = quotes.length
      ? `
    <div style="border:1px solid #222;border-radius:8px;padding:16px 18px;margin:0 0 20px;">
      <p style="${emailStyles.label}">In your own words</p>
      <ul style="margin:0;padding-left:18px;">
        ${quotes.map((q) => `<li style="${emailStyles.listItem}">&ldquo;${escapeHtml(q)}&rdquo;</li>`).join("")}
      </ul>
    </div>`
      : "";

    const costBlock = args.costLabel
      ? `
    <p style="${emailStyles.label}">Current Number Estimate</p>
    <p style="${emailStyles.value}"><span style="${emailStyles.badge}">${escapeHtml(args.costLabel)}</span></p>`
      : "";

    const correctionBlock = args.correction
      ? `
    <p style="${emailStyles.label}">You told me the recap missed this</p>
    <p style="${emailStyles.value}">${escapeHtml(args.correction)}</p>`
      : "";

    const bodyContent = `
  <div style="padding:24px 0;">
    <p style="${emailStyles.heading}">${greeting}</p>
    <p style="${emailStyles.paragraph}">${intro}</p>
    ${quotesBlock}
    <hr style="${emailStyles.hr}">
    ${row("The problem", s.problem)}
    ${row("What it costs", s.impact)}
    ${costBlock}
    ${row("How long, and what you've tried", s.history)}
    ${row("If nothing changes", s.stakes)}
    ${row("The outcome you want", s.idealOutcome)}
    ${correctionBlock}
    <hr style="${emailStyles.hr}">
    <p style="${emailStyles.label}">Where I'd start</p>
    <p style="${emailStyles.value}"><span style="${emailStyles.badge}">${escapeHtml(args.pathName)}</span></p>
    <p style="${emailStyles.paragraph}">${escapeHtml(args.pathWhat)}</p>
    <p style="${emailStyles.label}">One thing you can do this week</p>
    <p style="${emailStyles.paragraph}">${escapeHtml(s.thisWeekAction)}</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${args.bookingUrl}" style="${emailStyles.button}">Book an intro call</a>
    </div>
    <p style="${emailStyles.paragraph}">
      On the call you tell me where the week goes. I'll tell you if I think we
      are not a good fit and why. And if we are a good fit, I'll tell you how I
      recommend we get started. The more you tell our assessment tools, the more
      of your context I bring. Reply to this email any time &mdash; I read every
      reply.
    </p>
  </div>`;

    const subject = "Your discovery assessment — the write-up";
    const html = wrapHtml(subject, bodyContent);
    const result = await sendEmail({ to: args.email, subject, html });

    // Audit row (only annotates addresses already captured as leads).
    await ctx.runMutation(api.emailSends.record, {
      to: args.email,
      template: "discovery-report",
      subject,
      status: result.ok ? "sent" : "failed",
      resendId: result.resendId,
      error: result.error,
    });

    if (result.ok) {
      await ctx.runMutation(internal.discoveryAssessments.internalMarkEmailSent, {
        assessmentId: args.assessmentId,
      });
    } else {
      await ctx.runMutation(internal.discoveryAssessments.internalSetError, {
        assessmentId: args.assessmentId,
        error: `Report email failed: ${result.error ?? "unknown"}`,
      });
    }
  },
});


/**
 * Send one step of a nurture sequence.
 *
 * Only ever called by `sequenceEngine.deliverStep`, which has already claimed
 * the step inside a transaction that ran the suppression + consent gate. This
 * action therefore does not re-check eligibility; it renders, sends, and
 * reports the outcome back so the ledger and the audit row stay honest.
 *
 * It refuses to send when a compliance requirement is missing rather than
 * shipping a non-compliant email: no unsubscribe secret, no postal address, or
 * no authored copy all fail closed.
 */
export const sendSequenceStep = internalAction({
  args: {
    sendId: v.id("sequenceStepSends"),
    dedupeKey: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    track: v.string(),
    stepKey: v.string(),
    subject: v.string(),
    assessmentId: v.optional(v.id("assessments")),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    const fail = async (error: string, permanent = true) => {
      await ctx.runMutation(internal.sequenceEngine.completeStep, {
        sendId: args.sendId,
        ok: false,
        error,
        permanent,
      });
      return { ok: false, error };
    };

    const secret = process.env.UNSUBSCRIBE_SECRET;
    if (!secret) {
      // A marketing email with no working opt-out is not one we may send.
      return await fail("UNSUBSCRIBE_SECRET not configured");
    }
    if (!process.env.MAILING_ADDRESS) {
      // CAN-SPAM requires a physical postal address. Matthew supplies it
      // (docs/matthew-story-intake.md F5); we do not invent one.
      return await fail("MAILING_ADDRESS not configured");
    }
    if (!args.subject) {
      // Unauthored copy. `sequenceTracks.isStepAuthored` should have stopped
      // this upstream; failing here too means a placeholder can never reach a
      // visitor even if that check is bypassed.
      return await fail(`Step ${args.track}:${args.stepKey} has no authored copy`);
    }

    const token = await createUnsubscribeToken(args.email, secret);
    const unsubUrl = unsubscribeUrl(
      process.env.CONVEX_SITE_URL ?? "",
      token
    );

    // Body copy is authored per step; until the story intake is answered no
    // step is authored, so this action is unreachable in production.
    const bodyContent = `
  <div style="padding:24px 0;">
    <p style="${emailStyles.heading}">${args.name ? `Hi ${escapeHtml(args.name)},` : "Hi there,"}</p>
  </div>`;

    const html = wrapHtml(args.subject, bodyContent, {
      unsubscribeUrl: unsubUrl,
    });

    const result = await sendEmail({
      to: args.email,
      subject: args.subject,
      html,
      fromName: "Matthew Kerns",
      idempotencyKey: args.dedupeKey,
      headers: {
        // Both are required together by Gmail/Yahoo bulk-sender rules.
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [
        { name: "track", value: args.track },
        { name: "step", value: args.stepKey },
      ],
    });

    // 4xx means the address or request is bad — retrying will never help.
    const permanent =
      result.status !== undefined && result.status >= 400 && result.status < 500;

    await ctx.runMutation(internal.sequenceEngine.completeStep, {
      sendId: args.sendId,
      ok: result.ok,
      resendId: result.resendId,
      subject: args.subject,
      error: result.error,
      permanent: result.ok ? undefined : permanent,
    });

    // Audit row, same contract every other send in this file follows.
    await ctx.runMutation(api.emailSends.record, {
      to: args.email,
      template: `seq:${args.track}:${args.stepKey}`,
      subject: args.subject,
      status: result.ok ? "sent" : "failed",
      resendId: result.resendId,
      error: result.error,
    });

    return { ok: result.ok, error: result.error };
  },
});
