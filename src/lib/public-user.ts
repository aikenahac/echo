import { sql } from "drizzle-orm";
import { users } from "@/db/schema";

/**
 * Columns of another user that are safe to expose publicly (no email/role).
 * Use with relational queries, together with publicUserExtras:
 * `with: { user: { columns: publicUserColumns, extras: publicUserExtras } }`
 */
export const publicUserColumns = {
  id: true,
  username: true,
  displayName: true,
  profilePictureUrl: true,
  profilePictureBlurhash: true,
} as const;

/** True for system administrators; the role itself stays private */
export const isAdminSql = (role: typeof users.role) =>
  sql<boolean>`${role} = 'admin'`;

/**
 * Derived public fields for relational queries. A function so the column
 * resolves to the query's table alias inside nested `with` relations.
 */
export const publicUserExtras = (table: typeof users._.columns) => ({
  isAdmin: isAdminSql(table.role).as("is_admin"),
});

/** A user as selected with publicUserColumns and publicUserExtras. */
export type PublicUser = {
  id: string;
  username: string | null;
  displayName: string | null;
  profilePictureUrl: string | null;
  profilePictureBlurhash: string | null;
  isAdmin: boolean;
};
