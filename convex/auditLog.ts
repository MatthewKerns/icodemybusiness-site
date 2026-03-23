// APPEND-ONLY — no update or delete mutations permitted
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const logAuditEvent = mutation({
  args: {
    eventType: v.string(),
    actorId: v.string(),
    details: v.string(),
    stripeEventId: v.optional(v.string()),
    severity: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLog", {
      eventType: args.eventType,
      actorId: args.actorId,
      timestamp: Date.now(),
      details: args.details,
      stripeEventId: args.stripeEventId,
      severity: args.severity,
    });
  },
});
