import { Calendar, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { getLogTemplatesAction } from "@/actions/log-templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function TemplateListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-2 h-4 w-1/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function TemplateList() {
  const templates = await getLogTemplatesAction();

  if (!templates || templates.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed bg-muted/50">
        <p className="text-muted-foreground">
          No templates found. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <div key={template.id} className="group relative">
          <Card className="relative flex h-full flex-col overflow-hidden transition-colors hover:bg-muted/50">
            <Link
              href={`/logs/templates/${template.id}`}
              className="absolute inset-0 z-0"
              aria-label={`View ${template.name}`}
            >
              <span className="sr-only">View {template.name}</span>
            </Link>

            <CardHeader className="pointer-events-none relative z-10">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="pointer-events-auto line-clamp-1 text-base">
                  {template.name}
                </CardTitle>
                {template.category && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {template.category}
                  </Badge>
                )}
              </div>
              {template.sop && (
                <CardDescription className="mt-1 line-clamp-2 text-xs">
                  SOP: {template.sop}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="relative z-10 flex flex-1 flex-col justify-between">
              <div className="pointer-events-none flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center text-muted-foreground text-xs">
                    <Calendar className="mr-2 h-3 w-3" />
                    <span>
                      {template.due_date ? (
                        <>
                          Due {new Date(template.due_date).toLocaleDateString()}
                        </>
                      ) : (
                        <span className="italic">No review date set</span>
                      )}
                    </span>
                  </div>
                  <div className="text-xs">
                    {template.items?.length || 0}{" "}
                    {template.template_type === "field_input"
                      ? "fields"
                      : "tasks"}
                  </div>
                </div>
              </div>

              <div className="pointer-events-auto mt-4 flex gap-2">
                {template.schedule_id ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="z-20 flex-1"
                    asChild
                  >
                    <Link href={`/logs/templates/${template.id}/schedule/edit`}>
                      Update Schedule
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="z-20 flex-1"
                    asChild
                  >
                    <Link href={`/logs/templates/${template.id}/schedule`}>
                      Schedule
                    </Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="z-20 flex-1"
                  asChild
                >
                  <Link href={`/logs/templates/${template.id}/edit`}>Edit</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Log Templates</h1>
          <p className="mt-2 text-muted-foreground">
            Manage and view your organization's log templates.
          </p>
        </div>
        <Button asChild>
          <Link href="/logs/templates/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Link>
        </Button>
      </div>

      <Suspense fallback={<TemplateListSkeleton />}>
        <TemplateList />
      </Suspense>
    </div>
  );
}
