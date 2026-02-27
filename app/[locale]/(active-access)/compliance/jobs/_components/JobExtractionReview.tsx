"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Edit2, Trash2, Plus, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { createBulkJobsAction } from "@/actions/jobs/job-bulk-actions";
import type { OrgMember } from "@/actions/auth/clerk";
import type { FieldMapping } from "@/lib/validators/jobValidators";
import type { ScheduleFrequency } from "@/lib/cron/cron-utils";
import { FREQUENCY_LABELS } from "@/lib/cron/cron-utils";

interface JobExtractionReviewProps {
  extractionData: {
    description?: string;
    columns: string[];
    rows: Array<Record<string, any>>;
    suggestedMappings: FieldMapping[];
    validation: {
      isValid: boolean;
      missingRequiredFields: string[];
      unmappedColumns: string[];
      warnings: string[];
    };
    template: {
      id: string;
      name: string;
      category: string;
      fields?: Array<{
        field_key: string;
        field_label: string;
        field_category: "creation" | "action";
        is_required: boolean;
      }>;
    };
  };
  members: OrgMember[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface EditableJob {
  index: number;
  fields: Record<string, any>;
  assigned_to: string;
  frequency: ScheduleFrequency;
  next_execution_date: string;
  isEditing: boolean;
  errors: string[];
}

export function JobExtractionReview({
  extractionData,
  members,
  onSuccess,
  onCancel,
}: JobExtractionReviewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(
    extractionData.suggestedMappings
  );
  const [jobs, setJobs] = useState<EditableJob[]>(() =>
    extractionData.rows.map((row, index) => ({
      index,
      fields: row,
      assigned_to: "",
      frequency: "monthly" as ScheduleFrequency,
      next_execution_date: "",
      isEditing: false,
      errors: [],
    }))
  );
  const [isCreating, setIsCreating] = useState(false);
  const [globalAssignedTo, setGlobalAssignedTo] = useState("");
  const [globalFrequency, setGlobalFrequency] = useState<ScheduleFrequency>("monthly");
  const [globalNextDate, setGlobalNextDate] = useState("");

  // Get unmapped columns
  // Get all available template fields for dropdown (both creation and action)
  const allTemplateFields = useMemo(() => {
    // If template fields are provided in extractionData, use them
    if (extractionData.template.fields) {
      return extractionData.template.fields.map((f) => ({
        templateFieldKey: f.field_key,
        templateFieldLabel: f.field_label,
        fieldCategory: f.field_category,
      }));
    }
    // Otherwise, use unique fields from suggested mappings
    const uniqueFields = new Map<string, { label: string; category: "creation" | "action" }>();
    extractionData.suggestedMappings.forEach((m) => {
      uniqueFields.set(m.templateFieldKey, {
        label: m.templateFieldLabel,
        category: m.fieldCategory,
      });
    });
    return Array.from(uniqueFields.entries()).map(([key, value]) => ({
      templateFieldKey: key,
      templateFieldLabel: value.label,
      fieldCategory: value.category,
    }));
  }, [extractionData]);

  const unmappedColumns = extractionData.columns.filter(
    (col) => !fieldMappings.find((m) => m.documentColumn === col)
  );

  // Validate jobs
  const validateJobs = useMemo(() => {
    return jobs.map((job) => {
      const errors: string[] = [];

      if (!job.assigned_to) {
        errors.push("Assigned to is required");
      }
      if (!job.next_execution_date) {
        errors.push("Next execution date is required");
      }

      // Check if all required mapped fields have values
      // Only validate CREATION fields (action fields are filled during execution)
      fieldMappings
        .filter((mapping) => mapping.fieldCategory === "creation")
        .forEach((mapping) => {
          const value = job.fields[mapping.documentColumn];
          if (value === undefined || value === null || value === "") {
            errors.push(`${mapping.templateFieldLabel} is missing`);
          }
        });

      return {
        ...job,
        errors,
        isValid: errors.length === 0,
      };
    });
  }, [jobs, fieldMappings]);

  const validJobs = validateJobs.filter((j) => j.isValid);
  const invalidJobs = validateJobs.filter((j) => !j.isValid);

  const handleMappingChange = (documentColumn: string, templateFieldKey: string) => {
    // Find the template field info
    const templateField = allTemplateFields.find(
      (f) => f.templateFieldKey === templateFieldKey
    );

    if (!templateField) return;

    // Remove any existing mapping for this document column
    const newMappings = fieldMappings.filter((m) => m.documentColumn !== documentColumn);

    // Also remove any other mapping that was using this template field (prevent duplicates)
    const filteredMappings = newMappings.filter((m) => m.templateFieldKey !== templateFieldKey);

    // Add new mapping with medium confidence (since it's user-selected)
    filteredMappings.push({
      documentColumn,
      templateFieldKey: templateField.templateFieldKey,
      templateFieldLabel: templateField.templateFieldLabel,
      fieldCategory: templateField.fieldCategory,
      confidence: "medium",
    });

    setFieldMappings(filteredMappings);
  };

  const handleRemoveMapping = (documentColumn: string) => {
    setFieldMappings(fieldMappings.filter((m) => m.documentColumn !== documentColumn));
  };

  const handleUpdateJob = (index: number, updates: Partial<EditableJob>) => {
    setJobs((prev) =>
      prev.map((job) => (job.index === index ? { ...job, ...updates } : job))
    );
  };

  const handleDeleteJob = (index: number) => {
    setJobs((prev) => prev.filter((job) => job.index !== index));
  };

  const handleApplyGlobalValues = () => {
    if (!globalAssignedTo && !globalNextDate) {
      toast({
        title: "No values to apply",
        description: "Please set at least one global value.",
        variant: "destructive",
      });
      return;
    }

    setJobs((prev) =>
      prev.map((job) => ({
        ...job,
        assigned_to: globalAssignedTo || job.assigned_to,
        frequency: globalFrequency || job.frequency,
        next_execution_date: globalNextDate || job.next_execution_date,
      }))
    );

    toast({
      title: "Global values applied",
      description: `Updated ${jobs.length} job(s) successfully.`,
    });
  };

  const handleCreateJobs = async () => {
    if (validJobs.length === 0) {
      toast({
        title: "No valid jobs",
        description: "Please fix validation errors before creating jobs.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Prepare jobs for creation
      const jobInputs = validJobs.map((job) => {
        const creation_field_values: Record<string, any> = {};

        // Map ONLY creation fields (action fields are filled during execution, not creation)
        fieldMappings
          .filter((mapping) => mapping.fieldCategory === "creation")
          .forEach((mapping) => {
            const value = job.fields[mapping.documentColumn];
            creation_field_values[mapping.templateFieldKey] = value;
          });

        return {
          template_id: extractionData.template.id,
          assigned_to: job.assigned_to,
          frequency: job.frequency,
          next_execution_date: job.next_execution_date,
          creation_field_values,
        };
      });

      const result = await createBulkJobsAction({
        templateId: extractionData.template.id,
        fieldMappings,
        jobs: jobInputs,
      });

      if (!result.success) {
        toast({
          title: "Failed to create jobs",
          description: result.error || "An error occurred",
          variant: "destructive",
        });
        return;
      }

      // Show success message
      if (result.data) {
        toast({
          title: "Jobs created successfully",
          description: `Created ${result.data.totalCreated} out of ${result.data.totalAttempted} jobs.`,
        });

        // Show failures if any
        if (result.data.failed.length > 0) {
          toast({
            title: "Some jobs failed",
            description: `${result.data.failed.length} job(s) could not be created.`,
            variant: "destructive",
          });
        }
      }

      onSuccess();
    } catch (error) {
      console.error("Error creating jobs:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle>Template: {extractionData.template.name}</CardTitle>
          <CardDescription>
            {extractionData.template.category} • Extracted {jobs.length} row(s)
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Field Mappings */}
      <Card>
        <CardHeader>
          <CardTitle>Field Mappings</CardTitle>
          <CardDescription>
            Map document columns to template fields. Required fields must be mapped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <Badge variant="secondary" className="mx-1 text-xs">creation</Badge> fields are filled when creating jobs.
              <Badge variant="outline" className="mx-1 text-xs">action</Badge> fields are filled when executing jobs.
            </AlertDescription>
          </Alert>
          
          {fieldMappings.map((mapping, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="flex-1">
                <span className="font-medium">{mapping.documentColumn}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">→</span>
              </div>
              <div className="flex-1">
                <Select
                  value={mapping.templateFieldKey}
                  onValueChange={(value) =>
                    handleMappingChange(mapping.documentColumn, value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allTemplateFields.map((field) => (
                      <SelectItem key={field.templateFieldKey} value={field.templateFieldKey}>
                        <div className="flex items-center gap-2">
                          <span>{field.templateFieldLabel}</span>
                          <Badge 
                            variant={field.fieldCategory === "creation" ? "secondary" : "outline"} 
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {field.fieldCategory}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge
                variant={mapping.fieldCategory === "creation" ? "secondary" : "outline"}
                className="text-xs px-2 py-1 min-w-[60px] justify-center"
              >
                {mapping.fieldCategory}
              </Badge>
              <Badge variant={mapping.confidence === "high" ? "default" : "secondary"} className="text-xs px-2 py-1">
                {mapping.confidence}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveMapping(mapping.documentColumn)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {unmappedColumns.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <div>
                    <strong>Unmapped columns:</strong> {unmappedColumns.join(", ")}
                  </div>
                  <div className="space-y-2">
                    {unmappedColumns.map((col) => (
                      <div key={col} className="flex items-center gap-4 bg-background p-2 rounded">
                        <span className="text-sm flex-1">{col}</span>
                        <span className="text-muted-foreground">→</span>
                        <Select
                          value=""
                          onValueChange={(value) => {
                            const field = allTemplateFields.find(f => f.templateFieldKey === value);
                            if (field) {
                              setFieldMappings([...fieldMappings, {
                                documentColumn: col,
                                templateFieldKey: field.templateFieldKey,
                                templateFieldLabel: field.templateFieldLabel,
                                fieldCategory: field.fieldCategory,
                                confidence: "low",
                              }]);
                            }
                          }}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Map to field..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allTemplateFields
                              .filter(f => !fieldMappings.find(m => m.templateFieldKey === f.templateFieldKey))
                              .map((field) => (
                                <SelectItem key={field.templateFieldKey} value={field.templateFieldKey}>
                                  <div className="flex items-center gap-2">
                                    <span>{field.templateFieldLabel}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {field.fieldCategory}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {extractionData.validation.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {extractionData.validation.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Global Values */}
      <Card>
        <CardHeader>
          <CardTitle>Apply Global Values</CardTitle>
          <CardDescription>
            Set common values for all jobs at once (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned To</label>
              <Select value={globalAssignedTo} onValueChange={setGlobalAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName} ({member.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Frequency</label>
              <Select
                value={globalFrequency}
                onValueChange={(value) => setGlobalFrequency(value as ScheduleFrequency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Next Execution Date</label>
              <Input
                type="date"
                value={globalNextDate}
                onChange={(e) => setGlobalNextDate(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleApplyGlobalValues} className="mt-4" variant="outline">
            <Check className="h-4 w-4 mr-2" />
            Apply to All Jobs
          </Button>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Jobs to Create ({validJobs.length} valid, {invalidJobs.length} invalid)
          </CardTitle>
          <CardDescription>Review and edit jobs before creating</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  {fieldMappings.map((mapping) => (
                    <TableHead key={mapping.documentColumn}>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span>{mapping.templateFieldLabel}</span>
                        <Badge
                          variant={mapping.fieldCategory === "creation" ? "secondary" : "outline"}
                          className="text-[10px] px-1.5 py-0 h-4"
                        >
                          {mapping.fieldCategory}
                        </Badge>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job, idx) => {
                  const validated = validateJobs[idx];
                  return (
                    <TableRow key={job.index} className={!validated.isValid ? "bg-red-50" : ""}>
                      <TableCell>{idx + 1}</TableCell>
                      {fieldMappings.map((mapping) => (
                        <TableCell key={mapping.documentColumn}>
                          {job.isEditing ? (
                            <Input
                              value={job.fields[mapping.documentColumn] || ""}
                              onChange={(e) =>
                                handleUpdateJob(job.index, {
                                  fields: {
                                    ...job.fields,
                                    [mapping.documentColumn]: e.target.value,
                                  },
                                })
                              }
                              className="w-32"
                            />
                          ) : (
                            <span className="text-sm">
                              {job.fields[mapping.documentColumn] || "-"}
                            </span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Select
                          value={job.assigned_to}
                          onValueChange={(value) =>
                            handleUpdateJob(job.index, { assigned_to: value })
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {members.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.firstName} {member.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={job.frequency}
                          onValueChange={(value) =>
                            handleUpdateJob(job.index, {
                              frequency: value as ScheduleFrequency,
                            })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={job.next_execution_date}
                          onChange={(e) =>
                            handleUpdateJob(job.index, { next_execution_date: e.target.value })
                          }
                          className="w-40"
                        />
                      </TableCell>
                      <TableCell>
                        {validated.isValid ? (
                          <Badge variant="default">
                            <Check className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <X className="h-3 w-3 mr-1" />
                            Invalid
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleUpdateJob(job.index, { isEditing: !job.isEditing })
                            }
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteJob(job.index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isCreating}>
          Cancel
        </Button>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {validJobs.length} job(s) ready to create
          </div>
          <Button
            onClick={handleCreateJobs}
            disabled={validJobs.length === 0 || isCreating}
            size="lg"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Jobs...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create {validJobs.length} Job(s)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
