import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

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

function wrapHtml(subject: string, bodyContent: string): string {
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
    <p style="${emailStyles.footerText}">If this email landed in spam, please mark it as &ldquo;Not Spam&rdquo;.</p>
  </div>
</div>
</body>
</html>`;
}

interface SendResult {
  ok: boolean;
  resendId?: string;
  error?: string;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  fromName: string = "iCodeMyBusiness"
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not configured — skipping email");
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@icodemybusiness.com";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Resend API error (${res.status}): ${text}`);
    return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 200)}` };
  }
  let resendId: string | undefined;
  try {
    const data = (await res.json()) as { id?: string };
    resendId = data.id;
  } catch {
    // Body is optional for our purposes.
  }
  return { ok: true, resendId };
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
    await sendEmail(args.email, subject, html);
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
    await sendEmail(args.email, subject, html);
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
    await sendEmail(adminEmail, subject, html, "iCodeMyBusiness Alert");
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
  },
  handler: async (ctx, args) => {
    const greeting = args.name ? `Hi ${escapeHtml(args.name)},` : "Hi there,";
    const s = args.summary;
    const row = (label: string, text: string) => `
    <p style="${emailStyles.label}">${label}</p>
    <p style="${emailStyles.value}">${escapeHtml(text)}</p>`;

    const bodyContent = `
  <div style="padding:24px 0;">
    <p style="${emailStyles.heading}">${greeting}</p>
    <p style="${emailStyles.paragraph}">
      Here is the write-up from your assessment, in your own words. Keep it
      whether or not we ever work together.
    </p>
    <hr style="${emailStyles.hr}">
    ${row("The problem", s.problem)}
    ${row("What it costs", s.impact)}
    ${row("How long, and what you've tried", s.history)}
    ${row("If nothing changes", s.stakes)}
    ${row("The outcome you want", s.idealOutcome)}
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
      On the call you tell me where the week goes; I tell you straight what I'd
      fix first and whether I'm the right person to fix it. Reply to this email
      any time &mdash; a real person reads every message.
    </p>
  </div>`;

    const subject = "Your discovery assessment — the write-up";
    const html = wrapHtml(subject, bodyContent);
    const result = await sendEmail(args.email, subject, html);

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
