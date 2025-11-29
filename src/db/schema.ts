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

// Users table
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // Clerk user ID
    email: text("email").notNull().unique(),
    username: text("username").unique(),
    bio: text("bio"),
    isPremium: boolean("is_premium").default(false).notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    usernameIdx: index("users_username_idx").on(table.username),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userBooks: many(userBooks),
  reviews: many(reviews),
  followers: many(follows, { relationName: "following" }),
  following: many(follows, { relationName: "follower" }),
}));

export const booksRelations = relations(books, ({ many }) => ({
  userBooks: many(userBooks),
  reviews: many(reviews),
}));

export const userBooksRelations = relations(userBooks, ({ one }) => ({
  user: one(users, {
    fields: [userBooks.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [userBooks.bookId],
    references: [books.id],
  }),
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
