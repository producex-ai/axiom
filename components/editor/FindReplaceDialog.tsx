"use client";

import * as React from "react";
import type { Editor } from "@tiptap/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Search,
  Replace,
  ChevronDown,
  ChevronUp,
  ReplaceAll,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FindReplaceDialogProps {
  editor: Editor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FindReplaceDialog({
  editor,
  open,
  onOpenChange,
}: FindReplaceDialogProps) {
  const [findValue, setFindValue] = React.useState("");
  const [replaceValue, setReplaceValue] = React.useState("");
  const [caseSensitive, setCaseSensitive] = React.useState(false);
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  // Get current match info from editor storage
  const currentIndex =
    editor?.storage?.findReplace?.currentIndex ?? -1;
  const resultsCount =
    editor?.storage?.findReplace?.results?.length ?? 0;

  // Force re-render when editor updates
  React.useEffect(() => {
    if (!editor || !open) return;

    const handleUpdate = () => {
      forceUpdate();
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor, open]);

  // Update search when find value changes
  React.useEffect(() => {
    if (editor && open) {
      editor.commands.setSearchTerm(findValue);
    }
  }, [findValue, editor, open]);

  // Clear search when dialog closes
  React.useEffect(() => {
    if (!open && editor) {
      editor.commands.clearSearch();
      setFindValue("");
      setReplaceValue("");
    }
  }, [open, editor]);

  const handleFindNext = () => {
    if (editor) {
      editor.commands.findNext();
    }
  };

  const handleFindPrevious = () => {
    if (editor) {
      editor.commands.findPrevious();
    }
  };

  const handleReplace = () => {
    if (editor) {
      editor.commands.replaceNext(replaceValue);
    }
  };

  const handleReplaceAll = () => {
    if (editor) {
      editor.commands.replaceAll(replaceValue);
    }
  };

  const handleToggleCaseSensitive = () => {
    if (editor) {
      editor.commands.toggleCaseSensitive();
      setCaseSensitive(!caseSensitive);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handleFindPrevious();
      } else {
        handleFindNext();
      }
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] w-[450px] bg-background border rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Find & Replace</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-3">
        {/* Find Input */}
        <div className="space-y-1.5">
          <Label htmlFor="find-input" className="text-xs font-medium">
            Find
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="find-input"
              placeholder="Search in document..."
              value={findValue}
              onChange={(e) => setFindValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 pr-16 h-9"
              autoFocus
            />
            {resultsCount > 0 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground bg-background px-1">
                {currentIndex + 1}/{resultsCount}
              </div>
            )}
            {resultsCount === 0 && findValue && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-destructive">
                No results
              </div>
            )}
          </div>
        </div>

        {/* Replace Input */}
        <div className="space-y-1.5">
          <Label htmlFor="replace-input" className="text-xs font-medium">
            Replace
          </Label>
          <div className="relative">
            <Replace className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="replace-input"
              placeholder="Replace with..."
              value={replaceValue}
              onChange={(e) => setReplaceValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Options and Actions Row */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant={caseSensitive ? "default" : "outline"}
            size="sm"
            onClick={handleToggleCaseSensitive}
            className="h-8 px-2"
            title="Case sensitive"
          >
            Aa
          </Button>

          <div className="flex-1" />

          {/* Navigation Buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFindPrevious}
            disabled={resultsCount === 0}
            className="h-8 w-8 p-0"
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFindNext}
            disabled={resultsCount === 0}
            className="h-8 w-8 p-0"
            title="Next match (Enter)"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Replace Actions Row */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReplace}
            disabled={resultsCount === 0 || currentIndex === -1}
            className="flex-1 h-8"
          >
            Replace
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReplaceAll}
            disabled={resultsCount === 0}
            className="flex-1 h-8"
          >
            Replace All
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-[10px] text-muted-foreground pt-1 border-t space-y-0.5">
          <div>
            <kbd className="px-1 py-0.5 text-[10px] border rounded bg-muted">
              Enter
            </kbd>{" "}
            Next •{" "}
            <kbd className="px-1 py-0.5 text-[10px] border rounded bg-muted">
              Shift+Enter
            </kbd>{" "}
            Previous •{" "}
            <kbd className="px-1 py-0.5 text-[10px] border rounded bg-muted">
              Esc
            </kbd>{" "}
            Close
          </div>
        </div>
      </div>
    </div>
  );
}
