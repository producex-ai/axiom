"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Filter } from "lucide-react";
import type { JobTemplateWithFields } from "@/lib/services/jobTemplateService";

interface TemplatesGridProps {
  templates: JobTemplateWithFields[];
}

export function TemplatesGrid({ templates }: TemplatesGridProps) {
  const params = useParams();
  const locale = params.locale as string;
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(templates.map((t) => t.category)));
    return cats.sort();
  }, [templates]);

  // Filter templates by selected category
  const filteredTemplates = useMemo(() => {
    if (selectedCategory === "all") {
      return templates;
    }
    return templates.filter((t) => t.category === selectedCategory);
  }, [templates, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filter by category:</span>
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                <span className="capitalize">{category}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredTemplates.length} {filteredTemplates.length === 1 ? "template" : "templates"}
        </span>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground capitalize bg-muted px-2 py-1 rounded">
                  {template.category}
                </span>
                <span className="text-xs text-muted-foreground">
                  v{template.version}
                </span>
              </div>
              <CardTitle className="line-clamp-2 text-base">
                {template.name}
              </CardTitle>
              {template.description && (
                <CardDescription className="line-clamp-2 text-xs">
                  {template.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                <span>{template.fields.length} fields</span>
                <span>
                  {template.fields.filter((f) => f.field_category === "creation").length} creation,{" "}
                  {template.fields.filter((f) => f.field_category === "action").length} action
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href={`/${locale}/compliance/jobs/create?template=${template.id}`}>
                    <Calendar className="h-3 w-3 mr-1" />
                    Create Job
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href={`/${locale}/compliance/job-templates/${template.id}`}>
                    View
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <Filter className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">No templates found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Try selecting a different category
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
