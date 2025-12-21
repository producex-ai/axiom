"use client";

import type { Editor } from "@tiptap/react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEditorAI } from "@/hooks/use-editor-ai";
import { cn } from "@/lib/utils";

interface FloatingAIMenuProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  documentTitle?: string;
}

export function FloatingAIMenu({
  editor,
  isOpen,
  onClose,
  position,
  documentTitle,
}: FloatingAIMenuProps) {
  const [prompt, setPrompt] = React.useState("");
  const { isLoading, executeAI, getSelectedText } = useEditorAI({
    editor,
    documentTitle,
  });
  const ref = React.useRef<HTMLDivElement>(null);

  const selectedText = getSelectedText();
  const wordCount = selectedText.split(/\s+/).filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    await executeAI(prompt);
    setPrompt("");
    onClose();
  };

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Close on Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "fixed z-50 w-[420px] rounded-lg border bg-background shadow-lg",
        "fade-in-0 zoom-in-95 slide-in-from-top-2 animate-in",
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-100">
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <p className="text-muted-foreground text-xs">
              {wordCount} word{wordCount !== 1 ? "s" : ""} selected
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        {/* Selected text preview */}
        <div className="rounded-md bg-muted p-3">
          <p className="mb-1 font-medium text-muted-foreground text-xs">
            Selected text:
          </p>
          <p className="line-clamp-3 text-sm">{selectedText}</p>
        </div>

        {/* Prompt input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Write your custom instruction..."
            disabled={isLoading}
            className="flex-1"
            autoFocus
          />
          <Button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            size="sm"
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Run
              </>
            )}
          </Button>
        </form>

        {/* Quick suggestions */}
        <div className="flex flex-wrap gap-2">
          <p className="w-full text-muted-foreground text-xs">Quick actions:</p>
          {["Improve writing", "Make shorter", "Fix grammar", "Summarize"].map(
            (suggestion) => (
              <Badge
                key={suggestion}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => setPrompt(suggestion)}
              >
                {suggestion}
              </Badge>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
