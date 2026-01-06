import React from "react";
import ComplianceContent from "@/components/compliance/ComplianceContent";
import OnboardingCheckWrapper from "@/components/compliance/OnboardingCheckWrapper";

/**
 * Primus GFS Compliance Page
 *
 * Entry point for compliance management. This page:
 * 1. Checks if org has completed onboarding (selected modules)
 * 2. If not onboarded: shows module selection UI
 * 3. If onboarded: shows compliance dashboard with selected modules
 */
export default async function CompliancePage({ params }: { params: any }) {
  const { locale } = (await params) as { locale: string };

  return (
    <OnboardingCheckWrapper>
      <ComplianceContent />
    </OnboardingCheckWrapper>
  );
}
