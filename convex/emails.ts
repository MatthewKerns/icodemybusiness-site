import { v } from "convex/values";
import { internalAction } from "./_generated/server";

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

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  fromName: string = "iCodeMyBusiness"
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not configured — skipping email");
    return;
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
  }
}

// HUBSPOT INTEGRATION POINT: after sending booking email, sync deal stage to "discovery_call_scheduled" in HubSpot

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
