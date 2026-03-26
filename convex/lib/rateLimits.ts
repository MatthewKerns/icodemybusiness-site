import { defineRateLimits } from "convex-helpers/server/rateLimit";
import { EMAIL_CAPTURE_RATE, HOUR } from "./constants";

export const { checkRateLimit, rateLimit, resetRateLimit } = defineRateLimits({
  emailCapture: {
    kind: "fixed window",
    rate: EMAIL_CAPTURE_RATE,
    period: HOUR,
  },
});
