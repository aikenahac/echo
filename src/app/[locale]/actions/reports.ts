"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reports, reviews, users } from "@/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { reportInputSchema, type ReportTargetType } from "@/lib/reports";
import { revalidateLocalized } from "@/lib/revalidate";

const HOUR_MS = 60 * 60 * 1000;
const REPORTS_PER_HOUR = 20;
const SNAPSHOT_MAX = 2000;

type ReportTarget = {
  targetUserId: string;
  contentSnapshot: string | null;
};

async function submitReport(targetType: ReportTargetType, input: unknown) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { error: "Invalid report" };
  }

  const parsed = reportInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid report" };
  }

  if (!rateLimit(`report:${userId}`, REPORTS_PER_HOUR, HOUR_MS)) {
    return { error: "Too many reports, try again later" };
  }

  const { targetId, reason, details } = parsed.data;

  try {
    let target: ReportTarget | null = null;

    if (targetType === "user") {
      if (targetId === userId) {
        return { error: "You cannot report yourself" };
      }
      const user = await db.query.users.findFirst({
        where: eq(users.id, targetId),
        columns: { id: true },
      });
      if (user) target = { targetUserId: user.id, contentSnapshot: null };
    } else {
      const review = await db.query.reviews.findFirst({
        where: and(eq(reviews.id, targetId), eq(reviews.isPrivate, false)),
        columns: { userId: true, content: true },
      });
      if (review) {
        if (review.userId === userId) {
          return { error: "You cannot report your own review" };
        }
        target = {
          targetUserId: review.userId,
          contentSnapshot: review.content.slice(0, SNAPSHOT_MAX),
        };
      }
    }

    if (!target) {
      return { error: "Not found" };
    }

    const [created] = await db
      .insert(reports)
      .values({
        reporterId: userId,
        targetType,
        targetId,
        targetUserId: target.targetUserId,
        reason,
        details: details ?? null,
        contentSnapshot: target.contentSnapshot,
      })
      .onConflictDoNothing()
      .returning({ id: reports.id });

    // Reporting the same thing twice is not an error for the reporter
    if (created) {
      revalidateLocalized("/admin/reports", "/admin");
    }

    return { success: true };
  } catch (error) {
    console.error("Error submitting report:", error);
    return { error: "Failed to submit report" };
  }
}

/**
 * Report a user. Input: `{ targetId: userId, reason, details? }`
 */
export async function reportUser(input: unknown) {
  return submitReport("user", input);
}

/**
 * Report a public review. Input: `{ targetId: reviewId, reason, details? }`
 */
export async function reportReview(input: unknown) {
  return submitReport("review", input);
}
