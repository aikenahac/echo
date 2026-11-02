import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  books,
  collections,
  follows,
  notificationEvents,
  pushTokens,
  reviews,
  users,
} from "@/db/schema";
import type { Audience } from "@/lib/audience";
import { getBlockedIds } from "@/lib/blocks";

// Push notifications through the Expo Push API
// (https://docs.expo.dev/push-notifications/sending-notifications/).
// Only tickets are checked: there is no scheduled job to fetch receipts later,
// so a token that stops working after delivery is dropped on a later send.

let expoClient: Expo | null = null;

// Created lazily so `next build` works without the access token
function getExpo() {
  if (!expoClient) {
    expoClient = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN || undefined });
  }
  return expoClient;
}

/** Notification categories; each is a Settings toggle and an Android channel */
export const NOTIFICATION_CATEGORIES = [
  "follows",
  "activity",
  "reviews",
  "collectionFollows",
  "announcements",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/** The users column holding each category's toggle */
const preferenceField = {
  follows: "notifyFollows",
  activity: "notifyActivity",
  reviews: "notifyReviews",
  collectionFollows: "notifyCollectionFollows",
  announcements: "notifyAnnouncements",
} as const satisfies Record<NotificationCategory, keyof typeof users.$inferSelect>;

export type NotificationPreference =
  (typeof preferenceField)[NotificationCategory];

export const NOTIFICATION_PREFERENCES = Object.values(preferenceField);

export type PushInput = {
  userIds: string[];
  category: NotificationCategory;
  title: string;
  body: string;
  /** App path opened on tap, e.g. "/user/abc" */
  url?: string;
  /** Sends only the first time this key is seen */
  dedupeKey?: string;
};

export type PushResult = {
  /** Recipients who allow the category and have at least one device */
  recipients: number;
  devices: number;
  sent: number;
  failed: number;
};

const emptyResult: PushResult = { recipients: 0, devices: 0, sent: 0, failed: 0 };

/** Claims a dedupe key; false when the event was already notified */
async function claimEvent(key: string) {
  const [created] = await db
    .insert(notificationEvents)
    .values({ key })
    .onConflictDoNothing()
    .returning();
  return Boolean(created);
}

/**
 * Sends a notification to every device of `userIds` that allow `category`.
 * Tokens Expo reports as no longer registered are deleted.
 */
export async function sendPush(input: PushInput): Promise<PushResult> {
  if (input.userIds.length === 0) return emptyResult;
  if (input.dedupeKey && !(await claimEvent(input.dedupeKey))) {
    return emptyResult;
  }

  const rows = await db
    .select({ token: pushTokens.token, userId: pushTokens.userId })
    .from(pushTokens)
    .innerJoin(users, eq(users.id, pushTokens.userId))
    .where(
      and(
        inArray(pushTokens.userId, input.userIds),
        eq(users[preferenceField[input.category]], true),
      ),
    );

  const tokens = rows.filter((row) => Expo.isExpoPushToken(row.token));
  const result: PushResult = {
    recipients: new Set(tokens.map((row) => row.userId)).size,
    devices: tokens.length,
    sent: 0,
    failed: 0,
  };
  if (tokens.length === 0) return result;

  const expo = getExpo();
  const messages: ExpoPushMessage[] = tokens.map((row) => ({
    to: row.token,
    title: input.title,
    body: input.body,
    data: input.url ? { url: input.url } : {},
    sound: "default",
    channelId: input.category,
  }));

  const unregistered: string[] = [];
  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === "ok") {
          result.sent++;
          return;
        }
        result.failed++;
        if (ticket.details?.error === "DeviceNotRegistered") {
          const to = chunk[i]?.to;
          if (typeof to === "string") unregistered.push(to);
        }
      });
    } catch (error) {
      console.error("Error sending push notifications:", error);
      result.failed += chunk.length;
    }
  }

  if (unregistered.length > 0) {
    await db.delete(pushTokens).where(inArray(pushTokens.token, unregistered));
  }

  return result;
}

/** How a user appears in a notification */
async function getActorName(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { username: true, displayName: true },
  });
  return user?.displayName || user?.username || "Someone";
}

