"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  error?: string;
  className?: string;
  min?: string;
  max?: string;
}

export function DatePicker({
  id,
  name,
  label,
  value,
  onChange,
  required = false,
  placeholder,
  error,
  className,
  min,
  max,
}: DatePickerProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <Label htmlFor={id} className="font-medium text-gray-700 text-sm">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Input
        id={id}
        name={name}
        type="date"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        className="h-9"
      />
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}
