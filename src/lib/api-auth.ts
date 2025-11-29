import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Authenticate an API request using Clerk session tokens
 * External applications that use Clerk can pass their session tokens
 * @param request The Next.js request object
 * @returns Object with user and authentication method, or null if not authenticated
 */
export async function authenticateApiRequest(request: NextRequest) {
  // Check for Clerk session token (from external apps using Clerk)
  const { userId } = await auth();

  if (userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

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
