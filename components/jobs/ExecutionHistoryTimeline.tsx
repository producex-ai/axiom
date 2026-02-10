"use client";

import type { ExecutionHistoryItem } from "@/lib/services/jobService";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, User, Calendar } from "lucide-react";

interface ExecutionHistoryTimelineProps {
  history: ExecutionHistoryItem[];
}

export function ExecutionHistoryTimeline({
  history,
}: ExecutionHistoryTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          No execution history yet
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Execute this job to create history entries
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item, index) => {
        const performedDate = new Date(item.performed_at);

        return (
          <Card key={item.id} className="relative overflow-hidden">
            {/* Timeline connector */}
            {index < history.length - 1 && (
              <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-border -mb-4" />
            )}

            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="relative">
                    <CheckCircle2 className="h-8 w-8 text-green-600 bg-white rounded-full" />
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.performed_by_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {performedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {performedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground italic">
                        "{item.notes}"
                      </p>
                    </div>
                  )}

                  {item.action_values && item.action_values.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                        Captured Data
                      </h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {item.action_values.map((av) => (
                          <div
                            key={av.field_key}
                            className="border rounded-lg p-2 bg-card"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-muted-foreground">
                                {av.field_label}
                              </span>
                              <Badge variant="outline" className="text-xs h-5">
                                {av.field_type}
                              </Badge>
                            </div>
                            <div className="text-sm font-medium">
                              {av.field_type === "checkbox"
                                ? av.value
                                  ? "Yes"
                                  : "No"
                                : av.value?.toString() || "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
