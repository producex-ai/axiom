"use client";

import { useCallback, useEffect, useState } from "react";

interface User {
  sub: string;
  organization_type?: string;
  [key: string]: unknown;
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // Check authentication status using auth action
  const checkAuth = useCallback(async () => {
    setIsLoading(true);

    try {
      // Import and call the auth status action
      const { checkAuthStatus } = await import("@/actions/auth");
      const authData = await checkAuthStatus();

      setIsAuthenticated(authData.isAuthenticated);
      setUser(authData.user);
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
      setUser(null);
    }

    setIsLoading(false);
  }, []);

  // Logout function
  const logout = async () => {
    setIsLoggingOut(true);
    try {
      // Import and call the non-redirecting logout action
      const { logoutWithoutRedirect } = await import("@/actions/auth");
      await logoutWithoutRedirect();

      // Clear local state after successful logout
      setIsAuthenticated(false);
      setUser(null);

      // Redirect to home page
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Clear local state even if action fails
      setIsAuthenticated(false);
      setUser(null);

      // Still redirect to home page on error
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    checkAuth();

    // Listen for storage events to sync auth state across tabs
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener("storage", handleStorageChange);

    // Check auth status periodically (every 5 minutes)
    const interval = setInterval(
      () => {
        checkAuth();
      },
      5 * 60 * 1000,
    );

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [checkAuth]);

  return {
    isAuthenticated,
    user,
    isLoading,
    isLoggingOut,
    logout,
    checkAuth,
  };
}
