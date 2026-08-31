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

    // ======================================================================
    // Owner objectives dashboard (/admin/objectives)
    //
    // Single-operator tables, all gated by requireOwner(). Convex is the source
    // of truth for the plan; Mango is synced into mangoSnapshots for context and
    // is never authoritative for anything here.
    // ======================================================================

    // Operator preferences. One row, key = "owner".
    ownerSettings: defineTable({
      key: v.string(),
      // A local CEILING on unpaid/investment hours per week. Deliberately not
      // sourced from Mango's weekly_min_hours, which is a commitment FLOOR (and
      // is 0.0 on every unpaid tile anyway).
      overheadWeeklyBudgetHours: v.number(),
      // Mango focus-project key for iCMB overhead, e.g. "icmb-overhead".
      mangoOverheadKey: v.optional(v.string()),
      updatedAt: v.number(),
    }).index("by_key", ["key"]),

    // Objectives ("rocks") for a planning period.
    objectives: defineTable({
      title: v.string(),
      notes: v.optional(v.string()),
      period: v.string(), // "week" | "month" | "quarter"
      periodKey: v.string(), // "2026-W35" | "2026-08" | "2026-Q3"
      status: v.string(), // "active" | "blocked" | "done" | "dropped"
      // Relative time emphasis. Active objectives in a period sum to 100.
      weightPct: v.number(),
      order: v.number(), // fractional sort key among siblings in the period
      archivedAt: v.optional(v.number()),
      // Optional link to a Mango focus-project objective, for confirm-first
      // write-back. Both must be set for the push button to appear.
      mangoKey: v.optional(v.string()),
      mangoObjectiveId: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_period_periodKey", ["period", "periodKey"])
      .index("by_status", ["status"])
      .index("by_mangoKey", ["mangoKey"]),

    // To-dos: a tree under one objective. Parent pointer + materialized ancestor
    // path, because Convex has no recursive queries. `path` makes the cycle
    // check on re-parent O(1) and subtree selection a pure predicate; depth is
    // derived from path.length so it cannot desync.
    objectiveTodos: defineTable({
      objectiveId: v.id("objectives"), // denormalized owner, always set
      parentId: v.optional(v.id("objectiveTodos")),
      // Ancestor ids, root-first, EXCLUDING self.
      path: v.array(v.id("objectiveTodos")),
      title: v.string(),
      notes: v.optional(v.string()),
      status: v.string(), // "todo" | "doing" | "blocked" | "done"
      estimateMinutes: v.optional(v.number()),
      order: v.number(), // fractional sort key among siblings
      todayDate: v.optional(v.string()), // "YYYY-MM-DD" when on the focus list
      deferUntil: v.optional(v.string()), // "YYYY-MM-DD"
      // Soft delete. archivedAt is stamped on every node of the subtree;
      // archiveRootId marks the node the operator actually archived, so a nested
      // archive can be restored without resurrecting an outer one.
      archivedAt: v.optional(v.number()),
      archiveRootId: v.optional(v.id("objectiveTodos")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_objectiveId", ["objectiveId"])
      .index("by_objectiveId_parentId", ["objectiveId", "parentId"])
      .index("by_todayDate", ["todayDate"])
      .index("by_archiveRootId", ["archiveRootId"]),

    // One applied op batch, with enough of a delta to revert it. Stores only the
    // CHANGED FIELDS of touched docs plus the ids of created docs — not a full
    // copy of the plan.
    objectiveOpBatches: defineTable({
      label: v.string(),
      source: v.string(), // "manual" | "ai" | "revert"
      requestId: v.optional(v.id("reorgRequests")),
      ops: v.any(), // the ReorgOp[] that were applied
      createdObjectives: v.array(v.id("objectives")),
      createdTodos: v.array(v.id("objectiveTodos")),
      // [{ id, set: {...}, clear: ["field", ...] }] — only the changed fields.
      // Removals are a name list because Convex drops `undefined` on write, so
      // "this field was absent" cannot be encoded as a value.
      beforeObjectives: v.any(),
      beforeTodos: v.any(),
      docCount: v.number(),
      revertedAt: v.optional(v.number()),
      revertedByBatchId: v.optional(v.id("objectiveOpBatches")),
      createdAt: v.number(),
    })
      .index("by_createdAt", ["createdAt"])
      .index("by_requestId", ["requestId"]),

    // Every reorganization request the operator typed, for pattern mining.
    // `unmapped` — what the AI could NOT express with the available ops — is the
    // signal for which reorganization tooling is worth actually building.
    reorgRequests: defineTable({
      rawText: v.string(),
      status: v.string(), // "pending"|"proposed"|"applied"|"rejected"|"reverted"|"failed"
      edited: v.boolean(), // operator changed the proposal before applying
      proposedOps: v.optional(v.any()),
      appliedOps: v.optional(v.any()),
      rejectedOps: v.optional(v.any()), // [{ op, reason }] refused by validateOps
      rationale: v.optional(v.string()),
      unmapped: v.array(
        v.object({
          intentKey: v.string(), // kebab-case slug from the taxonomy
          description: v.string(),
          why: v.string(),
        })
      ),
      batchId: v.optional(v.id("objectiveOpBatches")),
      model: v.optional(v.string()),
      latencyMs: v.optional(v.number()),
      error: v.optional(v.string()),
      createdAt: v.number(),
      resolvedAt: v.optional(v.number()),
    })
      .index("by_status", ["status"])
      .index("by_createdAt", ["createdAt"]),

    // Latest Mango snapshot per kind (upsert — one row per kind, no history).
    // Mango is the system of record for time; a local history would be an
    // unbounded second copy to reconcile.
    mangoSnapshots: defineTable({
      kind: v.string(),
      payload: v.optional(v.any()),
      ok: v.boolean(),
      error: v.optional(v.string()),
      fetchedAt: v.number(), // last ATTEMPT
      okAt: v.optional(v.number()), // last SUCCESS — drives "last synced"
    }).index("by_kind", ["kind"]),

    // APPEND-ONLY — no update or delete mutations permitted
    // Confirm-first writes pushed out to Mango, for auditability.
    mangoWrites: defineTable({
      tool: v.string(),
      args: v.any(),
      ok: v.boolean(),
      response: v.optional(v.any()),
      error: v.optional(v.string()),
      objectiveId: v.optional(v.id("objectives")),
      createdAt: v.number(),
    }).index("by_createdAt", ["createdAt"]),
  },
  { schemaValidation: true }
);
