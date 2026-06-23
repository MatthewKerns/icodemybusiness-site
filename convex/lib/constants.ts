// Lead scoring constants
export const LEAD_SCORE_REFERRAL = 15;
export const LEAD_SCORE_RETELL_AGENT = 12;
export const LEAD_SCORE_YOUTUBE = 10;
export const LEAD_SCORE_DEFAULT = 5;

// Rate limiting constants
export const EMAIL_CAPTURE_RATE = 3;
export const MINUTE = 60 * 1000;
export const HOUR = 60 * 60 * 1000;

// Visitor-event capture: generous per-session token bucket. Curated events are
// user-initiated clicks, so a normal session fires a handful; this only stops
// abusive floods. Excess events are silently dropped, never errored.
export const EVENT_CAPTURE_RATE = 120;
export const EVENT_CAPTURE_CAPACITY = 60;
