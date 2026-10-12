/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import {
  authenticateApiRequest,
  createErrorResponse,
} from "@/lib/api-auth";
import { UserRole } from "@/lib/auth";

type RouteHandler = (
  request: NextRequest,
  context: { user: any; params?: any },
) => Promise<Response>;

/**
 * An error whose message is safe to return to the API client.
 * Any other error thrown from a handler results in a generic 500.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Convert a server action's `{ error }` message into an ApiError with a
 * matching HTTP status
 */
export function actionError(message: string) {
  if (/not found/i.test(message)) return new ApiError(message, 404);
  if (/premium|unauthorized/i.test(message)) return new ApiError(message, 403);
  return new ApiError(message, 400);
}

interface WithAuthOptions {
  requiredRole?: UserRole;
}

/**
 * Higher-order function that wraps API route handlers with authentication and authorization
 * @param handler The route handler function to wrap
 * @param options Optional configuration (e.g., required role)
 * @returns Wrapped handler with auth checks
 *
 * @example
 * export const GET = withAuth(async (request, { user }) => {
 *   return createApiResponse({ data: "Hello " + user.email });
 * });
 *
 * @example
 * export const DELETE = withAuth(async (request, { user, params }) => {
 *   // Only admins can delete
 *   return createApiResponse({ success: true });
 * }, { requiredRole: "admin" });
 */
export function withAuth(
  handler: RouteHandler,
  options?: WithAuthOptions,
) {
  return async (
    request: NextRequest,
    context?: { params: Promise<any> | any },
  ) => {
    const auth = await authenticateApiRequest(request);

    if (!auth) {
      return createErrorResponse("Unauthorized", 401);
    }

    // Check role requirement if specified
    if (options?.requiredRole) {
      const roleHierarchy = { user: 0, moderator: 1, admin: 2 };
      const userRoleLevel = roleHierarchy[auth.user.role as UserRole] || 0;
      const requiredLevel = roleHierarchy[options.requiredRole];

      if (userRoleLevel < requiredLevel) {
        return createErrorResponse("Forbidden: Insufficient permissions", 403);
      }
    }

    try {
      // Await params if it's a promise (Next.js 15+ pattern)
      const params = context?.params
        ? await Promise.resolve(context.params)
        : undefined;

      return await handler(request, { user: auth.user, params });
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        return createErrorResponse(error.message, error.status);
      }
      // Malformed JSON request body
      if (error instanceof SyntaxError) {
        return createErrorResponse("Invalid JSON body", 400);
      }
      console.error("API Handler Error:", error);
      return createErrorResponse("Internal server error", 500);
    }
  };
}

/**
 * Parse an integer query parameter, falling back to `fallback` when missing or
 * invalid and clamping the result to [min, max].
 */
export function parseIntParam(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = value === null ? NaN : Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
