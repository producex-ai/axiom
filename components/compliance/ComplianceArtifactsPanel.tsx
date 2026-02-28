"use client";

import { Loader2, Link2, Trash2, Plus, FileText, ClipboardList, Briefcase } from "lucide-react";
import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AddArtifactDialog } from "@/components/compliance/AddArtifactDialog";

interface JobTemplate {
  id: string;
  name: string;
  category: string;
  description: string | null;
  active: boolean;
}

interface LogTemplate {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  template_type: "task_list" | "field_input";
}

interface CompanyDocument {
  id: string;
  title: string;
  doc_type: string;
  sub_module_id: string;
}

interface LinkedArtifacts {
  jobTemplates: JobTemplate[];
  logTemplates: LogTemplate[];
  companyDocuments: CompanyDocument[];
}

interface ComplianceArtifactsPanelProps {
  documentId: string;
}

export function ComplianceArtifactsPanel({ documentId }: ComplianceArtifactsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [artifacts, setArtifacts] = useState<LinkedArtifacts>({
    jobTemplates: [],
    logTemplates: [],
    companyDocuments: [],
  });
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const fetchLinkedArtifacts = useCallback(async () => {
    if (!documentId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/compliance/documents/${documentId}/artifacts`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch linked artifacts");
      }

      const data = await response.json();
      setArtifacts({
        jobTemplates: data.jobTemplates || [],
        logTemplates: data.logTemplates || [],
        companyDocuments: data.companyDocuments || [],
      });
    } catch (error) {
      console.error("Error fetching linked artifacts:", error);
      toast.error("Failed to load linked artifacts");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchLinkedArtifacts();
  }, [fetchLinkedArtifacts]);

  const handleUnlink = async (artifactType: string, artifactId: string) => {
    try {
      setUnlinkingId(artifactId);
      
      const response = await fetch(`/api/compliance/documents/${documentId}/artifacts`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artifactType,
          artifactId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to unlink artifact");
      }

      toast.success("Artifact unlinked successfully");
      await fetchLinkedArtifacts();
    } catch (error) {
      console.error("Error unlinking artifact:", error);
      toast.error("Failed to unlink artifact");
    } finally {
      setUnlinkingId(null);
    }
  };

  const totalArtifacts =
    artifacts.jobTemplates.length +
    artifacts.logTemplates.length +
    artifacts.companyDocuments.length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Linked SOPs & Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Linked SOPs & Documents
            </div>
            <span className="text-sm font-normal text-muted-foreground">
              {totalArtifacts} {totalArtifacts === 1 ? "item" : "items"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Artifact Button */}
          <Button
            onClick={() => setAddDialogOpen(true)}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Artifact
          </Button>

          {totalArtifacts === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No artifacts linked yet. Click "Add Artifact" to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Job Templates Section */}
              {artifacts.jobTemplates.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Briefcase className="h-4 w-4" />
                    Job Templates ({artifacts.jobTemplates.length})
                  </div>
                  <div className="space-y-1">
                    {artifacts.jobTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-2 rounded-md border bg-background hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {template.name}
                          </div>
                          {template.category && (
                            <div className="text-xs text-muted-foreground">
                              {template.category}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUnlink("job_template", template.id)}
                          disabled={unlinkingId === template.id}
                          className="h-8 w-8 shrink-0"
                        >
                          {unlinkingId === template.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                  {(artifacts.logTemplates.length > 0 || artifacts.companyDocuments.length > 0) && (
                    <Separator className="my-3" />
                  )}
                </div>
              )}

              {/* Log Templates Section */}
              {artifacts.logTemplates.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ClipboardList className="h-4 w-4" />
                    Log Templates ({artifacts.logTemplates.length})
                  </div>
                  <div className="space-y-1">
                    {artifacts.logTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-2 rounded-md border bg-background hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {template.name}
                          </div>
                          {template.category && (
                            <div className="text-xs text-muted-foreground">
                              {template.category}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUnlink("log_template", template.id)}
                          disabled={unlinkingId === template.id}
                          className="h-8 w-8 shrink-0"
                        >
                          {unlinkingId === template.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                  {artifacts.companyDocuments.length > 0 && (
                    <Separator className="my-3" />
                  )}
                </div>
              )}

              {/* Company Documents Section */}
              {artifacts.companyDocuments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    Company Documents ({artifacts.companyDocuments.length})
                  </div>
                  <div className="space-y-1">
                    {artifacts.companyDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 rounded-md border bg-background hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {doc.title}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUnlink("company_document", doc.id)}
                          disabled={unlinkingId === doc.id}
                          className="h-8 w-8 shrink-0"
                        >
                          {unlinkingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Artifact Dialog */}
      <AddArtifactDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        documentId={documentId}
        onSuccess={fetchLinkedArtifacts}
      />
    </>
  );
}
