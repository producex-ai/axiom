import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getJobTemplateById } from "@/lib/actions/jobTemplateActions";
import { getJobsByTemplateId } from "@/lib/actions/jobActions";
import { ArrowLeft, Calendar } from "lucide-react";
import { DeactivateTemplateButton } from "@/components/jobs/DeactivateTemplateButton";
import { TemplateJobsTable } from "@/components/jobs/TemplateJobsTable";
import { TemplateExecutionHistoryOnDemand } from "@/components/jobs/TemplateExecutionHistoryOnDemand";

async function TemplateDetail({ id }: { id: string }) {
  const { userId } = await auth();
  const result = await getJobTemplateById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const template = result.data;

  // Fetch jobs for this template (only scheduled jobs, not execution history)
  const jobsResult = await getJobsByTemplateId(id);
  const scheduledJobs = jobsResult.success && jobsResult.data 
    ? jobsResult.data.scheduled_jobs
    : [];

  const creationFields = template.fields.filter(
    (f) => f.field_category === "creation"
  );
  const actionFields = template.fields.filter(
    (f) => f.field_category === "action"
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-2xl">{template.name}</CardTitle>
              <CardDescription className="mt-2">
                {template.description || "No description"}
              </CardDescription>
            </div>
            <div className="flex gap-2 shrink-0">
              <Badge variant="outline">v{template.version}</Badge>
              <Badge variant="secondary">{template.category}</Badge>
              {template.sop && (
                <Badge variant="default">{template.sop}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/compliance/jobs/create?template=${template.id}`}>
                <Calendar className="h-4 w-4 mr-2" />
                Create Job
              </Link>
            </Button>
            <DeactivateTemplateButton
              templateId={template.id}
              templateName={template.name}
              jobCount={scheduledJobs.length}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template Fields</CardTitle>
          <CardDescription>
            Fields used in this template for job creation and execution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="creation-fields">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <span>Creation Fields</span>
                  <Badge variant="outline" className="text-xs">
                    {creationFields.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {creationFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No creation fields defined</p>
                ) : (
                  <div className="space-y-3 pt-2">
                    {creationFields.map((field) => (
                      <div
                        key={field.id}
                        className="border rounded-lg p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{field.field_label}</span>
                          <Badge variant="outline" className="text-xs">
                            {field.field_type}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Key: {field.field_key}
                          {field.is_required && (
                            <span className="ml-2 text-red-500">*required</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="action-fields">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <span>Action Fields</span>
                  <Badge variant="outline" className="text-xs">
                    {actionFields.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {actionFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No action fields defined</p>
                ) : (
                  <div className="space-y-3 pt-2">
                    {actionFields.map((field) => (
                      <div
                        key={field.id}
                        className="border rounded-lg p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{field.field_label}</span>
                          <Badge variant="outline" className="text-xs">
                            {field.field_type}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Key: {field.field_key}
                          {field.is_required && (
                            <span className="ml-2 text-red-500">*required</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Jobs Section */}
      <div className="space-y-6">
        <TemplateJobsTable jobs={scheduledJobs} currentUserId={userId || ""} />
        <TemplateExecutionHistoryOnDemand templateId={id} />
      </div>
    </div>
  );
}

function TemplateDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="container max-w-6xl">
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/compliance/job-templates">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Template Details</h1>
      </div>

      <Suspense fallback={<TemplateDetailSkeleton />}>
        <TemplateDetail id={id} />
      </Suspense>
    </div>
  );
}
