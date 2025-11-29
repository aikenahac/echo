import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type UserRole = "user" | "moderator" | "admin";

/**
 * Get the currently authenticated user from the database
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  return user;
}

/**
 * Require authentication - throws error if user is not authenticated
 * @returns User object
 * @throws Error if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Require specific role(s) - throws error if user doesn't have required role
 * @param allowedRoles Array of roles that are allowed
 * @returns User object
 * @throws Error if user doesn't have required role
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role as UserRole)) {
    throw new Error("Forbidden: Insufficient permissions");
  }

  return user;
}

/**
 * Check if current user is an admin
 * @returns true if user is an admin, false otherwise
 */
export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

/**
 * Check if current user is a moderator or admin
 * @returns true if user is a moderator or admin, false otherwise
 */
export async function isModerator() {
  const user = await getCurrentUser();
  return user?.role === "moderator" || user?.role === "admin";
}

/**
 * Check if a user role has permission to perform an action requiring a specific role
 * Uses role hierarchy: admin > moderator > user
 * @param userRole The user's current role
 * @param requiredRole The minimum required role
 * @returns true if user has permission
 */
export function hasPermission(
  userRole: UserRole,
  requiredRole: UserRole,
): boolean {
  const roleHierarchy = { user: 0, moderator: 1, admin: 2 };
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
