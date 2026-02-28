import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getJobsWithStatus } from "@/actions/jobs/job-actions";
import { JobsList } from "./_components/JobsList";
import { JobsByTemplateGroup } from "./_components/JobsByTemplateGroup";
import { PlusCircle, Upload } from "lucide-react";

async function JobsContent() {
  const { userId } = await auth();
  
  const result = await getJobsWithStatus();

  if (!result.success || !result.data) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            {result.error || "Failed to load jobs"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const jobs = result.data;

  const overdueJobs = jobs.filter((j) => j.derived_status === "OVERDUE");
  const openJobs = jobs.filter((j) => j.derived_status === "OPEN");
  const completedJobs = jobs.filter((j) => j.derived_status === "COMPLETED");
  const upcomingJobs = jobs.filter((j) => j.derived_status === "UPCOMING");

  return (
    <Tabs defaultValue="grouped" className="space-y-6">
      <TabsList>
        <TabsTrigger value="grouped">
          By Template
        </TabsTrigger>
        <TabsTrigger value="overdue" className="data-[state=active]:text-red-600">
          Overdue ({overdueJobs.length})
        </TabsTrigger>
        <TabsTrigger value="open" className="data-[state=active]:text-blue-600">
          Open ({openJobs.length})
        </TabsTrigger>
        <TabsTrigger value="completed" className="data-[state=active]:text-green-700">
          Completed ({completedJobs.length})
        </TabsTrigger>
        <TabsTrigger value="upcoming">
          Upcoming ({upcomingJobs.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="grouped">
        <JobsByTemplateGroup jobs={jobs} currentUserId={userId || ""} />
      </TabsContent>

      <TabsContent value="overdue">
        <JobsList jobs={overdueJobs} currentUserId={userId || ""} />
      </TabsContent>

      <TabsContent value="open">
        <JobsList jobs={openJobs} currentUserId={userId || ""} />
      </TabsContent>

      <TabsContent value="completed">
        <JobsList jobs={completedJobs} currentUserId={userId || ""} />
      </TabsContent>

      <TabsContent value="upcoming">
        <JobsList jobs={upcomingJobs} currentUserId={userId || ""} />
      </TabsContent>
    </Tabs>
  );
}

function JobsContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <div className="container max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Track and execute recurring jobs. Jobs move through statuses: Upcoming → Open → Completed (or Overdue if missed).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/compliance/jobs/bulk-create">
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Link>
          </Button>
          <Button asChild>
            <Link href="/compliance/jobs/create">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Job
            </Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<JobsContentSkeleton />}>
        <JobsContent />
      </Suspense>
    </div>
  );
}