/**
 * Followers of a user who may see a part of their profile shared with
 * `audience`: all followers, followers they follow back (friends) or nobody.
 * Users blocked either way are left out.
 */
export function audienceRecipients(
  audience: Audience,
  followerIds: string[],
  followingIds: string[],
  blockedIds: string[],
) {
  if (audience === "private") return [];
  const blocked = new Set(blockedIds);
  const following = new Set(followingIds);
  return followerIds.filter(
    (id) => !blocked.has(id) && (audience !== "friends" || following.has(id)),
  );
}

/** Followers of `userId` in the audience of their `setting` */
async function getFollowerAudience(
  userId: string,
  setting: "activityVisibility" | "reviewVisibility",
) {
  const owner = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { activityVisibility: true, reviewVisibility: true },
  });
  if (!owner || owner[setting] === "private") return [];

  const [followers, following, blockedIds] = await Promise.all([
    db
      .select({ id: follows.followerId })
      .from(follows)
      .where(eq(follows.followingId, userId)),
    owner[setting] === "friends"
      ? db
          .select({ id: follows.followingId })
          .from(follows)
          .where(eq(follows.followerId, userId))
      : Promise.resolve([]),
    getBlockedIds(userId),
  ]);

  return audienceRecipients(
    owner[setting],
    followers.map((row) => row.id),
    following.map((row) => row.id),
    blockedIds,
  );
}

// Event notifications. Each runs after the response (in `after()`) and never
// throws into the action that triggered it.

export async function notifyNewFollower(followerId: string, followingId: string) {
  try {
    const name = await getActorName(followerId);
    await sendPush({
      userIds: [followingId],
      category: "follows",
      title: "New follower",
      body: `${name} followed you`,
      url: `/user/${followerId}`,
      dedupeKey: `follow:${followerId}:${followingId}`,
    });
  } catch (error) {
    console.error("Error notifying new follower:", error);
  }
}

export async function notifyReadingActivity(
  userId: string,
  userBookId: string,
  bookId: string,
  kind: "started" | "finished",
) {
  try {
    const [recipients, name, book] = await Promise.all([
      getFollowerAudience(userId, "activityVisibility"),
      getActorName(userId),
      db.query.books.findFirst({
        where: eq(books.id, bookId),
        columns: { title: true },
      }),
    ]);
    if (!book) return;
    await sendPush({
      userIds: recipients,
      category: "activity",
      title: name,
      body: kind === "started"
        ? `Started reading ${book.title}`
        : `Finished ${book.title}`,
      url: `/book/${bookId}`,
      dedupeKey: `${kind}:${userBookId}`,
    });
  } catch (error) {
    console.error("Error notifying reading activity:", error);
  }
}

export async function notifyNewReview(userId: string, reviewId: string) {
  try {
    const review = await db.query.reviews.findFirst({
      where: and(eq(reviews.id, reviewId), eq(reviews.userId, userId)),
      columns: { isPrivate: true, bookId: true },
      with: { book: { columns: { title: true } } },
    });
    if (!review || review.isPrivate) return;

    const [recipients, name] = await Promise.all([
      getFollowerAudience(userId, "reviewVisibility"),
      getActorName(userId),
    ]);
    await sendPush({
      userIds: recipients,
      category: "reviews",
      title: name,
      body: `Reviewed ${review.book.title}`,
      url: `/book/${review.bookId}`,
      dedupeKey: `review:${reviewId}`,
    });
  } catch (error) {
    console.error("Error notifying new review:", error);
  }
}

export async function notifyCollectionFollow(userId: string, collectionId: string) {
  try {
    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
      columns: { userId: true, name: true },
    });
    if (!collection || collection.userId === userId) return;

    const name = await getActorName(userId);
    await sendPush({
      userIds: [collection.userId],
      category: "collectionFollows",
      title: "New collection follower",
      body: `${name} followed ${collection.name}`,
      url: `/collection/${collectionId}`,
      dedupeKey: `colfollow:${userId}:${collectionId}`,
    });
  } catch (error) {
    console.error("Error notifying collection follow:", error);
  }
}
