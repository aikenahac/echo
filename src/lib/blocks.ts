import { cache } from "react";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { blocks } from "@/db/schema";

/**
 * Ids of every user hidden from `userId`: users they blocked and users who
 * blocked them. Blocking hides both sides from each other. Cached per request.
 */
export const getBlockedIds = cache(async (userId: string) => {
  const rows = await db
    .select({ blockerId: blocks.blockerId, blockedId: blocks.blockedId })
    .from(blocks)
    .where(or(eq(blocks.blockerId, userId), eq(blocks.blockedId, userId)));

  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.blockerId === userId ? row.blockedId : row.blockerId);
  }
  return [...ids];
});

/** True when either user has blocked the other */
export async function isBlockedEitherWay(a: string, b: string) {
  const row = await db.query.blocks.findFirst({
    where: or(
      and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)),
      and(eq(blocks.blockerId, b), eq(blocks.blockedId, a)),
    ),
    columns: { blockerId: true },
  });
  return Boolean(row);
}
