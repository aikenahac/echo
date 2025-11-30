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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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
    role: userRoleEnum("role").default("user").notNull(),
    isPremium: boolean("is_premium").default(false).notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    premiumSince: timestamp("premium_since"),
    subscriptionAnniversary: timestamp("subscription_anniversary"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    usernameIdx: index("users_username_idx").on(table.username),
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    isbnIdx: index("books_isbn_idx").on(table.isbn),
    titleIdx: index("books_title_idx").on(table.title),
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
    userIdIdx: index("user_books_user_id_idx").on(table.userId),
    bookIdIdx: index("user_books_book_id_idx").on(table.bookId),
    statusIdx: index("user_books_status_idx").on(table.status),
    favoriteIdx: index("user_books_favorite_idx").on(table.isFavorite),
    userBookIdx: index("user_books_user_book_idx").on(
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
    userIdIdx: index("reviews_user_id_idx").on(table.userId),
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
    followerIdx: index("follows_follower_idx").on(table.followerId),
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

// Subscription Plans table
export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    stripePriceId: text("stripe_price_id").unique(),
    stripeProductId: text("stripe_product_id"),
    price: integer("price").notNull().default(0), // Price in cents
    interval: billingIntervalEnum("interval").notNull().default("free"),
    features: text("features"), // JSON string: {"maxBooksPerYear": 50}
    isActive: boolean("is_active").default(true).notNull(),
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
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripeCustomerId: text("stripe_customer_id"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    canceledAt: timestamp("canceled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_subscriptions_user_id_idx").on(table.userId),
    statusIdx: index("user_subscriptions_status_idx").on(table.status),
    stripeSubIdx: index("user_subscriptions_stripe_sub_idx").on(
      table.stripeSubscriptionId,
    ),
  }),
);

// Subscription Usage table
export const subscriptionUsage = pgTable(
  "subscription_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    booksAdded: integer("books_added").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userPeriodIdx: index("subscription_usage_user_period_idx").on(
      table.userId,
      table.periodStart,
    ),
    periodEndIdx: index("subscription_usage_period_end_idx").on(table.periodEnd),
  }),
);

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
    userIdIdx: index("collections_user_id_idx").on(table.userId),
    slugIdx: index("collections_slug_idx").on(table.slug),
    userSlugIdx: index("collections_user_slug_idx").on(table.userId, table.slug),
    isPublicIdx: index("collections_is_public_idx").on(table.isPublic),
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
    collectionIdIdx: index("collection_books_collection_id_idx").on(
      table.collectionId,
    ),
    userBookIdIdx: index("collection_books_user_book_id_idx").on(
      table.userBookId,
    ),
    uniqueCollectionBook: index("collection_books_unique_idx").on(
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
    userIdIdx: index("collection_follows_user_id_idx").on(table.userId),
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
  usageRecords: many(subscriptionUsage),
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

export const subscriptionUsageRelations = relations(
  subscriptionUsage,
  ({ one }) => ({
    user: one(users, {
      fields: [subscriptionUsage.userId],
      references: [users.id],
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
