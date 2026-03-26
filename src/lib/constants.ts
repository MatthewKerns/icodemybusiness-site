export const ATTRIBUTION_COOKIE_SOURCE = "icmb_source";
export const ATTRIBUTION_COOKIE_VARIANT = "icmb_variant";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const VALID_COOKIE_VALUE = /^[a-zA-Z0-9-]{1,50}$/;

// Webhook rate limiting
export const WEBHOOK_RATE_LIMIT = 100; // requests per minute
export const WEBHOOK_RATE_WINDOW = 60_000; // 1 minute in ms
export const WEBHOOK_MAP_MAX_SIZE = 10_000;

// Lead scoring
export const LEAD_SCORE_REFERRAL = 15;
export const LEAD_SCORE_YOUTUBE = 10;
export const LEAD_SCORE_DEFAULT = 5;
