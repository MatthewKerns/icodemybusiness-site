import { query } from "./_generated/server";
import { v } from "convex/values";
import { filterByDateRange } from "./lib/dateFilter";
import { requireRole } from "./lib/auth";

const PLAN_PRICES: Record<string, number> = {
  starter: 19.99,
  professional: 34.99,
  enterprise: 49.99,
};

export const exportLeads = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const allLeads = await ctx.db.query("leads").collect();
    const leads = filterByDateRange(allLeads, "createdAt", args.startDate, args.endDate);

    return leads;
  },
});

export const getKpiSummary = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    // Leads
    const allLeads = await ctx.db.query("leads").collect();
    const leads = filterByDateRange(allLeads, "createdAt", args.startDate, args.endDate);

    const bySource: Record<string, number> = {};
    for (const lead of leads) {
      const source = lead.source ?? "direct";
      bySource[source] = (bySource[source] ?? 0) + 1;
    }

    // Page views
    const allPageViews = await ctx.db.query("pageViews").collect();
    const pageViews = filterByDateRange(allPageViews, "timestamp", args.startDate, args.endDate);

    // Subscriptions — active count and MRR
    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const mrr = activeSubscriptions.reduce((sum, sub) => {
      const price = PLAN_PRICES[sub.plan];
      if (price === undefined) {
        console.warn(`Unknown subscription plan "${sub.plan}" for subscription ${sub._id}, defaulting MRR contribution to 0`);
      }
      return sum + (price ?? 0);
    }, 0);

    return {
      leads: {
        total: leads.length,
        bySource,
      },
      pageViews: pageViews.length,
      subscriptions: {
        active: activeSubscriptions.length,
        mrr: Math.round(mrr * 100) / 100,
      },
      // TODO: Wire up real conversation tracking once chat/AI conversation feature is implemented
      conversations: {
        started: 0,
        completed: 0,
      },
    };
  },
});
