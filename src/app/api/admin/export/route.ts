import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { convex } from "@/lib/convex-client";
import { isAdmin } from "@/lib/auth";
import { api } from "../../../../../convex/_generated/api";
import {
  withErrorHandler,
  AuthError,
  ForbiddenError,
  ValidationError,
} from "@/lib/api-error-handler";

export const dynamic = "force-dynamic";

/**
 * Prefix cell values that start with formula-triggering characters
 * to prevent CSV injection in spreadsheet applications.
 */
function sanitizeCsvValue(value: string): string {
  if (/^[=+@-]/.test(value)) {
    return "'" + value;
  }
  return value;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await auth();
  if (!userId) {
    throw new AuthError();
  }
  if (!(await isAdmin(userId))) {
    throw new ForbiddenError();
  }

  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format") ?? "csv";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const queryArgs: { startDate?: number; endDate?: number } = {};
  if (startDate) {
    const parsed = Number(startDate);
    if (isNaN(parsed)) {
      throw new ValidationError(
        "Invalid startDate — must be a numeric timestamp"
      );
    }
    queryArgs.startDate = parsed;
  }
  if (endDate) {
    const parsed = Number(endDate);
    if (isNaN(parsed)) {
      throw new ValidationError(
        "Invalid endDate — must be a numeric timestamp"
      );
    }
    queryArgs.endDate = parsed;
  }

  const leads = await convex.query(api.admin.exportLeads, queryArgs);

  // Log the access
  await convex.mutation(api.auditLog.logAuditEvent, {
    eventType: "admin.export.leads",
    actorId: userId,
    details: JSON.stringify({ format, recordCount: leads.length }),
    severity: "info",
  });

  if (format === "json") {
    return NextResponse.json({ leads });
  }

  // CSV format
  const headers = [
    "id",
    "email",
    "name",
    "source",
    "variant",
    "score",
    "sessionId",
    "clerkUserId",
    "createdAt",
  ];

  const csvRows = [headers.join(",")];
  for (const lead of leads) {
    const row = [
      lead._id,
      lead.email,
      lead.name ?? "",
      lead.source ?? "",
      lead.variant ?? "",
      String(lead.score),
      lead.sessionId ?? "",
      lead.clerkUserId ?? "",
      new Date(lead.createdAt).toISOString(),
    ].map((val) => `"${sanitizeCsvValue(val).replace(/"/g, '""')}"`);
    csvRows.push(row.join(","));
  }

  const csv = csvRows.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-export-${Date.now()}.csv"`,
    },
  });
});
