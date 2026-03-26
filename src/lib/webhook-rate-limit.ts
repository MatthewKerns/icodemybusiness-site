import {
  WEBHOOK_RATE_LIMIT,
  WEBHOOK_RATE_WINDOW,
  WEBHOOK_MAP_MAX_SIZE,
} from "./constants";

const webhookRequestLog = new Map<string, number[]>();

export function isWebhookRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = webhookRequestLog.get(ip) ?? [];

  // Remove entries outside the window
  const recent = timestamps.filter((t) => now - t < WEBHOOK_RATE_WINDOW);
  recent.push(now);
  webhookRequestLog.set(ip, recent);

  // Clean up stale IPs periodically (keep map from growing unbounded)
  if (webhookRequestLog.size > WEBHOOK_MAP_MAX_SIZE) {
    const keys = Array.from(webhookRequestLog.keys());
    for (const key of keys) {
      const vals = webhookRequestLog.get(key);
      if (vals && vals.every((t: number) => now - t >= WEBHOOK_RATE_WINDOW)) {
        webhookRequestLog.delete(key);
      }
    }
  }

  return recent.length > WEBHOOK_RATE_LIMIT;
}
