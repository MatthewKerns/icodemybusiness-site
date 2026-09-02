import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { WelcomeEmail } from "@/emails/WelcomeEmail";
import { api } from "../../../../../convex/_generated/api";
import { getConvexClient } from "@/lib/convex-client";
import {
  withErrorHandler,
  ValidationError,
  ApiError,
  InternalError,
} from "@/lib/api-error-handler";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { email: rawEmail, name } = body as { email: string; name?: string };

  if (!rawEmail || typeof rawEmail !== "string") {
    throw new ValidationError("Email is required");
  }
  const email = rawEmail.trim().toLowerCase();

  // No Clerk session required — the free-tools capture is email-only. Gate the
  // send on an actual lead record so this can't be used as an open relay to
  // spam arbitrary addresses; createLead already rate-limits how fast new
  // leads (and therefore new sends) can be created per session.
  const convex = getConvexClient();
  const lead = await convex.query(api.leads.getLeadByEmail, { email });
  if (!lead) {
    throw new ValidationError("No matching lead — capture the email first");
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new ApiError("Email service not configured", 503, "SERVICE_UNAVAILABLE");
  }

  const resend = new Resend(apiKey);
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "hello@icodemybusiness.com";

  const subject = "Welcome to iCodeMyBusiness — Your Free Tools Are Ready";
  const html = await render(WelcomeEmail({ email, name }));

  const { data, error } = await resend.emails.send({
    from: `iCodeMyBusiness <${fromAddress}>`,
    to: [email],
    subject,
    html,
  });

  // Persist the outcome (success or failure) so delivery is auditable from the
  // database. Best-effort: a logging failure must never fail the request.
  await convex
    .mutation(api.emailSends.record, {
      to: email,
      template: "welcome",
      subject,
      status: error ? "failed" : "sent",
      resendId: data?.id,
      error: error?.message,
    })
    .catch((e: unknown) => console.error("emailSends.record failed:", e));

  if (error) {
    throw new InternalError(error.message);
  }

  return NextResponse.json({ id: data?.id });
});
