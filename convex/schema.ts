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
      .index("by_sessionId", ["sessionId"])
      .index("by_clerkUserId", ["clerkUserId"]),

    // APPEND-ONLY
    // Visitor events: durable system-of-record log of clicks and decisions made
    // on the marketing site (CTA clicks, plan/tier/path selection, copies,
    // downloads). Dual-written alongside PostHog so an admin can review the full
    // visitor journey even when PostHog is unavailable. Keyed by the anonymous
    // client session id (and Clerk user id once known) so events can be stitched
    // to a lead / agent session for the same visitor.
    visitorEvents: defineTable({
      name: v.string(), // semantic event name from the analytics taxonomy
      category: v.string(), // "click" | "decision" | "form" | "system"
      sessionId: v.optional(v.string()), // anonymous client session (icmb_session_id)
      clerkUserId: v.optional(v.string()),
      page: v.optional(v.string()), // pathname where the event fired
      props: v.optional(v.any()), // event-specific details (plan, tool, label, ...)
      source: v.optional(v.string()), // attribution source
      variant: v.optional(v.string()), // attribution variant
      timestamp: v.number(),
    })
      .index("by_sessionId", ["sessionId"])
      .index("by_name", ["name"])
      .index("by_clerkUserId", ["clerkUserId"])
      .index("by_timestamp", ["timestamp"]),

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

    // Projects table: stores client project records with status and timeline
    projects: defineTable({
      title: v.string(),
      description: v.optional(v.string()),
      clientId: v.string(),
      status: v.string(),
      progress: v.number(),
      startDate: v.number(),
      endDate: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_clientId", ["clientId"])
      .index("by_status", ["status"]),

    // Milestones table: stores project milestones with ordering and status
    milestones: defineTable({
      projectId: v.id("projects"),
      title: v.string(),
      description: v.optional(v.string()),
      status: v.string(),
      dueDate: v.number(),
      order: v.number(),
      createdAt: v.number(),
    })
      .index("by_projectId", ["projectId"])
      .index("by_projectId_order", ["projectId", "order"]),

    // Deliverables table: stores project deliverable files with status tracking
    deliverables: defineTable({
      projectId: v.id("projects"),
      milestoneId: v.optional(v.id("milestones")),
      name: v.string(),
      description: v.optional(v.string()),
      fileId: v.optional(v.id("_storage")),
      status: v.string(),
      uploadedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_projectId", ["projectId"])
      .index("by_milestoneId", ["milestoneId"]),

    // APPEND-ONLY
    // Activities table: immutable record of project events and updates
    activities: defineTable({
      projectId: v.id("projects"),
      actorId: v.string(),
      eventType: v.string(),
      description: v.string(),
      timestamp: v.number(),
    })
      .index("by_projectId", ["projectId"])
      .index("by_projectId_timestamp", ["projectId", "timestamp"])
      .index("by_timestamp", ["timestamp"]),

    // HUBSPOT INTEGRATION POINT: sync conversation summary + lead data on completion
    // Conversations table: stores Retell AI conversation records
    conversations: defineTable({
      retellCallId: v.string(),
      leadId: v.optional(v.id("leads")),
      visitorEmail: v.optional(v.string()),
      visitorName: v.optional(v.string()),
      visitorPhone: v.optional(v.string()),
      source: v.optional(v.string()),
      status: v.string(), // "active" | "completed" | "abandoned" | "error"
      modality: v.string(), // "text" | "voice"
      agentId: v.string(),
      summary: v.optional(v.string()),
      painPoints: v.optional(v.array(v.string())),
      qualificationScore: v.optional(v.number()),
      outcome: v.optional(v.string()), // "booked" | "roadmap_requested" | "free_tools" | "low_intent" | "abandoned" | "error"
      roadmapRequested: v.boolean(),
      roadmapStatus: v.optional(v.string()), // "pending" | "in_progress" | "sent"
      bookingEmailSent: v.boolean(),
      durationSeconds: v.optional(v.number()),
      recordingUrl: v.optional(v.string()),
      publicLogUrl: v.optional(v.string()),
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
    })
      .index("by_retellCallId", ["retellCallId"])
      .index("by_leadId", ["leadId"])
      .index("by_status", ["status"])
      .index("by_outcome", ["outcome"])
      .index("by_roadmapStatus", ["roadmapStatus"]),

    // Conversation messages table: stores individual messages from Retell conversations
    conversationMessages: defineTable({
      conversationId: v.id("conversations"),
      role: v.string(), // "agent" | "visitor"
      content: v.string(),
      timestamp: v.number(),
    })
      .index("by_conversationId", ["conversationId"])
      .index("by_conversationId_timestamp", ["conversationId", "timestamp"]),

    // Native agent sessions (Top 3 Issues, e-commerce intake, future agents)
    agentSessions: defineTable({
      agentKind: v.string(), // "top3-issues" | "ecommerce-intake"
      sessionId: v.string(), // client-generated, stable across anon visits
      leadId: v.optional(v.id("leads")),
      visitorEmail: v.optional(v.string()),
      visitorName: v.optional(v.string()),
      status: v.string(), // "active" | "completed" | "abandoned"
      top3Issues: v.optional(
        v.array(
          v.object({
            title: v.string(),
            severity: v.string(), // "low" | "medium" | "high"
            evidence: v.string(),
          })
        )
      ),
      // E-commerce intake agent: structured context extracted from the chat,
      // and a background "pre-draft" analysis started mid-conversation.
      intakeProfile: v.optional(v.any()),
      intakeReady: v.optional(v.boolean()),
      preDraft: v.optional(v.string()),
      preDraftStarted: v.optional(v.boolean()),
      fileIds: v.array(v.id("_storage")),
      fileMeta: v.array(
        v.object({
          storageId: v.id("_storage"),
          name: v.string(),
          size: v.number(),
          mime: v.string(),
          extractedChars: v.number(),
        })
      ),
      turnCount: v.number(),
      summaryEmailSent: v.boolean(),
      source: v.optional(v.string()),
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
    })
      .index("by_sessionId", ["sessionId"])
      .index("by_leadId", ["leadId"])
      .index("by_status", ["status"]),

    agentSessionMessages: defineTable({
      sessionId: v.id("agentSessions"),
      role: v.string(), // "user" | "assistant" | "system"
      content: v.string(),
      fileRefs: v.optional(v.array(v.id("_storage"))),
      timestamp: v.number(),
    })
      .index("by_sessionId_timestamp", ["sessionId", "timestamp"]),

    // "Custom E-Commerce Tools Set" applications. A free intake-chat session is
    // turned into an application when the user creates an account and submits.
    // Background processing drafts free value (emailed to the user) and an
    // internal next-steps proposal (admin-only, never sent to the user).
    applications: defineTable({
      email: v.string(),
      name: v.optional(v.string()),
      sessionId: v.optional(v.string()), // links to agentSessions.sessionId
      leadId: v.optional(v.id("leads")),
      clerkUserId: v.optional(v.string()),
      source: v.optional(v.string()), // "ecommerce-tools-application"
      intakeProfile: v.optional(v.any()), // snapshot of extracted context at submit
      status: v.string(), // "new" | "processing" | "processed" | "proposed" | "closed"
      // Free value generated in the background and emailed to the user.
      freeValue: v.optional(v.string()),
      followupEmailSent: v.boolean(),
      // INTERNAL — admin only, never returned by user-facing queries.
      internalProposal: v.optional(v.string()),
      internalProposalAt: v.optional(v.number()),
      processingError: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_email", ["email"])
      .index("by_clerkUserId", ["clerkUserId"])
      .index("by_sessionId", ["sessionId"])
      .index("by_status", ["status"]),
  },
  { schemaValidation: true }
);
