import { cache } from "react";
import { db } from "@/db";
import {
  collectionBooks,
  collections,
  follows,
  reviews,
  userBooks,
  users,
} from "@/db/schema";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { canSee, type Relationship } from "@/lib/audience";
import { isBlockedEitherWay } from "@/lib/blocks";
import { publicUserColumns, publicUserExtras } from "@/lib/public-user";
import { getProfileShelves, getYearStats } from "@/lib/reading-stats";

type VisibilitySetting =
  | "profileVisibility"
  | "activityVisibility"
  | "reviewVisibility";

/**
 * A condition on `ownerId` (a user id column of the queried table) that holds
 * for owners whose `setting` lets `viewerId` see that part of their profile.
 * For queries over many owners; single profiles use getProfileAccess.
 */
export function visibleTo(
  ownerId: AnyPgColumn,
  setting: VisibilitySetting,
  viewerId: string,
): SQL {
  const audience = users[setting];
  const viewerFollows = db
    .select({ id: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, viewerId));
  const followsViewer = db
    .select({ id: follows.followerId })
    .from(follows)
    .where(eq(follows.followingId, viewerId));

  return inArray(
    ownerId,
    db
      .select({ id: users.id })
      .from(users)
      .where(
        or(
          eq(users.id, viewerId),
          eq(audience, "public"),
          and(eq(audience, "followers"), inArray(users.id, viewerFollows)),
          and(
            eq(audience, "friends"),
            inArray(users.id, viewerFollows),
            inArray(users.id, followsViewer),
          ),
        ),
      ),
  );
}

/** How the viewer relates to `targetId`. Cached per request. */
export const getRelationship = cache(
  async (viewerId: string, targetId: string): Promise<Relationship> => {
    if (viewerId === targetId) {
      return { isSelf: true, isFollowing: false, followsYou: false, isFriend: false };
    }
    const rows = await db
      .select({ followerId: follows.followerId })
      .from(follows)
      .where(
        or(
          and(eq(follows.followerId, viewerId), eq(follows.followingId, targetId)),
          and(eq(follows.followerId, targetId), eq(follows.followingId, viewerId)),
        ),
      );
    const isFollowing = rows.some((r) => r.followerId === viewerId);
    const followsYou = rows.some((r) => r.followerId === targetId);
    return {
      isSelf: false,
      isFollowing,
      followsYou,
      isFriend: isFollowing && followsYou,
    };
  },
);

/**
 * A user's public header, how the viewer relates to them and which parts of
 * their profile the viewer may see; null when missing or blocked either way.
 * `idOrUsername` is a user id or an exact username. Cached per request.
 */
export const getProfileAccess = cache(
  async (viewerId: string, idOrUsername: string) => {
    const user = await db.query.users.findFirst({
      where: or(eq(users.id, idOrUsername), eq(users.username, idOrUsername)),
      columns: {
        ...publicUserColumns,
        bio: true,
        profileVisibility: true,
        activityVisibility: true,
        reviewVisibility: true,
      },
      extras: publicUserExtras,
    });

    if (!user || (await isBlockedEitherWay(viewerId, user.id))) return null;

    const relationship = await getRelationship(viewerId, user.id);
    const { profileVisibility, activityVisibility, reviewVisibility, ...header } =
      user;

    return {
      user: header,
      relationship,
      access: {
        content: canSee(profileVisibility, relationship),
        activity: canSee(activityVisibility, relationship),
        reviews: canSee(reviewVisibility, relationship),
      },
      // What the owner chose, so a locked section can say who it's for
      visibility: {
        content: profileVisibility,
        activity: activityVisibility,
        reviews: reviewVisibility,
      },
    };
  },
);

export type ProfileAccess = NonNullable<
  Awaited<ReturnType<typeof getProfileAccess>>
>;

/**
 * Everything on a user's profile the viewer may see: the header and follow
 * counts always, shelves, stats and public collections when profile content
 * is visible to them. Null when missing or blocked either way.
 */
export async function getProfileView(viewerId: string, idOrUsername: string) {
  const profile = await getProfileAccess(viewerId, idOrUsername);
  if (!profile) return null;

  const userId = profile.user.id;

  const [counts, content] = await Promise.all([
    getFollowCounts(userId),
    profile.access.content ? getProfileContent(userId) : null,
  ]);

  return { ...profile, ...counts, content };
}

/** How many readers follow `userId` and how many they follow */
export async function getFollowCounts(userId: string) {
  const [[followers], [following]] = await Promise.all([
    db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, userId)),
    db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followerId, userId)),
  ]);
  return {
    followerCount: followers?.count ?? 0,
    followingCount: following?.count ?? 0,
  };
}

export type ProfileView = NonNullable<
  Awaited<ReturnType<typeof getProfileView>>
>;

async function getProfileContent(userId: string) {
  const [yearStats, shelves, publicCollections] = await Promise.all([
    getYearStats(userId),
    getProfileShelves(userId),
    db
      .select({
        ...getTableColumns(collections),
        bookCount: count(collectionBooks.userBookId),
      })
      .from(collections)
      .leftJoin(
        collectionBooks,
        eq(collectionBooks.collectionId, collections.id),
      )
      .where(
        and(eq(collections.userId, userId), eq(collections.isPublic, true)),
      )
      .groupBy(collections.id)
      .orderBy(asc(collections.sortOrder)),
  ]);

  return { yearStats, shelves, publicCollections };
}

export const PROFILE_SHELVES = ["reading", "want", "finished", "favourites"] as const;
export type ProfileShelf = (typeof PROFILE_SHELVES)[number];

export function isProfileShelf(value: unknown): value is ProfileShelf {
  return PROFILE_SHELVES.includes(value as ProfileShelf);
}

/** One page of a user's shelf, with the catalog book. Check access first. */
export async function getUserShelfPage(
  userId: string,
  shelf: ProfileShelf,
  offset: number,
  limit: number,
) {
  const [where, orderBy] = (
    {
      reading: [eq(userBooks.status, "reading"), desc(userBooks.updatedAt)],
      want: [eq(userBooks.status, "want"), desc(userBooks.createdAt)],
      finished: [
        eq(userBooks.status, "finished"),
        sql`${userBooks.finishedAt} desc nulls last`,
      ],
      favourites: [eq(userBooks.isFavorite, true), desc(userBooks.updatedAt)],
    } satisfies Record<ProfileShelf, [SQL, SQL]>
  )[shelf];

  const rows = await db.query.userBooks.findMany({
    where: and(eq(userBooks.userId, userId), where),
    with: { book: true },
    orderBy: [orderBy, asc(userBooks.id)],
    limit: limit + 1,
    offset,
  });

  return { results: rows.slice(0, limit), hasMore: rows.length > limit };
}

/** One page of a user's reviews not marked private. Check access first. */
export async function getUserReviewsPage(
  userId: string,
  offset: number,
  limit: number,
) {
  const rows = await db.query.reviews.findMany({
    where: and(eq(reviews.userId, userId), eq(reviews.isPrivate, false)),
    with: { book: true },
    orderBy: [desc(reviews.createdAt), asc(reviews.id)],
    limit: limit + 1,
    offset,
  });

  return { results: rows.slice(0, limit), hasMore: rows.length > limit };
}

export type UserReview = Awaited<
  ReturnType<typeof getUserReviewsPage>
>["results"][number];
