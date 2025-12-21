"use client";

import { Loader2 } from "lucide-react";
import React from "react";
import { useComplianceOverview } from "@/lib/compliance/queries";
import ModuleSelectionOnboarding from "./ModuleSelectionOnboarding";

interface OnboardingCheckWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that checks if org is onboarded
 * - If not onboarded: shows module selection
 * - If onboarded: shows children (main compliance view)
 */
export default function OnboardingCheckWrapper({
  children,
}: OnboardingCheckWrapperProps) {
  const {
    data: overviewData,
    isLoading,
    error,
    refetch,
  } = useComplianceOverview();
  const isOnboarded = overviewData?.isOnboarded ?? null;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">
            Loading compliance dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md space-y-4 text-center">
          <div className="font-semibold text-destructive text-lg">
            Failed to Load
          </div>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
          <button
            onClick={() => refetch()}
            className="text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Not onboarded - show module selection
  if (isOnboarded === false) {
    return <ModuleSelectionOnboarding />;
  }

  // Onboarded - show main content with overview data
  if (React.isValidElement(children)) {
    return <>{React.cloneElement(children, { overviewData } as any)}</>;
  }
  return <>{children}</>;
}
