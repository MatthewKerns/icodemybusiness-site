import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { rateLimitTables } from "convex-helpers/server/rateLimit";

export default defineSchema(
  {
    ...rateLimitTables,

    // Users table: stores Clerk-authenticated user records
    users: defineTable({
      clerkUserId: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
      role: v.optional(v.string()), // "admin" | future roles; undefined = "user"
      createdAt: v.number(),
      source: v.optional(v.string()),
    }).index("by_clerkUserId", ["clerkUserId"]),

    // Leads table: stores email captures with source attribution and scoring
    leads: defineTable({
      email: v.string(),
      name: v.optional(v.string()),
      source: v.optional(v.string()),
      variant: v.optional(v.string()),
      score: v.number(),
      sessionId: v.optional(v.string()),
      clerkUserId: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_email", ["email"])
      .index("by_source", ["source"])
      .index("by_sessionId", ["sessionId"]),

    // Page views table: tracks page visits with attribution
    pageViews: defineTable({
      userId: v.optional(v.string()),
      page: v.string(),
      referrer: v.optional(v.string()),
      source: v.optional(v.string()),
      variant: v.optional(v.string()),
      timestamp: v.number(),
    })
      .index("by_page", ["page"])
      .index("by_userId", ["userId"])
      .index("by_timestamp", ["timestamp"]),

    // Subscriptions table: tracks Stripe subscription state per user
    subscriptions: defineTable({
      userId: v.string(),
      stripeCustomerId: v.string(),
      stripeSubscriptionId: v.optional(v.string()),
      plan: v.string(),
      status: v.string(),
      createdAt: v.number(),
    })
      .index("by_userId", ["userId"])
      .index("by_stripeCustomerId", ["stripeCustomerId"]),

    // APPEND-ONLY
    // Audit log table: immutable record of payment and admin events
    auditLog: defineTable({
      eventType: v.string(),
      actorId: v.string(),
      timestamp: v.number(),
      details: v.string(),
      stripeEventId: v.optional(v.string()),
      severity: v.string(),
    })
      .index("by_eventType", ["eventType"])
      .index("by_timestamp", ["timestamp"]),

  },
  { schemaValidation: true }
);
