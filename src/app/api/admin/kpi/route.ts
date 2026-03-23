import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { convex } from "@/lib/convex-client";
import { isAdmin } from "@/lib/auth";
import { api } from "../../../../../convex/_generated/api";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const queryArgs: { startDate?: number; endDate?: number } = {};
  if (startDate) queryArgs.startDate = Number(startDate);
  if (endDate) queryArgs.endDate = Number(endDate);

  const kpi = await convex.query(api.admin.getKpiSummary, queryArgs);

  await convex.mutation(api.auditLog.logAuditEvent, {
    eventType: "admin.view.kpi",
    actorId: userId,
    details: JSON.stringify({ startDate, endDate }),
    severity: "info",
  });

  return NextResponse.json({
    ...kpi,
    _links: {
      stripePaymentsDashboard: "https://dashboard.stripe.com/payments",
      stripeSubscriptionsDashboard:
        "https://dashboard.stripe.com/subscriptions",
    },
  });
}
