"use client";

import type { Editor } from "@tiptap/react";
import { Loader2, Sparkles } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useEditorAI } from "@/hooks/use-editor-ai";
import { AI_CATEGORIES } from "@/lib/editor/constants";
import { cn } from "@/lib/utils";

interface AIToolbarProps {
  editor: Editor;
  documentTitle?: string;
  className?: string;
}

export function AIToolbar({
  editor,
  documentTitle,
  className,
}: AIToolbarProps) {
  const [open, setOpen] = React.useState(false);
  const { isLoading, executeAI, getSelectedText } = useEditorAI({
    editor,
    documentTitle,
  });

  const selectedText = getSelectedText();
  const hasSelection = selectedText.length > 0;

  const handleSelectInstruction = async (instruction: string) => {
    setOpen(false);
    await executeAI(instruction);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 transition-all",
            hasSelection &&
              "border-purple-200 bg-purple-50 hover:bg-purple-100",
            className,
          )}
          disabled={!hasSelection || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-purple-600" />
              AI Assistant
              {hasSelection && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {selectedText.split(" ").length} words
                </Badge>
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search AI actions..." />
          <CommandList>
            <CommandEmpty>No actions found.</CommandEmpty>
            {AI_CATEGORIES.map((category, index) => (
              <React.Fragment key={category.label}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={category.label}>
                  {category.instructions.map((instruction) => (
                    <CommandItem
                      key={instruction.label}
                      onSelect={() =>
                        handleSelectInstruction(instruction.instruction)
                      }
                      className="cursor-pointer"
                    >
                      <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">{instruction.label}</span>
                        <span className="line-clamp-1 text-muted-foreground text-xs">
                          {instruction.instruction}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
