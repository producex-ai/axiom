"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createJobTemplateSchema,
  type CreateJobTemplateInput,
} from "@/lib/validators/jobValidators";
import { createJobTemplate } from "@/lib/actions/jobTemplateActions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SOP_OPTIONS } from "@/lib/constants/log-templates";

interface TemplateBuilderFormProps {
  enabledModules?: string[];
}

export function TemplateBuilderForm({
  enabledModules = [],
}: TemplateBuilderFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateJobTemplateInput>({
    resolver: zodResolver(createJobTemplateSchema),
    defaultValues: {
      name: "",
      category: "",
      doc_num: "",
      sop: "",
      description: "",
      fields: [
        {
          field_key: "title",
          field_label: "Job Title",
          field_type: "text" as const,
          field_category: "creation" as const,
          is_required: true,
          display_order: 0,
          config_json: {},
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  const onSubmit = async (data: CreateJobTemplateInput) => {
    setIsSubmitting(true);
    try {
      // Auto-generate field_key from field_label for creation fields
      const processedData = {
        ...data,
        fields: data.fields.map((field) => {
          if (field.field_category === "creation" && !field.field_key) {
            // Generate field_key from field_label (convert to snake_case)
            const generatedKey = field.field_label
              .toLowerCase()
              .replace(/\s+/g, "_")
              .replace(/[^a-z0-9_]/g, "");
            return { ...field, field_key: generatedKey };
          }
          return field;
        }),
      };

      console.log("Submitting template data:", processedData);
      const result = await createJobTemplate(processedData);
      console.log("Template creation result:", result);
      if (result.success) {
        toast({
          title: "Template created",
          description: "Job template has been created successfully.",
        });
        router.push("/compliance/job-templates");
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create template",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Template creation error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Log form errors for debugging
  const formErrors = form.formState.errors;
  if (Object.keys(formErrors).length > 0) {
    console.log("Form validation errors:", formErrors);
  }

  const addField = (category: "creation" | "action") => {
    append({
      field_key: category === "creation" ? "field" : "",
      field_label: "",
      field_type: "text" as const,
      field_category: category,
      is_required: true,
      display_order: fields.length,
      config_json: {},
    });
  };

  // Filter SOP_OPTIONS to only show enabled modules
  const filteredSopOptions =
    enabledModules.length > 0
      ? SOP_OPTIONS.filter((group) => enabledModules.includes(group.module))
      : SOP_OPTIONS;

  const creationFields = fields.filter(
    (_, idx) => form.watch(`fields.${idx}.field_category`) === "creation",
  );
  const actionFields = fields.filter(
    (_, idx) => form.watch(`fields.${idx}.field_category`) === "action",
  );

  return (
    <div className="w-full max-w-full">
      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.error("Form validation failed:", errors);
            toast({
              title: "Validation Error",
              description: "Please check all required fields and try again.",
              variant: "destructive",
            });
          })} 
          className="space-y-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
              <CardDescription>
                Basic information about the job template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Row 1: Template Name and Category */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Monthly Security Review"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Security, Compliance, Operations"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 2: Document Number and SOP */}
              <div className="flex flex-col gap-4 md:flex-row">
                <FormField
                  control={form.control}
                  name="doc_num"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Document Number</FormLabel>
                      <FormControl>
                        <Input placeholder="DOC-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sop"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>SOP</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an SOP module" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent side="bottom" align="start" className="w-full">
                          {filteredSopOptions.map((group) => (
                            <SelectGroup key={group.label}>
                              <SelectLabel>{group.label}</SelectLabel>
                              {group.options.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 3: Description (full width) */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this template is used for"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Creation Fields</CardTitle>
                  <CardDescription>
                    Fields collected when creating a job from this template
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addField("creation")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => {
                  if (
                    form.watch(`fields.${index}.field_category`) !== "creation"
                  )
                    return null;

                  return (
                    <div key={field.id} className="border rounded-lg p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center">
                          <FormField
                            control={form.control}
                            name={`fields.${index}.field_label`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="sm:sr-only">
                                  Label
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Location / Description / Qty ..." 
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      // Auto-generate field_key from label for creation fields
                                      const generatedKey = e.target.value
                                        .toLowerCase()
                                        .replace(/\s+/g, "_")
                                        .replace(/[^a-z0-9_]/g, "");
                                      form.setValue(`fields.${index}.field_key`, generatedKey || "field");
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Hidden field_key field for creation fields */}
                          <input 
                            type="hidden" 
                            {...form.register(`fields.${index}.field_key`)} 
                          />

                          <FormField
                            control={form.control}
                            name={`fields.${index}.is_required`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Required
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Action Fields</CardTitle>
                  <CardDescription>
                    Fields collected when executing the job
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addField("action")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => {
                  if (form.watch(`fields.${index}.field_category`) !== "action")
                    return null;

                  return (
                    <div key={field.id} className="border rounded-lg p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-center">
                          <FormField
                            control={form.control}
                            name={`fields.${index}.field_label`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="sm:sr-only">
                                  Label
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="Glass Brittle / Condition / Breakage reoport ..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`fields.${index}.field_key`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="sm:sr-only">
                                  Action Description
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Intact / Broken / Damaged ..."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`fields.${index}.is_required`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Required
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Template
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
