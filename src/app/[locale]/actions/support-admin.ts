"use server";

import { and, count, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, supportTickets } from "@/db/schema";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { revalidateLocalized } from "@/lib/revalidate";
import {
  SUPPORT_PAGE_SIZE,
  supportNoteSchema,
  supportStatusSchema,
  supportTicketIdSchema,
  type SupportStatus,
} from "@/lib/support";

// Every export here is gated by requireRole(["admin"]). Moderators can open
// the admin panel but tickets hold personal data, so they get nothing.

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

const listColumns = {
  id: supportTickets.id,
  name: supportTickets.name,
  email: supportTickets.email,
  message: supportTickets.message,
  status: supportTickets.status,
  createdAt: supportTickets.createdAt,
};

/** Tickets, newest first, filtered by status and/or a search term. */
export async function listSupportTickets(input: {
  status?: SupportStatus;
  search?: string;
  page?: number;
}) {
  await requireRole(["admin"]);

  const status = input.status
    ? supportStatusSchema.safeParse(input.status)
    : null;
  if (status && !status.success) return { error: "Invalid status" as const };

  const page = Number.isInteger(input.page) && input.page! > 0 ? input.page! : 1;
  const term = input.search?.trim().slice(0, 100);

  const conditions: SQL[] = [isNull(supportTickets.deletedAt)];
  if (status?.success) conditions.push(eq(supportTickets.status, status.data));
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    const match = or(
      ilike(supportTickets.name, pattern),
      ilike(supportTickets.email, pattern),
      ilike(supportTickets.message, pattern),
    );
    if (match) conditions.push(match);
  }
  const where = and(...conditions);

  const [tickets, [totals]] = await Promise.all([
    db
      .select(listColumns)
      .from(supportTickets)
      .where(where)
      .orderBy(desc(supportTickets.createdAt))
      .limit(SUPPORT_PAGE_SIZE)
      .offset((page - 1) * SUPPORT_PAGE_SIZE),
    db.select({ total: count() }).from(supportTickets).where(where),
  ]);

  return {
    tickets: tickets.map((ticket) => ({
      ...ticket,
      // Only a preview leaves the server for the list
      message: ticket.message.slice(0, 200),
    })),
    total: totals.total,
    page,
    pageCount: Math.max(1, Math.ceil(totals.total / SUPPORT_PAGE_SIZE)),
  };
}

export async function getSupportTicket(id: string) {
  await requireRole(["admin"]);

  const parsedId = supportTicketIdSchema.safeParse(id);
  if (!parsedId.success) return null;

  const ticket = await db.query.supportTickets.findFirst({
    where: and(
      eq(supportTickets.id, parsedId.data),
      isNull(supportTickets.deletedAt),
    ),
  });
  return ticket ?? null;
}

/** Open-ticket count for the nav; 0 (not an error) for anyone but admins. */
export async function countOpenSupportTickets() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return 0;

  const [row] = await db
    .select({ total: count() })
    .from(supportTickets)
    .where(
      and(eq(supportTickets.status, "open"), isNull(supportTickets.deletedAt)),
    );
  return row.total;
}

export async function updateSupportTicketStatus(id: string, status: unknown) {
  const admin = await requireRole(["admin"]);

  const parsedId = supportTicketIdSchema.safeParse(id);
  const parsedStatus = supportStatusSchema.safeParse(status);
  if (!parsedId.success || !parsedStatus.success) {
    return { error: "Invalid input" };
  }

  try {
    const now = new Date();
    const [updated] = await db
      .update(supportTickets)
      .set({
        status: parsedStatus.data,
        updatedAt: now,
        resolvedAt: parsedStatus.data === "resolved" ? now : null,
      })
      .where(
        and(
          eq(supportTickets.id, parsedId.data),
          isNull(supportTickets.deletedAt),
        ),
      )
      .returning({ id: supportTickets.id });
    if (!updated) return { error: "Ticket not found" };

    await db.insert(auditLogs).values({
      userId: admin.id,
      action: "support.status.update",
      targetId: parsedId.data,
      targetType: "support_ticket",
      metadata: JSON.stringify({ status: parsedStatus.data }),
    });

    revalidateLocalized("/admin/support", `/admin/support/${parsedId.data}`);
    return { success: true };
  } catch {
    return { error: "Failed to update status" };
  }
}

export async function updateSupportTicketNote(id: string, note: unknown) {
  const admin = await requireRole(["admin"]);

  const parsedId = supportTicketIdSchema.safeParse(id);
  const parsedNote = supportNoteSchema.safeParse(note);
  if (!parsedId.success || !parsedNote.success) {
    return { error: "Invalid input" };
  }

  try {
    const [updated] = await db
      .update(supportTickets)
      .set({ internalNote: parsedNote.data, updatedAt: new Date() })
      .where(
        and(
          eq(supportTickets.id, parsedId.data),
          isNull(supportTickets.deletedAt),
        ),
      )
      .returning({ id: supportTickets.id });
    if (!updated) return { error: "Ticket not found" };

    // The note itself is not copied into the audit log
    await db.insert(auditLogs).values({
      userId: admin.id,
      action: "support.note.update",
      targetId: parsedId.data,
      targetType: "support_ticket",
    });

    revalidateLocalized(`/admin/support/${parsedId.data}`);
    return { success: true };
  } catch {
    return { error: "Failed to save note" };
  }
}

/** Soft delete: the row stays, it just disappears from the admin views. */
export async function deleteSupportTicket(id: string) {
  const admin = await requireRole(["admin"]);

  const parsedId = supportTicketIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "Invalid input" };

  try {
    const [updated] = await db
      .update(supportTickets)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(supportTickets.id, parsedId.data),
          isNull(supportTickets.deletedAt),
        ),
      )
      .returning({ id: supportTickets.id });
    if (!updated) return { error: "Ticket not found" };

    await db.insert(auditLogs).values({
      userId: admin.id,
      action: "support.delete",
      targetId: parsedId.data,
      targetType: "support_ticket",
    });

    revalidateLocalized("/admin/support");
    return { success: true };
  } catch {
    return { error: "Failed to delete ticket" };
  }
}
