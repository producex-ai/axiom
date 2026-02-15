import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  Clock,
  Edit,
  FileText,
  Info,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLogTemplateByIdAction } from "@/actions/log-templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FieldItem } from "@/db/queries/log-templates";

interface PageProps {
  params: Promise<{ templateId: string }>;
}

const REVIEW_TIME_LABELS = {
  "1_month": "1 Month",
  "3_months": "3 Months",
  "6_months": "6 Months",
  "1_year": "1 Year",
} as const;

export default async function TemplateDetailsPage({ params }: PageProps) {
  const { templateId } = await params;
  const template = await getLogTemplateByIdAction(templateId);

  if (!template) {
    notFound();
  }

  const isFieldInput = template.template_type === "field_input";

  return (
    <div className="container mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/logs/templates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-2xl tracking-tight">
              {template.name}
            </h1>
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
              Edit Template
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Template Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">Overview</CardTitle>
                {template.category && (
                  <Badge variant="secondary">{template.category}</Badge>
                )}
                <Badge variant="outline">
                  {isFieldInput ? "Field Input" : "Task List"}
                </Badge>
              </div>
              {template.description && (
                <CardDescription className="mt-2">
                  {template.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {template.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Due Date</div>
                  <div className="text-muted-foreground">
                    {new Date(template.due_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            )}
            {template.review_time && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Review Period</div>
                  <div className="text-muted-foreground">
                    {REVIEW_TIME_LABELS[template.review_time]}
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Items</div>
                <div className="text-muted-foreground">
                  {template.items?.length || 0}{" "}
                  {isFieldInput ? "fields" : "tasks"}
                </div>
              </div>
            </div>
          </div>

          {/* SOP Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">
                Standard Operating Procedure
              </h3>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {template.sop || (
                <span className="text-muted-foreground italic">
                  No SOP provided for this template.
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Items Card - Full Width */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <CardTitle>{isFieldInput ? "Fields" : "Tasks"}</CardTitle>
          </div>
          <CardDescription>
            {template.items?.length || 0} {isFieldInput ? "field" : "task"}
            {template.items?.length !== 1 ? "s" : ""} defined
          </CardDescription>
        </CardHeader>
        <CardContent>
          {template.items && template.items.length > 0 ? (
            <div className="space-y-2">
              {template.items.map((item, index) => {
                const fieldItem = isFieldInput ? (item as FieldItem) : null;
                return (
                  <div
                    key={`${item.name}-${index}`}
                    className="space-y-1 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">
                        {index + 1}. {item.name}
                      </span>
                      {fieldItem?.required && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    {fieldItem?.description && (
                      <p className="text-muted-foreground text-xs">
                        {fieldItem.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              No {isFieldInput ? "fields" : "tasks"} defined.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Metadata Card */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground text-sm">
            <div>
              <span>Created:</span>{" "}
              <span className="font-medium text-foreground">
                {new Date(template.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div>
              <span>Last Updated:</span>{" "}
              <span className="font-medium text-foreground">
                {new Date(template.updated_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
