/**
 * Columns of another user that are safe to expose publicly (no email/role).
 * Use with relational queries: `with: { user: { columns: publicUserColumns } }`
 */
export const publicUserColumns = {
  id: true,
  username: true,
  displayName: true,
  profilePictureUrl: true,
} as const;
