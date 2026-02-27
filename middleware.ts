import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { createLocalizedUrl, parseLocalePath } from "@/lib/utils/locale";

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware({
  locales: ["en", "es"],
  defaultLocale: "en",
});

// Define allowed roles
const ALLOWED_ROLES = ["director", "manager", "operator", "admin", "org_admin"];

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/:locale/dashboard(.*)",
  "/:locale/documents(.*)",
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals (but NOT API routes)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    (pathname.includes(".") && !pathname.startsWith("/api"))
  ) {
    return NextResponse.next();
  }

  // For API routes, just let Clerk process auth but don't apply intl middleware
  if (pathname.startsWith("/api")) {
    // Clerk will still process auth, but we return early to skip intl middleware
    // This allows auth() to work in API routes
    return NextResponse.next();
  }

  // Parse locale and path using utility function
  const { locale, pathWithoutLocale, hasLocalePrefix } =
    parseLocalePath(pathname);

  // Get user from Clerk
  const { userId, orgId } = await auth();
  const userIsAuthenticated = !!userId;

  // Handle home page access - redirect authenticated users to their dashboard
  if (pathWithoutLocale === "/" && userIsAuthenticated && orgId) {
    console.log("Authenticated user accessing home page, redirecting");
    try {
      // Get organization info to determine user type
      const authData = await auth();
      const sessionClaims = authData.sessionClaims as
        | {
            o?: {
              rol?: string;
            };
            org_metadata?: {
              org_type?: string;
            };
          }
        | undefined;

      // Check user role first
      const userRole = sessionClaims?.o?.rol;

      // If user doesn't have an allowed role, redirect to no-access
      if (userRole && !ALLOWED_ROLES.includes(userRole)) {
        console.log(
          `User with role '${userRole}' redirected to no-access from home`,
        );
        const noAccessUrl = createLocalizedUrl(
          "no-access",
          locale,
          request.url,
        );
        return NextResponse.redirect(noAccessUrl);
      }

      // Access org metadata from session claims
      if (sessionClaims?.org_metadata?.org_type) {
        const dashboardUrl = createLocalizedUrl(
          `dashboard`,
          locale,
          request.url,
        );
        return NextResponse.redirect(dashboardUrl);
      }
    } catch (error) {
      // If profile fetch fails, continue to home page
      console.error("Error fetching user organization in middleware", error);
    }
  }

  // Check if the current path is a protected route
  if (isProtectedRoute(request)) {
    // Protect the route
    await auth.protect();

    // If user is authenticated, check their role
    if (userIsAuthenticated && orgId) {
      try {
        const authData = await auth();
        const sessionClaims = authData.sessionClaims as
          | {
              o?: {
                rol?: string;
              };
              org_metadata?: {
                org_type?: string;
              };
            }
          | undefined;

        // Check if user has an allowed role
        const userRole = sessionClaims?.o?.rol;
        console.log(userRole);
        if (userRole && !ALLOWED_ROLES.includes(userRole)) {
          console.log(`User with role '${userRole}' denied access`);
          const noAccessUrl = createLocalizedUrl(
            "no-access",
            locale,
            request.url,
          );
          return NextResponse.redirect(noAccessUrl);
        }
      } catch (error) {
        // If organization fetch fails for role check, log error but allow access
        // This prevents blocking legitimate users if API is temporarily unavailable
        console.error(
          "Error fetching organization for role verification",
          error,
        );
      }
    }
  }

  // Handle paths without locale prefix - redirect to include locale
  if (!hasLocalePrefix && pathWithoutLocale !== "/") {
    const localizedUrl = createLocalizedUrl(
      pathWithoutLocale,
      locale,
      request.url,
    );
    return NextResponse.redirect(localizedUrl);
  }

  // Apply internationalization middleware for all other requests
  return intlMiddleware(request);
});

export const config = {
  // Match all routes including API routes for Clerk auth
  matcher: ["/((?!_next|_vercel).*)", "/", "/(api|trpc)(.*)"],
};
