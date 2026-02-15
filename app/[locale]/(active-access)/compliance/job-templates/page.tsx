import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getJobTemplates } from "@/lib/actions/jobTemplateActions";
import { PlusCircle, FileText, Calendar } from "lucide-react";
import { TemplatesGrid } from "./_components/TemplatesGrid";

async function TemplatesList() {
  const result = await getJobTemplates();

  if (!result.success || !result.data) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            {result.error || "Failed to load templates"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const templates = result.data;

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">No templates yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first job template to get started
              </p>
            </div>
            <Button asChild>
              <Link href="/compliance/job-templates/create">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Template
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <TemplatesGrid templates={templates} />;
}

function TemplatesListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-1/2 mb-4" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function JobTemplatesPage() {
  return (
    <div className="container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Templates</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage reusable job templates
          </p>
        </div>
        <Button asChild>
          <Link href="/compliance/job-templates/create">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Template
          </Link>
        </Button>
      </div>

      <Suspense fallback={<TemplatesListSkeleton />}>
        <TemplatesList />
      </Suspense>
    </div>
  );
}
