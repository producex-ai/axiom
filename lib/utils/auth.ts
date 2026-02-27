import { cookies } from "next/headers";

// Organization type constants - shared with middleware
export const ORGANIZATION_TYPES = {
  SUPPLIER: "bb51aa4c-52df-4f49-9f89-65a4021be602",
  DISTRIBUTOR: "bbc27b7e-5855-4380-b84c-46ef98904c2f",
} as const;

// User profile interface
export interface UserProfile {
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  is_admin: boolean;
  require_pw_change: boolean;
  id: string;
}

/**
 * Decode JWT token payload without verification
 * This is safe for checking basic claims like 'sub' for authentication status
 * Note: Middleware has its own simplified version of this function
 */
export function decodeJWTPayload(
  token: string,
): { sub?: string; exp?: number; [key: string]: unknown } | null {
  try {
    // JWT tokens have 3 parts separated by dots: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];

    // Add padding if needed for base64 decoding
    const paddedPayload = payload + "=".repeat((4 - (payload.length % 4)) % 4);

    // Decode from base64url to string, then parse JSON
    const decodedPayload = atob(
      paddedPayload.replace(/-/g, "+").replace(/_/g, "/"),
    );
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error("Error decoding JWT payload:", error);
    return null;
  }
}

// JWT payload interface
export interface TokenPayload {
  sub: string;
  exp: number; // seconds since epoch
  iat?: number;
  [key: string]: unknown;
}

/**
 * Check if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeJWTPayload(token) as TokenPayload | null;
    if (!payload || typeof payload.exp !== "number") return true;
    return Date.now() >= payload.exp * 1000; // convert seconds to ms
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true;
  }
}

/**
 * Attempt to refresh the access token using the refresh endpoint.
 * Relies on http-only refresh cookies maintained by the backend.
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${process.env.API_BASE_URL}/v1/auth/refresh`, {
      method: "POST",
      // Send along cookies; when running as a server action or middleware, the
      // platform forwards cookies automatically, but be explicit where possible.
      credentials: "include",
      headers: {
        accept: "application/json",
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json().catch(() => ({}));
    const newToken = data?.access_token as string | undefined;
    return newToken ?? null;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return null;
  }
}

/**
 * Get the access token from cookies
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value || null;
    if (!token) return null;

    // If the token is expired, try to refresh it transparently
    if (isTokenExpired(token)) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Persist the refreshed token
        cookieStore.set("access_token", newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        return newToken;
      }
      // If refresh fails, clear cookies and return null
      try {
        cookieStore.delete("access_token");
      } catch (deleteError) {
        console.error("Error deleting expired token:", deleteError);
      }
      return null;
    }

    return token;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
}

/**
 * Check if user is authenticated by verifying the access token has a 'sub' claim
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return false;
    }

    const payload = decodeJWTPayload(token);
    if (!payload) {
      return false;
    }

    // Check if token has 'sub' (subject) claim, which indicates a valid user
    return !!payload.sub;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
}

/**
 * Get user information from the JWT token
 */
export async function getUserFromToken(): Promise<{
  sub: string;
  [key: string]: unknown;
} | null> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return null;
    }

    const payload = decodeJWTPayload(token);
    if (!payload?.sub) {
      return null;
    }
    return payload as { sub: string; [key: string]: unknown };
  } catch (error) {
    console.error("Error getting user from token:", error);
    return null;
  }
}

/**
 * Clear authentication cookies (for logout)
 */
export async function clearAuthCookies(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("access_token");
  } catch (error) {
    console.error("Error clearing auth cookies:", error);
  }
}

/**
 * Determine user type based on organization ID
 */
export function getUserType(
  organizationId: string,
): "supplier" | "distributor" | null {
  switch (organizationId) {
    case ORGANIZATION_TYPES.SUPPLIER:
      return "supplier";
    case ORGANIZATION_TYPES.DISTRIBUTOR:
      return "distributor";
    default:
      return null;
  }
}

/**
 * Middleware-compatible token refresh function
 * Uses explicit cookie forwarding instead of credentials: 'include'
 */
export async function refreshAccessTokenForMiddleware(
  cookieHeader: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${process.env.API_BASE_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: {
        accept: "application/json",
        cookie: cookieHeader,
      },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Middleware-compatible authentication check
 */
export function isAuthenticatedWithToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const payload = decodeJWTPayload(token);
  return !!payload?.sub;
}

/**
 * Get the dashboard path for a user based on their organization
 */
export function getDashboardPath(
  organizationId: string,
  locale: string = "en",
): string {
  // For now, use a single dashboard route for all organizations.
  // We keep the organizationId param so this can be extended later
  // to return role-specific dashboards when needed.
  return `/${locale}/dashboard`;
}
