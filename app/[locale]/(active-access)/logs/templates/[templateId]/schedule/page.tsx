import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgMembersAction } from "@/actions/clerk";
import { getLogTemplateByIdAction } from "@/actions/log-templates";
import { Button } from "@/components/ui/button";
import { ScheduleForm } from "./_components/schedule-form";

interface PageProps {
  params: Promise<{ templateId: string }>;
}

export default async function ScheduleTemplatePage({ params }: PageProps) {
  const { templateId } = await params;
  const [template, members] = await Promise.all([
    getLogTemplateByIdAction(templateId),
    getOrgMembersAction(),
  ]);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/logs/templates/${templateId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-bold text-2xl tracking-tight">
            Schedule: {template.name}
          </h1>
          <p className="text-muted-foreground">
            Create a recurring schedule for this log template.
          </p>
        </div>
      </div>

      <ScheduleForm templateId={templateId} members={members} />
    </div>
  );
}
