"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import {
  clearAuthCookies,
  decodeJWTPayload,
  getAccessToken,
  getDashboardPath,
  refreshAccessToken,
  type UserProfile,
} from "@/lib/utils/auth";

// Define the state type for the login action
export interface LoginState {
  success: boolean;
  message: string;
  errors?: {
    email?: string[];
    password?: string[];
  };
}

/**
 * Fetch user profile from the API using the access token
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return null;
    }

    // Get user ID from token
    const payload = decodeJWTPayload(token);
    if (!payload || !payload.sub) {
      return null;
    }

    const userId = payload.sub;
    const api = `${process.env.API_BASE_URL}/v1/profile/${userId}`;
    let response = await fetch(api, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // If unauthorized, try to refresh the token and retry once
    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(api, {
          method: "GET",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${newToken}`,
          },
        });
      }
    }

    if (!response.ok) {
      console.error(
        "Failed to fetch user profile:",
        response.status,
        response.statusText,
      );
      return null;
    }

    const profile: UserProfile = await response.json();
    return profile;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

// Login server action using React 19 patterns
export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // Extract form data
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirectTo") as string;

  // Basic validation
  const errors: { email?: string[]; password?: string[] } = {};

  if (!email || !email.includes("@")) {
    errors.email = ["Please enter a valid email address"];
  }

  if (!password) {
    errors.password = ["Password must be at least 6 characters long"];
  }

  // If there are validation errors, return them
  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Please fix the errors below",
      errors,
    };
  }

  // Call the backend API
  const apiUrl = `${process.env.API_BASE_URL}/v1/auth/login`;

  try {
    // Prepare form data for OAuth2 password grant
    const formData = new URLSearchParams();
    formData.append("grant_type", "password");
    formData.append("username", email);
    formData.append("password", password);
    formData.append("scope", "");
    formData.append("client_id", "");
    formData.append("client_secret", "");

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          message: "Invalid email or password. Please try again.",
        };
      } else if (response.status === 422) {
        // Handle validation errors from backend
        const errorData = await response.json();
        return {
          success: false,
          message: "Please check your input and try again.",
          errors: errorData.errors || {},
        };
      } else {
        return {
          success: false,
          message: "Login failed. Please try again later.",
        };
      }
    }

    // Parse the successful response
    const data = await response.json();
    const { access_token } = data;

    if (!access_token) {
      return {
        success: false,
        message: "Authentication failed. Please try again.",
      };
    }

    // Set secure HTTP-only cookie with access token
    const cookieStore = await cookies();
    cookieStore.set("access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
  } catch (error) {
    console.error("Login API error:", error);

    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        message:
          "Unable to connect to the server. Please check your internet connection.",
      };
    }

    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }

  // Handle redirect outside try-catch to avoid NEXT_REDIRECT being caught
  const locale = await getLocale();

  // Use redirectTo parameter if provided, otherwise determine based on user profile
  let redirectPath = redirectTo || `/${locale}`;

  if (!redirectTo) {
    try {
      // Fetch user profile to get organization ID
      const profile = await getUserProfile();
      if (profile) {
        redirectPath = getDashboardPath(profile.organization_id, locale);
      }
    } catch (error) {
      console.error("Error fetching user profile for redirect:", error);
      // Fall back to home page if profile fetch fails
      redirectPath = `/${locale}`;
    }
  }

  // Redirect to appropriate page (this will throw NEXT_REDIRECT)
  redirect(redirectPath);
}

/**
 For middleware
 */
export async function getUserProfileForMiddleware(
  token: string,
): Promise<{ organization_id: string } | null> {
  try {
    const payload = decodeJWTPayload(token);
    if (!payload || !payload.sub) {
      return null;
    }

    const userId = payload.sub;
    const response = await fetch(
      `${process.env.API_BASE_URL}/v1/profile/${userId}`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const profile = await response.json();
    return { organization_id: profile.organization_id };
  } catch {
    return null;
  }
}

/**
 * Check authentication status and return user info
 * This replaces the /api/auth/status endpoint
 */
export async function checkAuthStatus(): Promise<{
  isAuthenticated: boolean;
  user: { sub: string; [key: string]: unknown } | null;
}> {
  try {
    const token = await getAccessToken();

    if (!token) {
      return {
        isAuthenticated: false,
        user: null,
      };
    }

    // Decode the JWT payload to get user info
    const payload = decodeJWTPayload(token);

    if (!payload?.sub) {
      return {
        isAuthenticated: false,
        user: null,
      };
    }

    return {
      isAuthenticated: true,
      user: payload as { sub: string; [key: string]: unknown },
    };
  } catch (error) {
    console.error("Auth status check error:", error);
    return {
      isAuthenticated: false,
      user: null,
    };
  }
}

export async function logoutAction(): Promise<void> {
  try {
    // Get the access token for the API call
    const token = await getAccessToken();

    if (token) {
      // Call the backend logout endpoint
      const apiUrl = `${process.env.API_BASE_URL}/v1/auth/logout`;

      try {
        await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (apiError) {
        // Log API error but continue with local logout
        console.error("Backend logout API error:", apiError);
      }
    }

    // Clear authentication cookies regardless of API response
    await clearAuthCookies();
  } catch (error) {
    console.error("Logout error:", error);
    // Clear cookies even if there's an error
    try {
      await clearAuthCookies();
    } catch (clearError) {
      console.error("Error clearing cookies:", clearError);
    }
  }

  // Get current locale and redirect to home page (outside try-catch to avoid NEXT_REDIRECT being caught)
  const locale = await getLocale();
  redirect(`/${locale}`);
}

export async function logoutWithoutRedirect(): Promise<void> {
  try {
    // Get the access token for the API call
    const token = await getAccessToken();

    if (token) {
      // Call the backend logout endpoint
      const apiUrl = `${process.env.API_BASE_URL}/v1/auth/logout`;

      try {
        await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (apiError) {
        // Log API error but continue with local logout
        console.error("Backend logout API error:", apiError);
      }
    }

    // Clear authentication cookies regardless of API response
    await clearAuthCookies();
  } catch (error) {
    console.error("Logout error:", error);
    // Clear cookies even if there's an error
    try {
      await clearAuthCookies();
    } catch (clearError) {
      console.error("Error clearing cookies:", clearError);
    }
  }
}
