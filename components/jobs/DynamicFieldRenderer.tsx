"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { JobTemplateField } from "@/lib/services/jobTemplateService";

interface DynamicFieldRendererProps {
  fields: JobTemplateField[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  errors?: any;
}

export function DynamicFieldRenderer({
  fields,
  values,
  onChange,
  errors,
}: DynamicFieldRendererProps) {
  const handleFieldChange = (fieldKey: string, value: any) => {
    onChange({
      ...values,
      [fieldKey]: value,
    });
  };

  const renderField = (field: JobTemplateField) => {
    const value = values[field.field_key] ?? "";
    const error = errors?.[field.field_key];

    // All fields are rendered as simple text inputs
    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={field.field_key}>
          {field.field_label}
          {field.is_required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id={field.field_key}
          type="text"
          value={value}
          onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
          placeholder={`Enter ${field.field_label.toLowerCase()}`}
          required={field.is_required}
        />
        {error && (
          <p className="text-sm text-red-500">{error.message}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => renderField(field))}
    </div>
  );
}
