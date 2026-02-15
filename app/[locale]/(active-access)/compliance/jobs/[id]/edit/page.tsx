import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { getOrgMembersAction } from "@/actions/clerk";
import { getJobById } from "@/lib/actions/jobActions";
import { JobEditForm } from "../../_components/JobEditForm";

async function EditJobWrapper({ id }: { id: string }) {
  const { userId } = await auth();
  if (!userId) {
    return notFound();
  }

  const [jobResult, members] = await Promise.all([
    getJobById(id),
    getOrgMembersAction(),
  ]);

  if (!jobResult.success || !jobResult.data) {
    return notFound();
  }

  return <JobEditForm job={jobResult.data.job} members={members} />;
}

function EditJobSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="container max-w-4xl">
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/compliance/jobs/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Job</h1>
        <p className="text-muted-foreground mt-1">
          Update job information and settings
        </p>
      </div>

      <Suspense fallback={<EditJobSkeleton />}>
        <EditJobWrapper id={id} />
      </Suspense>
    </div>
  );
}
