/**
 * GET /api/users/[id]
 * 
 * Fetch user profile information for display purposes
 * Used to show user names in document metadata (created by, updated by)
 */

import { type NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: userId } = await params;
    
    // Get access token for authentication
    const token = await getAccessToken();
    
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user profile from backend API
    const apiUrl = `${process.env.API_BASE_URL}/v1/profile/${userId}`;
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      throw new Error("Failed to fetch user profile");
    }

    const profile = await response.json();

    // Return simplified profile for display
    return NextResponse.json({
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      avatarUrl: profile.avatar_url || null,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch user profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
