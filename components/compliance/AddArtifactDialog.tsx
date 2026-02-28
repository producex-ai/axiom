"use client";

import { Loader2, Briefcase, ClipboardList, FileText, Info } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JobTemplate {
  id: string;
  name: string;
  category: string;
  description: string | null;
  active: boolean;
  sop: string | null;
}

interface LogTemplate {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  template_type: "task_list" | "field_input";
  sop: string | null;
}

interface CompanyDocument {
  id: string;
  title: string;
  doc_type: string;
  sub_module_id: string;
}

interface AvailableArtifacts {
  jobTemplates: JobTemplate[];
  logTemplates: LogTemplate[];
  companyDocuments: CompanyDocument[];
}

interface AddArtifactDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  onSuccess: () => void;
}

export function AddArtifactDialog({
  open,
  onClose,
  documentId,
  onSuccess,
}: AddArtifactDialogProps) {
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [currentSubModuleId, setCurrentSubModuleId] = useState<string | null>(null);
  const [availableArtifacts, setAvailableArtifacts] = useState<AvailableArtifacts>({
    jobTemplates: [],
    logTemplates: [],
    companyDocuments: [],
  });
  const [selectedArtifacts, setSelectedArtifacts] = useState<
    Array<{ type: string; id: string }>
  >([]);

  useEffect(() => {
    if (open) {
      fetchAvailableArtifacts();
      setSelectedArtifacts([]);
    }
  }, [open, documentId]);

  const fetchAvailableArtifacts = async () => {
    if (!documentId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/compliance/documents/${documentId}/available-artifacts`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch available artifacts");
      }

      const data = await response.json();
      setCurrentSubModuleId(data.currentSubModuleId || null);
      setAvailableArtifacts({
        jobTemplates: data.jobTemplates || [],
        logTemplates: data.logTemplates || [],
        companyDocuments: data.companyDocuments || [],
      });
    } catch (error) {
      console.error("Error fetching available artifacts:", error);
      toast.error("Failed to load available artifacts");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleArtifact = (type: string, id: string) => {
    setSelectedArtifacts((prev) => {
      const exists = prev.some((item) => item.type === type && item.id === id);
      if (exists) {
        return prev.filter((item) => !(item.type === type && item.id === id));
      }
      return [...prev, { type, id }];
    });
  };

  const isSelected = (type: string, id: string) => {
    return selectedArtifacts.some((item) => item.type === type && item.id === id);
  };

  const handleLinkSelected = async () => {
    if (selectedArtifacts.length === 0) {
      toast.error("Please select at least one artifact to link");
      return;
    }

    try {
      setLinking(true);
      let successCount = 0;
      let failCount = 0;

      // Link each selected artifact
      for (const artifact of selectedArtifacts) {
        try {
          const response = await fetch(
            `/api/compliance/documents/${documentId}/artifacts`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                artifactType: artifact.type,
                artifactId: artifact.id,
              }),
            }
          );

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error("Error linking artifact:", error);
          failCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(
          `Successfully linked ${successCount} artifact${successCount > 1 ? "s" : ""}`
        );
        onSuccess();
        onClose();
      }

      if (failCount > 0) {
        toast.error(`Failed to link ${failCount} artifact${failCount > 1 ? "s" : ""}`);
      }
    } catch (error) {
      console.error("Error linking artifacts:", error);
      toast.error("Failed to link artifacts");
    } finally {
      setLinking(false);
    }
  };

  const totalAvailable =
    availableArtifacts.jobTemplates.length +
    availableArtifacts.logTemplates.length +
    availableArtifacts.companyDocuments.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Link Artifacts to Compliance Document</DialogTitle>
          <DialogDescription>
            Select artifacts to create traceability links. These links help demonstrate compliance through operational evidence.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading artifacts...</span>
          </div>
        ) : totalAvailable === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Info className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No artifacts available</p>
            <p className="text-xs text-muted-foreground mt-1">
              All artifacts are already linked or none exist in this module.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-1 -mx-1">
            <div className="space-y-5 py-2">
            {/* Job Templates */}
            {availableArtifacts.jobTemplates.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Job Templates</h3>
                    <p className="text-xs text-muted-foreground">
                      {availableArtifacts.jobTemplates.length} organization-wide template{availableArtifacts.jobTemplates.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {availableArtifacts.jobTemplates.map((template) => (
                    <label
                      key={template.id}
                      htmlFor={`job-${template.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-accent-foreground/20 transition-all cursor-pointer group"
                    >
                      <Checkbox
                        id={`job-${template.id}`}
                        checked={isSelected("job_template", template.id)}
                        onCheckedChange={() =>
                          handleToggleArtifact("job_template", template.id)
                        }
                        className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{template.name}</span>
                          {template.sop === currentSubModuleId && (
                            <Badge variant="secondary" className="text-xs">
                              Suggested
                            </Badge>
                          )}
                        </div>
                        {template.category && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {template.category}
                          </p>
                        )}
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Log Templates */}
            {availableArtifacts.logTemplates.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
                    <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Log Templates</h3>
                    <p className="text-xs text-muted-foreground">
                      {availableArtifacts.logTemplates.length} organization-wide template{availableArtifacts.logTemplates.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {availableArtifacts.logTemplates.map((template) => (
                    <label
                      key={template.id}
                      htmlFor={`log-${template.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-accent-foreground/20 transition-all cursor-pointer group"
                    >
                      <Checkbox
                        id={`log-${template.id}`}
                        checked={isSelected("log_template", template.id)}
                        onCheckedChange={() =>
                          handleToggleArtifact("log_template", template.id)
                        }
                        className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{template.name}</span>
                          {template.sop === currentSubModuleId && (
                            <Badge variant="secondary" className="text-xs">
                              Suggested
                            </Badge>
                          )}
                        </div>
                        {template.category && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {template.category} • {template.template_type === 'task_list' ? 'Task List' : 'Field Input'}
                          </p>
                        )}
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Company Documents */}
            {availableArtifacts.companyDocuments.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/10">
                    <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Company Documents</h3>
                    <p className="text-xs text-muted-foreground">
                      {availableArtifacts.companyDocuments.length} document{availableArtifacts.companyDocuments.length !== 1 ? 's' : ''} from this sub-module
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {availableArtifacts.companyDocuments.map((doc) => (
                    <label
                      key={doc.id}
                      htmlFor={`doc-${doc.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-accent-foreground/20 transition-all cursor-pointer group"
                    >
                      <Checkbox
                        id={`doc-${doc.id}`}
                        checked={isSelected("company_document", doc.id)}
                        onCheckedChange={() =>
                          handleToggleArtifact("company_document", doc.id)
                        }
                        className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm block">{doc.title}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-xs text-muted-foreground">
              {selectedArtifacts.length > 0 ? (
                <>{selectedArtifacts.length} artifact{selectedArtifacts.length !== 1 ? 's' : ''} selected</>
              ) : (
                <>Select artifacts to create links</>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={linking}>
                Cancel
              </Button>
              <Button
                onClick={handleLinkSelected}
                disabled={selectedArtifacts.length === 0 || linking || loading}
              >
                {linking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    Link {selectedArtifacts.length > 0 ? `(${selectedArtifacts.length})` : 'Selected'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
