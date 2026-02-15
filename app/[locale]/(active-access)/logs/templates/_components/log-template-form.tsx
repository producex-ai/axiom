"use client";

import { FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  type CreateTemplateState,
  createLogTemplateAction,
  updateLogTemplateAction,
} from "@/actions/log-templates";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  FieldItem,
  ReviewTimePeriod,
  TaskItem,
  TemplateType,
} from "@/db/queries/log-templates";
import { uploadAndExtractTasks } from "@/lib/ai/extract-tasks";
import { CATEGORY_OPTIONS, SOP_OPTIONS } from "@/lib/constants/log-templates";

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-fit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isEditing ? "Updating..." : "Creating..."}
        </>
      ) : isEditing ? (
        "Update Template"
      ) : (
        "Create Template"
      )}
    </Button>
  );
}

// Helper to bind additional arguments to the server action
function bindUpdateAction(id: string) {
  return updateLogTemplateAction.bind(null, id);
}

interface LogTemplateFormProps {
  mode?: "create" | "edit";
  enabledModules?: string[];
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    sop: string | null;
    template_type: TemplateType;
    items: TaskItem[] | FieldItem[];
    review_time: ReviewTimePeriod | null;
  };
}

type ItemState = (TaskItem | FieldItem) & { id: number };

export function LogTemplateForm({
  mode = "create",
  enabledModules = [],
  initialData,
}: LogTemplateFormProps) {
  const initialState: CreateTemplateState = { message: "", errors: {} };

  // Choose the action based on mode
  const actionToUse =
    mode === "edit" && initialData?.id
      ? bindUpdateAction(initialData.id)
      : createLogTemplateAction;

  const [state, formAction] = useActionState(actionToUse, initialState);

  // Determine initial template type
  const initialTemplateType: TemplateType =
    initialData?.template_type || "task_list";
  const [templateType, setTemplateType] =
    useState<TemplateType>(initialTemplateType);

  // Initialize items from initialData or default to one empty item
  const getInitialItems = (): ItemState[] => {
    if (initialData?.items && initialData.items.length > 0) {
      // Map items based on template type to ensure proper structure
      if (initialTemplateType === "field_input") {
        return initialData.items.map((item, i) => ({
          id: i,
          name: item.name,
          description: (item as FieldItem).description || "",
          required: (item as FieldItem).required ?? false,
        }));
      } else {
        return initialData.items.map((item, i) => ({
          id: i,
          name: item.name,
        }));
      }
    }
    // Default empty item based on template type
    return templateType === "task_list"
      ? [{ id: 0, name: "" }]
      : [{ id: 0, name: "", description: "", required: false }];
  };

  const [items, setItems] = useState<ItemState[]>(getInitialItems());
  const [nextId, setNextId] = useState(initialData?.items?.length || 1);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter SOP_OPTIONS to only show enabled modules
  const filteredSopOptions = SOP_OPTIONS.filter((group) =>
    enabledModules.includes(group.module),
  );

  const addItem = () => {
    const newItem: ItemState =
      templateType === "task_list"
        ? { id: nextId, name: "" }
        : { id: nextId, name: "", description: "", required: false };
    setItems([...items, newItem]);
    setNextId(nextId + 1);
  };

  const removeItem = (idToRemove: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.id !== idToRemove));
  };

  const updateItem = (id: number, field: string, value: string | boolean) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleTemplateTypeChange = (newType: TemplateType) => {
    setTemplateType(newType);
    // Reset items when switching types
    const newItem: ItemState =
      newType === "task_list"
        ? { id: 0, name: "" }
        : { id: 0, name: "", description: "", required: false };
    setItems([newItem]);
    setNextId(1);
  };

  const handleFileExtract = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractError(null);

    try {
      // Upload file to S3 and extract tasks/fields using server action
      const result = await uploadAndExtractTasks(file, templateType);

      if (result.success) {
        // Handle extracted description if present
        if (result.description) {
          // Update the description field in the form
          const descriptionField = document.getElementById(
            "description",
          ) as HTMLTextAreaElement;
          if (descriptionField && !descriptionField.value) {
            // Only set if description is empty
            descriptionField.value = result.description;
          }
        }

        // Handle tasks or fields based on template type
        if (
          templateType === "task_list" &&
          result.tasks &&
          result.tasks.length > 0
        ) {
          // Replace current items with extracted tasks
          setItems(
            result.tasks.map((task, i) => ({
              id: nextId + i,
              name: task,
            })),
          );
          setNextId(nextId + result.tasks.length);
        } else if (
          templateType === "field_input" &&
          result.fields &&
          result.fields.length > 0
        ) {
          // Replace current items with extracted fields
          setItems(
            result.fields.map((field, i) => ({
              id: nextId + i,
              name: field.name,
              description: field.description || "",
              required: field.required,
            })),
          );
          setNextId(nextId + result.fields.length);
        } else {
          setExtractError(
            result.error ||
              `No ${templateType === "task_list" ? "tasks" : "fields"} found in the document`,
          );
        }
      } else {
        setExtractError(result.error || "Extraction failed");
      }
    } catch (error) {
      console.error("Extract error:", error);
      setExtractError("Failed to extract. Please try again.");
    } finally {
      setIsExtracting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Form Fields */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={initialData?.name}
                placeholder="e.g., Opening Checklist"
                aria-describedby="name-error"
                required
              />
              {state.errors?.name && (
                <p id="name-error" className="text-destructive text-sm">
                  {state.errors.name.join(", ")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                name="category"
                defaultValue={initialData?.category || undefined}
                required
              >
                <SelectTrigger className="w-full" id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.errors?.category && (
                <p id="category-error" className="text-destructive text-sm">
                  {state.errors.category.join(", ")}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={initialData?.description || ""}
              placeholder="Additional context or instructions for this template..."
              rows={3}
              aria-describedby="description-error"
            />
            {state.errors?.description && (
              <p id="description-error" className="text-destructive text-sm">
                {state.errors.description.join(", ")}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              Provide any additional information to help users understand this
              template
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sop">Standard Operating Procedure (SOP)</Label>
              <Select
                name="sop"
                defaultValue={initialData?.sop || undefined}
                required
              >
                <SelectTrigger className="w-full" id="sop">
                  <SelectValue placeholder="Select an SOP module" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSopOptions.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {state.errors?.sop && (
                <p id="sop-error" className="text-destructive text-sm">
                  {state.errors.sop.join(", ")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="review_time">Review Time</Label>
              <Select
                name="review_time"
                defaultValue={initialData?.review_time || "1_year"}
                required
              >
                <SelectTrigger className="w-full" id="review_time">
                  <SelectValue placeholder="Select review period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1_month">1 Month</SelectItem>
                  <SelectItem value="3_months">3 Months</SelectItem>
                  <SelectItem value="6_months">6 Months</SelectItem>
                  <SelectItem value="1_year">1 Year</SelectItem>
                </SelectContent>
              </Select>
              {state.errors?.review_time && (
                <p className="text-destructive text-sm">
                  {state.errors.review_time.join(", ")}
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                How often this template should be reviewed
              </p>
            </div>
          </div>

          {/* Template Type Selection */}
          <div className="space-y-3">
            <Label>Template Type</Label>
            <RadioGroup
              name="template_type"
              value={templateType}
              onValueChange={(value: string) =>
                handleTemplateTypeChange(value as TemplateType)
              }
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="task_list" id="task_list" />
                <Label
                  htmlFor="task_list"
                  className="cursor-pointer font-normal"
                >
                  Task List (Checkboxes)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="field_input" id="field_input" />
                <Label
                  htmlFor="field_input"
                  className="cursor-pointer font-normal"
                >
                  Field Input (Text Fields)
                </Label>
              </div>
            </RadioGroup>
            <p className="text-muted-foreground text-xs">
              {templateType === "task_list"
                ? "Assignees will check off completed tasks"
                : "Assignees will fill in text information for each field"}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-lg">
                {templateType === "task_list" ? "Task List" : "Field List"}
              </h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Extract{" "}
                      {templateType === "task_list" ? "Tasks" : "Fields"}
                    </>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.doc,.docx,.pdf,.png,.jpg"
                  onChange={handleFileExtract}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add {templateType === "task_list" ? "Task" : "Field"}
                </Button>
              </div>
            </div>

            {extractError && (
              <Alert variant="destructive">
                <AlertDescription>{extractError}</AlertDescription>
              </Alert>
            )}

            {/* Hidden field to pass items as JSON for field_input type */}
            {templateType === "field_input" && (
              <input
                type="hidden"
                name="items"
                value={JSON.stringify(items.map(({ id, ...rest }) => rest))}
              />
            )}

            <div className="space-y-3">
              {templateType === "task_list"
                ? // Task List Mode - Simple text inputs
                  items.map((item, index) => (
                    <div key={item.id} className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          name="items"
                          value={(item as TaskItem).name}
                          onChange={(e) =>
                            updateItem(item.id, "name", e.target.value)
                          }
                          placeholder={`Task ${index + 1}`}
                          aria-label={`Task ${index + 1}`}
                          required
                        />
                      </div>
                      {items.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          aria-label="Remove task"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      ) : (
                        <div className="w-10" />
                      )}
                    </div>
                  ))
                : // Field Input Mode - Name, Description, Required
                  items.map((item, index) => {
                    const fieldItem = item as FieldItem;
                    return (
                      <Card key={item.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 space-y-3">
                              <div className="space-y-2">
                                <Label htmlFor={`field-name-${item.id}`}>
                                  Field Name
                                </Label>
                                <Input
                                  id={`field-name-${item.id}`}
                                  value={fieldItem.name}
                                  onChange={(e) =>
                                    updateItem(item.id, "name", e.target.value)
                                  }
                                  placeholder={`Field ${index + 1}`}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`field-desc-${item.id}`}>
                                  Description (Optional)
                                </Label>
                                <Textarea
                                  id={`field-desc-${item.id}`}
                                  value={fieldItem.description || ""}
                                  onChange={(e) =>
                                    updateItem(
                                      item.id,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Brief description or hint"
                                  rows={2}
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`field-required-${item.id}`}
                                  checked={fieldItem.required}
                                  onCheckedChange={(checked) =>
                                    updateItem(
                                      item.id,
                                      "required",
                                      checked as boolean,
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={`field-required-${item.id}`}
                                  className="cursor-pointer font-normal"
                                >
                                  Required field
                                </Label>
                              </div>
                            </div>
                            {items.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.id)}
                                aria-label="Remove field"
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              {state.errors?.items && (
                <p className="text-destructive text-sm">
                  {state.errors.items.join(", ")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton isEditing={mode === "edit"} />
      </div>
    </form>
  );
}
