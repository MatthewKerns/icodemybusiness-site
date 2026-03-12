import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Define the complete database schema for iCodeMyBusiness
export default defineSchema({
  // 1. Lead Management
  leads: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    source: v.string(), // "calendly", "website", "linkedin", "referral", "cold", "voice_agent"
    status: v.string(), // "new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"
    score: v.optional(v.number()), // 0-100 lead score
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.string()), // User ID
    tags: v.optional(v.array(v.string())),
    nextFollowUp: v.optional(v.number()), // Timestamp
    createdAt: v.number(),
    updatedAt: v.number(),
    metadata: v.optional(v.object({
      calendlyEventId: v.optional(v.string()),
      voiceCallId: v.optional(v.string()),
      linkedinProfileUrl: v.optional(v.string()),
      referralSource: v.optional(v.string()),
    })),
  })
    .index("by_status", ["status"])
    .index("by_email", ["email"])
    .index("by_source", ["source"])
    .index("by_assigned", ["assignedTo"])
    .searchIndex("search_leads", {
      searchField: "name",
      filterFields: ["status", "source"],
    }),

  // 2. Client Management
  clients: defineTable({
    companyName: v.string(),
    primaryContact: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      role: v.optional(v.string()),
    }),
    additionalContacts: v.optional(v.array(v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      role: v.optional(v.string()),
    }))),
    status: v.string(), // "active", "paused", "churned", "prospective"
    tier: v.optional(v.string()), // "starter", "growth", "enterprise"
    monthlyRecurring: v.optional(v.number()),
    contractValue: v.optional(v.number()),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    industry: v.optional(v.string()),
    website: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_tier", ["tier"])
    .searchIndex("search_clients", {
      searchField: "companyName",
      filterFields: ["status", "tier"],
    }),

  // 3. Project Management
  projects: defineTable({
    clientId: v.id("clients"),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(), // "website", "app", "automation", "consulting", "ai_agent"
    status: v.string(), // "planning", "in_progress", "review", "completed", "on_hold"
    priority: v.string(), // "low", "medium", "high", "urgent"
    startDate: v.number(),
    dueDate: v.optional(v.number()),
    completedDate: v.optional(v.number()),
    budget: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    teamMembers: v.optional(v.array(v.string())), // User IDs
    milestones: v.optional(v.array(v.object({
      name: v.string(),
      dueDate: v.number(),
      status: v.string(),
      completedDate: v.optional(v.number()),
    }))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_type", ["type"]),

  // 4. Deliverables & Tasks
  deliverables: defineTable({
    projectId: v.id("projects"),
    clientId: v.id("clients"),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(), // "document", "code", "design", "report", "presentation"
    status: v.string(), // "pending", "in_progress", "review", "approved", "delivered"
    assignedTo: v.optional(v.string()), // User ID
    dueDate: v.optional(v.number()),
    completedDate: v.optional(v.number()),
    fileUrl: v.optional(v.string()),
    feedback: v.optional(v.string()),
    version: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_client", ["clientId"])
    .index("by_status", ["status"])
    .index("by_assigned", ["assignedTo"]),

  // 5. Kanban Board Cards
  boardCards: defineTable({
    boardId: v.string(), // "leads", "projects", "content", etc.
    column: v.string(), // Column identifier
    title: v.string(),
    description: v.optional(v.string()),
    position: v.number(), // For ordering within column
    color: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    assignedTo: v.optional(v.array(v.string())), // User IDs
    dueDate: v.optional(v.number()),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
      type: v.string(),
    }))),
    linkedEntityId: v.optional(v.string()), // Link to lead, project, etc.
    linkedEntityType: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_board_column", ["boardId", "column"])
    .index("by_assigned", ["assignedTo"]),

  // 6. Messages & Communication
  messages: defineTable({
    channel: v.string(), // "email", "linkedin", "whatsapp", "slack", "sms"
    direction: v.string(), // "inbound", "outbound"
    from: v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      id: v.optional(v.string()),
    }),
    to: v.array(v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      id: v.optional(v.string()),
    })),
    subject: v.optional(v.string()),
    body: v.string(),
    isRead: v.boolean(),
    isStarred: v.optional(v.boolean()),
    threadId: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    leadId: v.optional(v.id("leads")),
    projectId: v.optional(v.id("projects")),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
      size: v.number(),
      type: v.string(),
    }))),
    metadata: v.optional(v.object({
      unipileId: v.optional(v.string()),
      externalId: v.optional(v.string()),
      sentAt: v.optional(v.number()),
      deliveredAt: v.optional(v.number()),
      readAt: v.optional(v.number()),
    })),
    aiSuggestedReply: v.optional(v.string()),
    sentiment: v.optional(v.string()), // "positive", "neutral", "negative"
    priority: v.optional(v.string()), // "low", "medium", "high"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_channel", ["channel"])
    .index("by_thread", ["threadId"])
    .index("by_client", ["clientId"])
    .index("by_lead", ["leadId"])
    .index("by_project", ["projectId"])
    .index("by_read_status", ["isRead"])
    .searchIndex("search_messages", {
      searchField: "body",
      filterFields: ["channel", "isRead"],
    }),

  // 7. Content Management
  contentDrafts: defineTable({
    title: v.string(),
    type: v.string(), // "blog", "social", "email", "landing_page", "case_study"
    platform: v.optional(v.string()), // "linkedin", "twitter", "website", "email"
    content: v.string(),
    excerpt: v.optional(v.string()),
    status: v.string(), // "draft", "review", "approved", "published", "archived"
    author: v.string(), // User ID
    reviewer: v.optional(v.string()), // User ID
    publishDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    seoKeywords: v.optional(v.array(v.string())),
    targetAudience: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    projectId: v.optional(v.id("projects")),
    performance: v.optional(v.object({
      views: v.optional(v.number()),
      clicks: v.optional(v.number()),
      engagement: v.optional(v.number()),
      conversions: v.optional(v.number()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_author", ["author"])
    .index("by_client", ["clientId"]),

  // 8. Appointments & Schedule
  appointments: defineTable({
    title: v.string(),
    type: v.string(), // "meeting", "call", "demo", "consultation", "workshop"
    startTime: v.number(),
    endTime: v.number(),
    location: v.optional(v.string()), // "zoom", "phone", "in-person", URL
    attendees: v.array(v.object({
      name: v.string(),
      email: v.string(),
      type: v.string(), // "client", "lead", "team", "partner"
      entityId: v.optional(v.string()),
    })),
    description: v.optional(v.string()),
    agenda: v.optional(v.string()),
    notes: v.optional(v.string()),
    outcome: v.optional(v.string()),
    status: v.string(), // "scheduled", "confirmed", "completed", "cancelled", "rescheduled"
    reminders: v.optional(v.array(v.object({
      type: v.string(), // "email", "sms", "notification"
      timeBefore: v.number(), // Minutes before meeting
      sent: v.boolean(),
    }))),
    leadId: v.optional(v.id("leads")),
    clientId: v.optional(v.id("clients")),
    projectId: v.optional(v.id("projects")),
    calendlyEventId: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_time", ["startTime"])
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_client", ["clientId"])
    .index("by_lead", ["leadId"]),

  // 9. Business Metrics
  metrics: defineTable({
    date: v.number(), // Date timestamp
    type: v.string(), // "daily", "weekly", "monthly"
    revenue: v.object({
      mrr: v.number(),
      newMrr: v.number(),
      churnedMrr: v.number(),
      expansionMrr: v.number(),
      totalRevenue: v.number(),
    }),
    leads: v.object({
      total: v.number(),
      new: v.number(),
      qualified: v.number(),
      converted: v.number(),
      conversionRate: v.number(),
      avgScore: v.number(),
    }),
    clients: v.object({
      total: v.number(),
      new: v.number(),
      churned: v.number(),
      active: v.number(),
      churnRate: v.number(),
      ltv: v.number(),
    }),
    projects: v.object({
      active: v.number(),
      completed: v.number(),
      onTime: v.number(),
      overdue: v.number(),
      avgCompletionTime: v.number(),
    }),
    engagement: v.object({
      emailsSent: v.number(),
      emailsOpened: v.number(),
      messagesReceived: v.number(),
      callsCompleted: v.number(),
      meetingsHeld: v.number(),
      contentPublished: v.number(),
    }),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_type", ["type"]),

  // 10. Voice Calls
  voiceCalls: defineTable({
    callId: v.string(), // External call ID from voice platform
    direction: v.string(), // "inbound", "outbound"
    from: v.string(),
    to: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    duration: v.optional(v.number()), // Seconds
    status: v.string(), // "ringing", "in_progress", "completed", "missed", "failed"
    recordingUrl: v.optional(v.string()),
    transcription: v.optional(v.string()),
    summary: v.optional(v.string()),
    sentiment: v.optional(v.string()),
    leadId: v.optional(v.id("leads")),
    clientId: v.optional(v.id("clients")),
    aiNotes: v.optional(v.object({
      keyPoints: v.optional(v.array(v.string())),
      nextSteps: v.optional(v.array(v.string())),
      concerns: v.optional(v.array(v.string())),
      opportunities: v.optional(v.array(v.string())),
    })),
    metadata: v.optional(v.object({
      provider: v.string(), // "vapi", "retell", "elevenlabs"
      cost: v.optional(v.number()),
      quality: v.optional(v.string()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_lead", ["leadId"])
    .index("by_client", ["clientId"])
    .index("by_time", ["startTime"]),

  // 11. Automation Workflows
  automationRuns: defineTable({
    workflowId: v.string(),
    workflowName: v.string(),
    trigger: v.string(), // "schedule", "webhook", "event", "manual"
    status: v.string(), // "pending", "running", "completed", "failed"
    startTime: v.number(),
    endTime: v.optional(v.number()),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
    steps: v.optional(v.array(v.object({
      name: v.string(),
      status: v.string(),
      startTime: v.number(),
      endTime: v.optional(v.number()),
      output: v.optional(v.any()),
      error: v.optional(v.string()),
    }))),
    entityType: v.optional(v.string()), // "lead", "client", "project"
    entityId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_status", ["status"])
    .index("by_time", ["startTime"]),

  // 12. Documents & Files
  documents: defineTable({
    name: v.string(),
    type: v.string(), // "contract", "proposal", "invoice", "report", "presentation"
    mimeType: v.string(),
    size: v.number(),
    url: v.string(),
    storageId: v.optional(v.string()), // Convex storage ID
    version: v.optional(v.number()),
    status: v.string(), // "draft", "final", "signed", "archived"
    clientId: v.optional(v.id("clients")),
    projectId: v.optional(v.id("projects")),
    leadId: v.optional(v.id("leads")),
    uploadedBy: v.string(), // User ID
    tags: v.optional(v.array(v.string())),
    metadata: v.optional(v.object({
      ocrText: v.optional(v.string()),
      extractedData: v.optional(v.any()),
      signatureStatus: v.optional(v.string()),
      expiryDate: v.optional(v.number()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_client", ["clientId"])
    .index("by_project", ["projectId"])
    .searchIndex("search_documents", {
      searchField: "name",
      filterFields: ["type", "status"],
    }),

  // 13. User Management
  users: defineTable({
    clerkId: v.string(), // Clerk user ID
    email: v.string(),
    name: v.string(),
    role: v.string(), // "admin", "manager", "developer", "client"
    permissions: v.optional(v.array(v.string())),
    avatar: v.optional(v.string()),
    timezone: v.optional(v.string()),
    preferences: v.optional(v.object({
      emailNotifications: v.optional(v.boolean()),
      smsNotifications: v.optional(v.boolean()),
      theme: v.optional(v.string()),
      language: v.optional(v.string()),
    })),
    isActive: v.boolean(),
    lastLogin: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // 14. Activity Logs
  activityLogs: defineTable({
    userId: v.optional(v.string()),
    action: v.string(), // "created", "updated", "deleted", "viewed", "sent", etc.
    entityType: v.string(), // "lead", "client", "project", etc.
    entityId: v.string(),
    entityName: v.optional(v.string()),
    changes: v.optional(v.any()), // JSON of what changed
    metadata: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_time", ["timestamp"]),

  // 15. Notifications
  notifications: defineTable({
    userId: v.string(),
    type: v.string(), // "info", "warning", "error", "success"
    category: v.string(), // "lead", "client", "project", "system"
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    actionUrl: v.optional(v.string()),
    actionLabel: v.optional(v.string()),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_read_status", ["userId", "isRead"])
    .index("by_category", ["category"]),

  // 16. Integrations Config
  integrations: defineTable({
    name: v.string(), // "calendly", "unipile", "stripe", "claude", etc.
    isActive: v.boolean(),
    config: v.object({
      apiKey: v.optional(v.string()),
      webhookUrl: v.optional(v.string()),
      settings: v.optional(v.any()),
    }),
    lastSync: v.optional(v.number()),
    syncStatus: v.optional(v.string()),
    errorCount: v.optional(v.number()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_active", ["isActive"]),

  // 17. Templates
  templates: defineTable({
    name: v.string(),
    type: v.string(), // "email", "proposal", "contract", "message", "workflow"
    category: v.optional(v.string()),
    content: v.string(),
    variables: v.optional(v.array(v.string())), // {{variable}} placeholders
    isActive: v.boolean(),
    usageCount: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_active", ["isActive"]),

  // 18. API Keys for External Access
  apiKeys: defineTable({
    name: v.string(),
    key: v.string(),
    hashedKey: v.string(),
    permissions: v.array(v.string()),
    rateLimit: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    lastUsed: v.optional(v.number()),
    usageCount: v.optional(v.number()),
    isActive: v.boolean(),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_key", ["hashedKey"])
    .index("by_active", ["isActive"]),
});