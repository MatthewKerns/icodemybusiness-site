import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { WelcomeEmail } from "../src/emails/WelcomeEmail";

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured — skipping welcome email");
      return;
    }

    const resend = new Resend(apiKey);
    const fromAddress =
      process.env.RESEND_FROM_EMAIL ?? "hello@icodemybusiness.com";

    try {
      const html = await render(WelcomeEmail({ email: args.email, name: args.name }));

      await resend.emails.send({
        from: `iCodeMyBusiness <${fromAddress}>`,
        to: args.email,
        subject: "Welcome to iCodeMyBusiness — Your Free Tools Are Ready",
        html,
        headers: {
          "X-Priority": "1",
          Importance: "high",
        },
      });
    } catch (error) {
      console.error("Failed to send welcome email:", error);
    }
  },
});
