import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { users, books, userBooks, reviews, follows } from "@/db/schema";

// Select types (data from database)
export type User = InferSelectModel<typeof users>;
export type Book = InferSelectModel<typeof books>;
export type UserBookWithoutBook = InferSelectModel<typeof userBooks>;
export type Review = InferSelectModel<typeof reviews>;
export type Follow = InferSelectModel<typeof follows>;

// Insert types (data to insert into database)
export type InsertUser = InferInsertModel<typeof users>;
export type InsertBook = InferInsertModel<typeof books>;
export type InsertUserBook = InferInsertModel<typeof userBooks>;
export type InsertReview = InferInsertModel<typeof reviews>;
export type InsertFollow = InferInsertModel<typeof follows>;

// Common composite types
export type UserBook = UserBookWithoutBook & {
  book: Book;
};

export type ReviewWithUser = Review & {
  user: User;
};

export type ReviewWithBook = Review & {
  book: Book;
};

export type UserBookWithDetails = UserBook & {
  book: Book;
  user: User;
};

// Reading status type
export type ReadingStatus = UserBook["status"];
