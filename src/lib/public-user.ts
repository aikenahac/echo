/**
 * Columns of another user that are safe to expose publicly (no email/role).
 * Use with relational queries: `with: { user: { columns: publicUserColumns } }`
 */
export const publicUserColumns = {
  id: true,
  username: true,
  displayName: true,
  profilePictureUrl: true,
  profilePictureBlurhash: true,
} as const;

/** A user as selected with publicUserColumns. */
export type PublicUser = {
  id: string;
  username: string | null;
  displayName: string | null;
  profilePictureUrl: string | null;
  profilePictureBlurhash: string | null;
};
