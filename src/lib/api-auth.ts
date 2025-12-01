import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { verifyToken } from "@clerk/backend";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Create a user in the database from Clerk user data
 * @param userId The Clerk user ID
 * @returns The created or existing user
 */
async function ensureUserExists(userId: string) {
  // First check if user already exists
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user) {
    return user;
  }

  // User doesn't exist, fetch from Clerk and create
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);

  if (!clerkUser) {
    return null;
  }

  // Create user in database
  const [newUser] = await db.insert(users).values({
    id: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || "",
    username: clerkUser.username || null,
    bio: "",
  }).returning();

  return newUser;
}

/**
 * Authenticate an API request using Clerk session tokens or Bearer tokens
 * Supports both session-based auth (cookies) and Bearer token authentication
 * @param request The Next.js request object
 * @returns Object with user and authentication method, or null if not authenticated
 */
export async function authenticateApiRequest(request: NextRequest) {
  // First, check for Bearer token in Authorization header
  const authHeader = request.headers.get("authorization");


  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    try {
      // Verify the JWT token with Clerk
      const verifiedToken = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });

      if (verifiedToken?.sub) {
        const user = await ensureUserExists(verifiedToken.sub);

        if (user) {
          return { user, method: "bearer" as const };
        } else {
          console.log("Failed to create/find user");
        }
      } else {
        console.log("No sub claim in verified token");
      }
    } catch (error) {
      console.error("Bearer token verification failed:", error);
      console.error("Error details:", error instanceof Error ? error.message : error);
      // Continue to try session-based auth as fallback
    }
  }

  // Fallback to session-based authentication (cookies)
  const { userId } = await auth();

  if (userId) {
    const user = await ensureUserExists(userId);

    if (user) {
      return { user, method: "session" as const };
    }
  }

  return null;
}

/**
 * Create a standardized JSON API response
 * @param data The data to return
 * @param status HTTP status code (default: 200)
 * @returns Response object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createApiResponse(data: any, status = 200) {
  return Response.json(data, { status });
}

/**
 * Create a standardized error response
 * @param message Error message
 * @param status HTTP status code (default: 400)
 * @returns Response object with error
 */
export function createErrorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
