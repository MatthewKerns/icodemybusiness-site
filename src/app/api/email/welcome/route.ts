import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { WelcomeEmail } from "@/emails/WelcomeEmail";
import {
  withErrorHandler,
  AuthError,
  ValidationError,
  ApiError,
  InternalError,
} from "@/lib/api-error-handler";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await auth();
  if (!userId) {
    throw new AuthError();
  }

  const body = await request.json();
  const { email, name } = body as { email: string; name?: string };

  if (!email || typeof email !== "string") {
    throw new ValidationError("Email is required");
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new ApiError("Email service not configured", 503, "SERVICE_UNAVAILABLE");
  }

  const resend = new Resend(apiKey);
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "hello@icodemybusiness.com";

  const html = await render(WelcomeEmail({ email, name }));

  const { data, error } = await resend.emails.send({
    from: `iCodeMyBusiness <${fromAddress}>`,
    to: [email],
    subject: "Welcome to iCodeMyBusiness — Your Free Tools Are Ready",
    html,
  });

  if (error) {
    throw new InternalError(error.message);
  }

  return NextResponse.json({ id: data?.id });
});
