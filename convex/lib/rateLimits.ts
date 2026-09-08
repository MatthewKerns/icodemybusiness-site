import { defineRateLimits } from "convex-helpers/server/rateLimit";
import {
  CHAT_TURN_CAPACITY,
  CHAT_TURN_RATE,
  EMAIL_CAPTURE_RATE,
  EVENT_CAPTURE_CAPACITY,
  EVENT_CAPTURE_RATE,
  HOUR,
  MINUTE,
  REORG_INTAKE_CAPACITY,
  REORG_INTAKE_RATE,
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
  chatTurn: {
    kind: "token bucket",
    rate: CHAT_TURN_RATE,
    period: HOUR,
    capacity: CHAT_TURN_CAPACITY,
  },
  reorgIntake: {
    kind: "token bucket",
    rate: REORG_INTAKE_RATE,
    period: HOUR,
    capacity: REORG_INTAKE_CAPACITY,
  },
});
