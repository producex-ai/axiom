"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import { type QuestionItem } from "@/lib/compliance/document-generation";

interface QuestionInputProps {
  question: QuestionItem;
  value: string | boolean;
  isAnswered: boolean;
  onChange: (value: string | boolean) => void;
}

export function QuestionInput({
  question,
  value,
  isAnswered,
  onChange,
}: QuestionInputProps) {
  const stringValue = String(value ?? "");

  switch (question.type) {
    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Select
            value={value === true ? "yes" : value === false ? "no" : ""}
            onValueChange={(val) => onChange(val === "yes")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
          {isAnswered && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          )}
        </div>
      );

    case "date":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
          />
          {isAnswered && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          )}
        </div>
      );

    case "number":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter number..."
          />
          {isAnswered && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          )}
        </div>
      );

    case "text":
    default:
      // Use textarea for longer text questions
      if (question.question.length > 80) {
        return (
          <div className="flex gap-2">
            <Textarea
              value={stringValue}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter your answer..."
              rows={3}
            />
            {isAnswered && (
              <div className="flex items-start pt-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              </div>
            )}
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your answer..."
          />
          {isAnswered && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          )}
        </div>
      );
  }
}
