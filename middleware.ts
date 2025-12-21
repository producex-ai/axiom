import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getUserProfileForMiddleware } from "@/actions/auth";
import {
  getUserType,
  isAuthenticatedWithToken,
  isTokenExpired,
  refreshAccessTokenForMiddleware,
} from "@/lib/auth";
import { createLocalizedUrl, parseLocalePath } from "@/lib/locale-utils";

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware({
  locales: ["en", "es"],
  defaultLocale: "en",
});

// Define protected routes that require authentication for the app
// (we use a single set of app routes now; role-based routes can be reintroduced later)
const protectedRoutes = ["/dashboard", "/document", "/tasks"];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Parse locale and path using utility function
  const { locale, pathWithoutLocale, hasLocalePrefix } =
    parseLocalePath(pathname);

  // Get authentication token
  let token = request.cookies.get("access_token")?.value || null;
  let refreshedToken: string | null = null;

  // If token present but expired, attempt to refresh once
  if (token && isTokenExpired(token)) {
    console.log("Token expired, attempting to refresh");
    refreshedToken = await refreshAccessTokenForMiddleware(
      request.headers.get("cookie") || "",
    );
    if (refreshedToken) {
      token = refreshedToken;
    } else {
      token = null;
    }
  }
  const userIsAuthenticated = isAuthenticatedWithToken(token || undefined);

  // If a token is present, attempt to fetch and log the user's profile
  // for debugging purposes. Use the middleware-compatible helper which
  // accepts the raw token and runs in a server context.
  if (token) {
    try {
      const profile = await getUserProfileForMiddleware(token);
      if (profile) {
        console.log("Middleware: user profile:", profile);
      }
    } catch (e) {
      console.error("Middleware: failed to fetch user profile for logging", e);
    }
  }

  // Prevent redirect loop: allow the login page to load normally without
  // adding a `redirect` query param. This stops middleware from redirecting
  // `/en/login` -> `/en/login?redirect=/en/login` repeatedly.
  const isLoginRoute =
    pathWithoutLocale === "/login" || pathWithoutLocale.startsWith("/login/");
  if (isLoginRoute) {
    const res = intlMiddleware(request);
    if (refreshedToken) {
      res.cookies.set("access_token", refreshedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }
    return res;
  }

  // Handle home page access - redirect authenticated users to the unified dashboard
  if (pathWithoutLocale === "/" && userIsAuthenticated && token) {
    try {
      const dashboardUrl = createLocalizedUrl(
        `/dashboard`,
        locale,
        request.url,
      );
      const res = NextResponse.redirect(dashboardUrl);
      if (refreshedToken) {
        res.cookies.set("access_token", refreshedToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
      }
      return res;
    } catch (e) {
      console.error("Error redirecting to dashboard in middleware", e);
    }
  }

  // Check if the current path (without locale) is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathWithoutLocale.startsWith(route),
  );

  if (isProtectedRoute) {
    // If the route is protected, ensure the user is authenticated.
    if (!userIsAuthenticated) {
      const loginUrl = createLocalizedUrl("/login", locale, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(loginUrl);
      if (refreshedToken) {
        res.cookies.set("access_token", refreshedToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
      }
      return res;
    }
    // Authenticated users are allowed to access the unified app routes.
  }

  // Handle paths without locale prefix - redirect to include locale
  if (!hasLocalePrefix && pathWithoutLocale !== "/") {
    const localizedUrl = createLocalizedUrl(
      pathWithoutLocale,
      locale,
      request.url,
    );
    const res = NextResponse.redirect(localizedUrl);
    if (refreshedToken) {
      res.cookies.set("access_token", refreshedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }
    return res;
  }

  // If the user is not authenticated and is trying to access any route
  // other than the locale root (e.g. `/en`), redirect them to the login page.
  // This enforces a default-app-auth policy while keeping the home/marketing
  // page public.
  if (!userIsAuthenticated && pathWithoutLocale !== "/") {
    const loginUrl = createLocalizedUrl("/login", locale, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const res = NextResponse.redirect(loginUrl);
    if (refreshedToken) {
      res.cookies.set("access_token", refreshedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }
    return res;
  }

  // Apply internationalization middleware for all other requests
  const res = intlMiddleware(request);
  if (refreshedToken) {
    res.cookies.set("access_token", refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }
  return res;
}

export const config = {
  // Match only internationalized pathnames
  matcher: ["/", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
