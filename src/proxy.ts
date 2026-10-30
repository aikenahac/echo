import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  "/:locale/library(.*)",
  "/:locale/profile(.*)",
  "/:locale/feed(.*)",
  "/:locale/search(.*)",
  "/:locale/books/search(.*)",
  "/:locale/users/search(.*)",
  "/:locale/settings(.*)",
  "/:locale/subscription(.*)",
  "/:locale/redeem(.*)",
  "/:locale/admin(.*)",
]);

const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Skip intl middleware for API routes
  if (isApiRoute(req)) {
    // API routes still get Clerk auth but no locale handling
    return;
  }

  // Check auth first so unauthenticated requests skip the intl work
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Run next-intl middleware for non-API routes
  return intlMiddleware(req);
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and webhook routes
    // BUT include API routes (except webhooks) for Clerk authentication.
    // Paths under /en/ always run the proxy even with a file extension: the
    // locale layout calls auth(), so a probe like /en/x.zip must not skip it.
    "/((?!_next|api/webhooks|(?!en/)[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
