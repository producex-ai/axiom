/**
 * Auth Helper for API Routes
 *
 * Provides utilities for extracting and validating authentication
 * information from incoming API requests.
 */

import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * Get orgId and userId from request
 *
 * Uses Clerk's auth() to get authenticated user and organization information.
 *
 * IMPORTANT: Always use this function to get orgId - never trust client input.
 * Clerk verifies the session, so these claims are trustworthy.
 *
 * @returns Object with orgId and userId, or null if not authenticated
 */
export async function getAuthContext(_req: NextRequest): Promise<{
  orgId: string;
  userId: string;
} | null> {
  try {
    // Get auth info from Clerk
    const { userId, orgId } = await auth();

    if (!userId) {
      console.warn("No authenticated user found");
      return null;
    }

    if (!orgId) {
      console.warn("User not associated with an organization");
      return null;
    }

    return {
      orgId,
      userId,
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
