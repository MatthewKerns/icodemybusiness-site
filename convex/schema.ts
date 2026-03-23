// NOTE: You can remove this file. Declaring the shape
// of the database is entirely optional in Convex.
// See https://docs.convex.dev/database/schemas.

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

    documents: defineTable({
      fieldOne: v.string(),
      fieldTwo: v.object({
        subFieldOne: v.array(v.number()),
      }),
    }),
    // This definition matches the example query and mutation code:
    numbers: defineTable({
      value: v.number(),
    }),
  },
  // If you ever get an error about schema mismatch
  // between your data and your schema, and you cannot
  // change the schema to match the current data in your database,
  // you can:
  //  1. Use the dashboard to delete tables or individual documents
  //     that are causing the error.
  //  2. Change this option to `false` and make changes to the data
  //     freely, ignoring the schema. Don't forget to change back to `true`!
  { schemaValidation: true }
);
