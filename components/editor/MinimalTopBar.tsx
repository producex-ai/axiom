"use client";

import { type Editor } from "@tiptap/react";
import { Eye, MoreHorizontal, Save } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

interface MinimalTopBarProps {
  editor: Editor;
  documentTitle?: string;
  readOnly?: boolean;
  onToggleReadOnly?: () => void;
  onSave?: () => void;
  className?: string;
  hideTitle?: boolean;
}

export function MinimalTopBar({
  editor,
  documentTitle,
  readOnly,
  onToggleReadOnly,
  onSave,
  className,
  hideTitle,
}: MinimalTopBarProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-6 py-3",
        className,
      )}
    >
      {/* Document Title */}
      {!hideTitle && (
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">
            {documentTitle || "Untitled Document"}
          </h1>
        </div>
      )}
      {hideTitle && <div className="flex-1" />}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Edit Mode Toggle */}
        {onToggleReadOnly && (
          <>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {readOnly ? "View" : "Edit"}
                    </span>
                    <Switch
                      checked={!readOnly}
                      onCheckedChange={() => onToggleReadOnly()}
                      className="scale-75"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex items-center gap-2">
                    <span>Toggle edit mode</span>
                    <Kbd>⌘E</Kbd>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}

        {/* Save Button */}
        {onSave && !readOnly && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSave}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex items-center gap-2">
                  <span>Save document</span>
                  <Kbd>⌘S</Kbd>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

      </div>
    </div>
  );
}
