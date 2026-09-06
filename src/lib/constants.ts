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

// Community. One constant, because two surfaces (CommunityBanner, Footer) link to it and
// they drifted once: both carried a guessed slug that 404'd on the live site until
// 2026-09-06. Matthew's community is unlisted, so the slug is not discoverable — it
// comes from him.
export const SKOOL_COMMUNITY_URL = "https://www.skool.com/icodemybusiness-9679";
