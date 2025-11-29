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
    } catch (error: any) {
      console.error("API Handler Error:", error);
      return createErrorResponse(
        error.message || "Internal server error",
        error.status || 500,
      );
    }
  };
}
