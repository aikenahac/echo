import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  uuid,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Enums
export const readingStatusEnum = pgEnum("reading_status", [
  "want",
  "reading",
  "finished",
]);

export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "admin"]);

export const billingIntervalEnum = pgEnum("billing_interval", [
  "month",
  "year",
  "lifetime",
  "free",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "unpaid",
  "trialing",
  "incomplete",
]);

// Users table
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // Clerk user ID
    email: text("email").notNull().unique(),
    username: text("username").unique(),
    bio: text("bio"),
    displayName: text("display_name"),
    profilePictureUrl: text("profile_picture_url"),
    role: userRoleEnum("role").default("user").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // email and username are already indexed by their unique constraints
    roleIdx: index("users_role_idx").on(table.role),
  }),
);

// Books table
export const books = pgTable(
  "books",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    isbn: text("isbn").unique(),
    title: text("title").notNull(),
    author: text("author").notNull(),
    coverUrl: text("cover_url"),
    pages: integer("pages"),
    publishedYear: integer("published_year"),
    // Open Library work key (e.g. /works/OL45804W); unique, so a work is one row
    olWorkKey: text("ol_work_key").unique(),
    olCoverId: integer("ol_cover_id"),
    // Set once the server has re-fetched the work from Open Library itself
    olVerifiedAt: timestamp("ol_verified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // isbn and ol_work_key are already indexed by their unique constraints.
    // Trigram indexes back the `ilike '%query%'` book search.
    titleTrgmIdx: index("books_title_trgm_idx").using(
      "gin",
      sql`${table.title} gin_trgm_ops`,
    ),
    authorTrgmIdx: index("books_author_trgm_idx").using(
      "gin",
      sql`${table.author} gin_trgm_ops`,
    ),
    titleAuthorIdx: index("books_title_author_idx").on(
      table.title,
      table.author,
    ),
  }),
);

// Open Library search results as first seen by a client. Kept indefinitely:
// repeat searches are answered from here, and it is the dataset we search
// ourselves once Open Library is unplugged.
export const olSearchSnapshots = pgTable(
  "ol_search_snapshots",
  {
    query: text("query").notNull(), // normalized, see normalizeQuery()
    page: integer("page").notNull(),
    workKeys: text("work_keys").array().notNull(),
    numFound: integer("num_found").notNull().default(0),
    submittedBy: text("submitted_by"), // so a poisoned query can be purged
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.query, table.page] }),
  }),
);

// User Books (reading list/library)
export const userBooks = pgTable(
  "user_books",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    status: readingStatusEnum("status").notNull().default("want"),
    currentPage: integer("current_page").default(0),
    pageCount: integer("page_count").default(0),
    rating: integer("rating"), // 1-5
    isFavorite: boolean("is_favorite").default(false).notNull(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    bookIdIdx: index("user_books_book_id_idx").on(table.bookId),
    userStatusIdx: index("user_books_user_status_idx").on(
      table.userId,
      table.status,
    ),
    // A book can only be in a user's library once (also covers lookups by user)
    userBookIdx: uniqueIndex("user_books_user_book_idx").on(
      table.userId,
      table.bookId,
    ),
  }),
);

// Reviews table
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isPrivate: boolean("is_private").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // One review per user per book (also covers lookups by user)
    userBookIdx: uniqueIndex("reviews_user_book_idx").on(
      table.userId,
      table.bookId,
    ),
    bookIdIdx: index("reviews_book_id_idx").on(table.bookId),
  }),
);

// Follows table
export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.followerId, table.followingId] }),
    // Lookups by follower are covered by the primary key
    followingIdx: index("follows_following_idx").on(table.followingId),
  }),
);

// Audit Logs table
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // e.g., "user.role.update", "review.delete"
    targetId: text("target_id"),
    targetType: text("target_type"), // "user", "review", "book"
    metadata: text("metadata"), // JSON string
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  }),
);

// Support tickets submitted from the public /support page
export const supportTicketStatusEnum = pgEnum("support_ticket_status", [
  "open",
  "in_progress",
  "resolved",
]);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    message: text("message").notNull(),
    status: supportTicketStatusEnum("status").default("open").notNull(),
    internalNote: text("internal_note"),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
    deletedAt: timestamp("deleted_at"), // soft delete
  },
  (table) => ({
    statusIdx: index("support_tickets_status_idx").on(table.status),
    createdAtIdx: index("support_tickets_created_at_idx").on(table.createdAt),
  }),
);

