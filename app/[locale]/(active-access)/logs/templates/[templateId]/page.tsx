import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  Clock,
  Edit,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLogTemplateByIdAction } from "@/actions/log-templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{ templateId: string }>;
}

export default async function TemplateDetailsPage({ params }: PageProps) {
  const { templateId } = await params;
  const template = await getLogTemplateByIdAction(templateId);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/logs/templates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-bold text-2xl tracking-tight">
              {template.name}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-muted-foreground text-sm">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Created {new Date(template.created_at).toLocaleDateString()}
              </span>
              {template.category && (
                <>
                  <Separator orientation="vertical" className="h-3" />
                  <Badge variant="secondary" className="font-normal text-xs">
                    {template.category}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {template.schedule_id ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/logs/templates/${template.id}/schedule/edit`}>
                Update Schedule
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/logs/templates/${template.id}/schedule`}>
                Schedule
              </Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link href={`/logs/templates/${template.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-8">
        {/* Section: SOP */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 font-medium text-lg">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h2>Standard Operating Procedure</h2>
          </div>
          <div className="pl-6">
            <p className="max-w-prose whitespace-pre-wrap text-foreground/80 text-sm leading-relaxed">
              {template.sop || (
                <span className="text-muted-foreground italic">
                  No SOP provided for this template.
                </span>
              )}
            </p>
          </div>
        </section>

        {/* Section: Tasks */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 font-medium text-lg">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <h2>Task List</h2>
            <Badge
              variant="outline"
              className="ml-2 font-normal text-muted-foreground text-xs"
            >
              {template.task_list?.length || 0} tasks
            </Badge>
          </div>
          <div className="pl-6">
            {template.task_list && template.task_list.length > 0 ? (
              <div className="grid gap-2">
                {template.task_list.map((task, index) => (
                  <div
                    key={`${task}-${index}`}
                    className="flex items-start gap-3 border-border/40 border-b py-2 last:border-0"
                  >
                    <span className="mt-1 w-6 shrink-0 font-mono text-muted-foreground text-xs">
                      {(index + 1).toString().padStart(2, "0")}
                    </span>
                    <span className="text-sm">{task}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No tasks defined.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
