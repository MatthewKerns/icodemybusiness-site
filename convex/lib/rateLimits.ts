import { defineRateLimits } from "convex-helpers/server/rateLimit";

const HOUR = 60 * 60 * 1000;

export const { checkRateLimit, rateLimit, resetRateLimit } = defineRateLimits({
  emailCapture: {
    kind: "fixed window",
    rate: 3,
    period: HOUR,
  },
});