// Subscription Plans table
export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    lemonSqueezyVariantId: text("ls_variant_id").unique(), // Lemon Squeezy variant; nullable for free/internal plans
    lemonSqueezyProductId: text("ls_product_id"),
    price: integer("price").notNull().default(0), // Price in cents
    interval: billingIntervalEnum("interval").notNull().default("free"),
    isActive: boolean("is_active").default(true).notNull(),
    isInternal: boolean("is_internal").default(false).notNull(), // Internal plans not shown on subscription page
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    activeIdx: index("subscription_plans_active_idx").on(table.isActive),
    sortOrderIdx: index("subscription_plans_sort_order_idx").on(table.sortOrder),
  }),
);

// User Subscriptions table
export const userSubscriptions = pgTable(
  "user_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id),
    lemonSqueezySubscriptionId: text("ls_subscription_id").unique(),
    lemonSqueezyCustomerId: text("ls_customer_id"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    canceledAt: timestamp("canceled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // user_id and ls_subscription_id are indexed by their unique constraints
    statusIdx: index("user_subscriptions_status_idx").on(table.status),
    lemonSqueezyCustomerIdx: index("user_subscriptions_ls_customer_idx").on(
      table.lemonSqueezyCustomerId,
    ),
  }),
);

// Processed payment webhook deliveries (for idempotency - Lemon Squeezy retries
// deliveries and events have no ID, so the id is a SHA-256 of the raw body)
export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(), // SHA-256 hex of the raw request body
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Collections table (Premium feature)
export const collections = pgTable(
  "collections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    slug: text("slug").notNull(),
    colorTag: text("color_tag"),
    iconName: text("icon_name"),
    coverImageUrl: text("cover_image_url"),
    isPublic: boolean("is_public").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userSortIdx: index("collections_user_sort_idx").on(
      table.userId,
      table.sortOrder,
    ),
    slugIdx: uniqueIndex("collections_slug_idx").on(table.slug),
    publicCreatedIdx: index("collections_public_created_idx")
      .on(table.createdAt.desc())
      .where(sql`${table.isPublic}`),
  }),
);

// Collection Books junction table (many-to-many)
export const collectionBooks = pgTable(
  "collection_books",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    userBookId: uuid("user_book_id")
      .notNull()
      .references(() => userBooks.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").defaultNow().notNull(),
    notes: text("notes"),
  },
  (table) => ({
    userBookIdIdx: index("collection_books_user_book_id_idx").on(
      table.userBookId,
    ),
    // Also covers lookups by collection
    uniqueCollectionBook: uniqueIndex("collection_books_unique_idx").on(
      table.collectionId,
      table.userBookId,
    ),
  }),
);

// Collection Follows table (social feature)
export const collectionFollows = pgTable(
  "collection_follows",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.collectionId] }),
    // Lookups by user are covered by the primary key
    collectionIdIdx: index("collection_follows_collection_id_idx").on(
      table.collectionId,
    ),
  }),
);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  userBooks: many(userBooks),
  reviews: many(reviews),
  followers: many(follows, { relationName: "following" }),
  following: many(follows, { relationName: "follower" }),
  auditLogs: many(auditLogs),
  subscription: one(userSubscriptions),
  collections: many(collections),
  collectionFollows: many(collectionFollows),
}));

export const booksRelations = relations(books, ({ many }) => ({
  userBooks: many(userBooks),
  reviews: many(reviews),
}));

export const userBooksRelations = relations(userBooks, ({ one, many }) => ({
  user: one(users, {
    fields: [userBooks.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [userBooks.bookId],
    references: [books.id],
  }),
  collectionBooks: many(collectionBooks),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [reviews.bookId],
    references: [books.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const subscriptionPlansRelations = relations(
  subscriptionPlans,
  ({ many }) => ({
    subscriptions: many(userSubscriptions),
  }),
);

export const userSubscriptionsRelations = relations(
  userSubscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [userSubscriptions.userId],
      references: [users.id],
    }),
    plan: one(subscriptionPlans, {
      fields: [userSubscriptions.planId],
      references: [subscriptionPlans.id],
    }),
  }),
);


export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, {
    fields: [collections.userId],
    references: [users.id],
  }),
  books: many(collectionBooks),
  follows: many(collectionFollows),
}));

export const collectionBooksRelations = relations(collectionBooks, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionBooks.collectionId],
    references: [collections.id],
  }),
  userBook: one(userBooks, {
    fields: [collectionBooks.userBookId],
    references: [userBooks.id],
  }),
}));

export const collectionFollowsRelations = relations(
  collectionFollows,
  ({ one }) => ({
    user: one(users, {
      fields: [collectionFollows.userId],
      references: [users.id],
    }),
    collection: one(collections, {
      fields: [collectionFollows.collectionId],
      references: [collections.id],
    }),
  }),
);
