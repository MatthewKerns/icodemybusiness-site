import { defineRateLimits } from "convex-helpers/server/rateLimit";
import {
  EMAIL_CAPTURE_RATE,
  EVENT_CAPTURE_CAPACITY,
  EVENT_CAPTURE_RATE,
  HOUR,
  MINUTE,
} from "./constants";

export const { checkRateLimit, rateLimit, resetRateLimit } = defineRateLimits({
  emailCapture: {
    kind: "fixed window",
    rate: EMAIL_CAPTURE_RATE,
    period: HOUR,
  },
  eventCapture: {
    kind: "token bucket",
    rate: EVENT_CAPTURE_RATE,
    period: MINUTE,
    capacity: EVENT_CAPTURE_CAPACITY,
  },
});
