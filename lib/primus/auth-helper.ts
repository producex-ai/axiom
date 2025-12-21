/**
 * Auth Helper for API Routes
 *
 * Provides utilities for extracting and validating authentication
 * information from incoming API requests.
 */

import type { NextRequest } from "next/server";
import { decodeJWTPayload, getAccessToken, type UserProfile } from "@/lib/auth";

/**
 * Fetch user profile from API using access token
 * This is needed because organization_id is in the profile, not the JWT
 */
async function fetchUserProfile(token: string): Promise<UserProfile | null> {
  try {
    // Get user ID from token
    const payload = decodeJWTPayload(token);
    if (!payload || !payload.sub) {
      return null;
    }

    const userId = payload.sub;
    const api = `${process.env.API_BASE_URL}/v1/profile/${userId}`;

    const response = await fetch(api, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error(
        "Failed to fetch user profile:",
        response.status,
        response.statusText,
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

/**
 * Get orgId and userId from request
 *
 * Extracts authentication claims from the JWT access token and fetches
 * user profile to get organization_id.
 *
 * IMPORTANT: Always use this function to get orgId - never trust client input.
 * The JWT is verified by the auth layer, so these claims are trustworthy.
 *
 * @returns Object with orgId and userId, or null if not authenticated
 */
export async function getAuthContext(req: NextRequest): Promise<{
  orgId: string;
  userId: string;
} | null> {
  try {
    // Get access token from cookies
    const token = await getAccessToken();

    if (!token) {
      console.warn("No access token found in request");
      return null;
    }

    // Decode JWT payload to get userId
    const payload = decodeJWTPayload(token);

    if (!payload || !payload.sub) {
      console.warn("Invalid token payload - missing sub claim");
      return null;
    }

    // Fetch user profile to get organization_id
    const profile = await fetchUserProfile(token);

    if (!profile || !profile.organization_id) {
      console.warn("Failed to fetch user profile or missing organization_id");
      return null;
    }

    return {
      orgId: profile.organization_id,
      userId: payload.sub,
    };
  } catch (error) {
    console.error("Error extracting auth context:", error);
    return null;
  }
}

/**
 * Create unauthorized response
 */
export function createUnauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "Unauthorized",
      message: "Authentication required",
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Create error response
 */
export function createErrorResponse(message: string, status = 500): Response {
  return new Response(
    JSON.stringify({
      error: "Error",
      message,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(data: T): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
