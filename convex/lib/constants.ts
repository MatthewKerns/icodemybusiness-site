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

/**
 * AI reorganization intake. Each request costs a model call, so the bucket is
 * small and refills slowly — generous for a single operator thinking out loud,
 * tight enough that a stuck retry loop cannot run up a bill.
 */
export const REORG_INTAKE_RATE = 20;
export const REORG_INTAKE_CAPACITY = 5;

/**
 * Discovery chat turns, per session. Every turn is a model call we pay for, and
 * nothing bounded them before — a script could run turns for free at our cost.
 *
 * Sized off a real assessment rather than a guess: five questions with up to two
 * drill-downs each is ~15 model turns, plus a few recap corrections — call it 18
 * for an engaged visitor. A token bucket rather than a fixed window, because a
 * fixed window lets someone spend the whole hour's allowance in ten seconds,
 * which is where the cost of an attack actually lands.
 *
 * CAPACITY IS THE NUMBER THAT MATTERS, not the rate. A bucket starts full and
 * refills at `rate`, so capacity is the burst a visitor gets before metering
 * begins — and refill here is ~0.011 turns/second, i.e. nothing on the
 * timescale of one sitting. Capacity 10 was the first guess and it was wrong:
 * a visitor answering briskly does 15 turns in a few minutes and would have
 * been cut off mid-assessment. 20 covers a full assessment with corrections and
 * still leaves a script metered at 40/hour once it is spent.
 */
export const CHAT_TURN_RATE = 40;
export const CHAT_TURN_CAPACITY = 20;
