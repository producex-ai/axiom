import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getJobsWithStatus } from "@/lib/actions/jobActions";
import { JobsList } from "@/components/jobs/JobsList";
import { JobsByTemplateGroup } from "@/components/jobs/JobsByTemplateGroup";
import { PlusCircle } from "lucide-react";

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
  const completedJobs = jobs.filter((j) => j.derived_status === "COMPLETED");
  const upcomingJobs = jobs.filter((j) => j.derived_status === "UPCOMING");

  return (
    <Tabs defaultValue="grouped" className="space-y-6">
      <TabsList>
        <TabsTrigger value="grouped">
          By Template
        </TabsTrigger>
        <TabsTrigger value="overdue" className="text-red-600">
          Overdue ({overdueJobs.length})
        </TabsTrigger>
        <TabsTrigger value="completed">
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
            Track and execute recurring jobs
          </p>
        </div>
        <Button asChild>
          <Link href="/compliance/jobs/create">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Job
          </Link>
        </Button>
      </div>

      <Suspense fallback={<JobsContentSkeleton />}>
        <JobsContent />
      </Suspense>
    </div>
  );
}
