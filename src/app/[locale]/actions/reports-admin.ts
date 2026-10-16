"use server";

import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { auditLogs, reports, users } from "@/db/schema";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { revalidateLocalized } from "@/lib/revalidate";
import {
  offsetOf,
  paged,
  reportsTable,
  type RawTableParams,
} from "@/lib/admin-table";
import { reportIdSchema, reportResolutionSchema } from "@/lib/reports";
import { escapeLike } from "@/lib/utils";

// Every export here is gated to moderators and admins.

const reporters = alias(users, "reporters");
const targets = alias(users, "targets");

/** One page of reports with reporter and reported user, newest first. */
export async function listReportsAdmin(input: RawTableParams) {
  await requireRole(["moderator", "admin"]);

  const query = reportsTable.parse(input);
  const { status, type } = query.filters;

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(reports.status, status));
  if (type) conditions.push(eq(reports.targetType, type));
  if (query.search) {
    const pattern = `%${escapeLike(query.search)}%`;
    const match = or(
      ilike(reports.details, pattern),
      ilike(reports.contentSnapshot, pattern),
      ilike(reporters.username, pattern),
      ilike(targets.username, pattern),
    );
    if (match) conditions.push(match);
  }
  const where = and(...conditions);

  const sortColumn = {
    createdAt: reports.createdAt,
    reason: reports.reason,
    status: reports.status,
  }[query.sort.id];

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: reports.id,
        targetType: reports.targetType,
        targetId: reports.targetId,
        reason: reports.reason,
        details: reports.details,
        contentSnapshot: reports.contentSnapshot,
        status: reports.status,
        resolutionNote: reports.resolutionNote,
        createdAt: reports.createdAt,
        reporter: { id: reporters.id, username: reporters.username },
        target: { id: targets.id, username: targets.username },
      })
      .from(reports)
      .innerJoin(reporters, eq(reports.reporterId, reporters.id))
      .innerJoin(targets, eq(reports.targetUserId, targets.id))
      .where(where)
      .orderBy(
        query.sort.desc ? desc(sortColumn) : asc(sortColumn),
        desc(reports.id),
      )
      .limit(query.pageSize)
      .offset(offsetOf(query)),
    db
      .select({ total: count() })
      .from(reports)
      .innerJoin(reporters, eq(reports.reporterId, reporters.id))
      .innerJoin(targets, eq(reports.targetUserId, targets.id))
      .where(where),
  ]);

  return paged(rows, totals.total, query);
}

/** Open-report count for the nav; 0 (not an error) for non-moderators. */
export async function countOpenReports() {
  const user = await getCurrentUser();
  if (user?.role !== "admin" && user?.role !== "moderator") return 0;

  const [row] = await db
    .select({ total: count() })
    .from(reports)
    .where(eq(reports.status, "open"));
  return row.total;
}

/** Close a report as resolved (action taken) or dismissed (no action). */
export async function resolveReport(id: string, status: unknown, note?: unknown) {
  const moderator = await requireRole(["moderator", "admin"]);

  const parsedId = reportIdSchema.safeParse(id);
  const parsed = reportResolutionSchema.safeParse({ status, note });
  if (!parsedId.success || !parsed.success) {
    return { error: "Invalid input" };
  }

  try {
    const [updated] = await db
      .update(reports)
      .set({
        status: parsed.data.status,
        resolutionNote: parsed.data.note ?? null,
        resolvedBy: moderator.id,
        resolvedAt: new Date(),
      })
      .where(eq(reports.id, parsedId.data))
      .returning({ id: reports.id });
    if (!updated) return { error: "Report not found" };

    // The note itself is not copied into the audit log
    await db.insert(auditLogs).values({
      userId: moderator.id,
      action: "report.resolve",
      targetId: parsedId.data,
      targetType: "report",
      metadata: JSON.stringify({ status: parsed.data.status }),
    });

    revalidateLocalized("/admin/reports", "/admin");
    return { success: true };
  } catch (error) {
    console.error("Error resolving report:", error);
    return { error: "Failed to update report" };
  }
}

/** Put a closed report back in the queue. */
export async function reopenReport(id: string) {
  const moderator = await requireRole(["moderator", "admin"]);

  const parsedId = reportIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Invalid input" };

  try {
    const [updated] = await db
      .update(reports)
      .set({
        status: "open",
        resolutionNote: null,
        resolvedBy: null,
        resolvedAt: null,
      })
      .where(eq(reports.id, parsedId.data))
      .returning({ id: reports.id });
    if (!updated) return { error: "Report not found" };

    await db.insert(auditLogs).values({
      userId: moderator.id,
      action: "report.reopen",
      targetId: parsedId.data,
      targetType: "report",
    });

    revalidateLocalized("/admin/reports", "/admin");
    return { success: true };
  } catch (error) {
    console.error("Error reopening report:", error);
    return { error: "Failed to update report" };
  }
}
