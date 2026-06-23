import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { api } from "../../../../../../convex/_generated/api";
import { getConvexClient } from "@/lib/convex-client";
import { Top3IssuesSummaryEmail } from "@/emails/Top3IssuesSummaryEmail";
import {
  withErrorHandler,
  ValidationError,
  NotFoundError,
  InternalError,
  ApiError,
} from "@/lib/api-error-handler";
import {
  captureServerEvent,
  flushServerAnalytics,
} from "@/lib/posthog-server";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CompleteBody {
  sessionId: string;
  email: string;
  name?: string;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = (await request.json()) as CompleteBody;
  if (!body.sessionId) throw new ValidationError("Missing sessionId");
  if (!body.email || typeof body.email !== "string") {
    throw new ValidationError("Missing email");
  }

  const convex = getConvexClient();
  const session = await convex.query(api.agentSessions.getBySessionId, {
    sessionId: body.sessionId,
  });
  if (!session) throw new NotFoundError("Session not found");

  const issues = session.top3Issues ?? [];
  if (issues.length < 1) {
    throw new ValidationError("No issues drafted yet");
  }

  const leadId = await convex.mutation(api.leads.createLead, {
    email: body.email,
    name: body.name,
    source: "top3-agent",
    sessionId: body.sessionId,
  });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    throw new ApiError("Email service not configured", 503, "SERVICE_UNAVAILABLE");
  }

  const resend = new Resend(resendKey);
  const fromAddress =
    process.env.RESEND_FROM_EMAIL ?? "hello@icodemybusiness.com";

  const html = await render(
    Top3IssuesSummaryEmail({
      email: body.email,
      name: body.name,
      issues,
    })
  );

  const { error } = await resend.emails.send({
    from: `iCodeMyBusiness <${fromAddress}>`,
    to: [body.email],
    subject: "Your Top 3 Business Issues — Summary",
    html,
  });
  if (error) throw new InternalError(error.message);

  await convex.mutation(api.agentSessions.completeSession, {
    sessionId: body.sessionId,
    visitorEmail: body.email,
    visitorName: body.name,
    top3Issues: issues,
    leadId,
  });

  captureServerEvent({
    distinctId: body.email,
    event: ANALYTICS_EVENTS.TOP3_COMPLETED,
    properties: { issueCount: issues.length },
  });
  captureServerEvent({
    distinctId: body.email,
    event: ANALYTICS_EVENTS.LEAD_CAPTURED,
    properties: { source: "top3-agent" },
  });
  await flushServerAnalytics();

  return NextResponse.json({ ok: true, leadId });
});
