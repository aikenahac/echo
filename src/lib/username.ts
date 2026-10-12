// Username rules, shared by the profile server actions and the API

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

/**
 * Validate a username's format. Returns an error message, or null if valid.
 * Uniqueness is checked separately against the database.
 */
export function usernameFormatError(username: string): string | null {
  if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
    return "Username can only contain letters, numbers, underscores, and dots";
  }
  if (username.length < USERNAME_MIN_LENGTH) {
    return "Username must be at least 3 characters long";
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return "Username must be at most 30 characters long";
  }
  return null;
}
