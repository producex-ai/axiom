"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBulkJobsAction } from "@/actions/jobs/job-bulk-actions";
import { getOrgMembersAction } from "@/actions/auth/clerk";
import type { OrgMember } from "@/actions/auth/clerk";
import { JobExtractionReview } from "@/app/[locale]/(active-access)/compliance/jobs/_components/JobExtractionReview";

export default function ReviewBulkJobsPage() {
  const router = useRouter();
  const [extractionData, setExtractionData] = useState<any>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);

  useEffect(() => {
    // Get extraction result from sessionStorage
    const dataStr = sessionStorage.getItem("jobExtractionResult");
    if (!dataStr) {
      router.push("/compliance/jobs/bulk-create");
      return;
    }

    try {
      const data = JSON.parse(dataStr);
      setExtractionData(data);
    } catch (error) {
      console.error("Failed to parse extraction data:", error);
      router.push("/compliance/jobs/bulk-create");
    }

    // Load org members
    loadMembers();
  }, [router]);

  const loadMembers = async () => {
    const result = await getOrgMembersAction();
    setMembers(result);
  };

  if (!extractionData) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Loading extraction results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Review Extracted Jobs</h1>
        <p className="text-muted-foreground mt-2">
          Review the extracted jobs, map fields, and make any necessary edits before creating them.
        </p>
      </div>

      <JobExtractionReview
        extractionData={extractionData}
        members={members}
        onSuccess={() => {
          // Clear session storage and redirect
          sessionStorage.removeItem("jobExtractionResult");
          router.push("/compliance/jobs");
        }}
        onCancel={() => {
          sessionStorage.removeItem("jobExtractionResult");
          router.push("/compliance/jobs/bulk-create");
        }}
      />
    </div>
  );
}
