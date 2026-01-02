"use client";

import { type Editor } from "@tiptap/react";
import {
  Command,
  Sparkles,
  Wand2,
  TrendingDown,
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  FileText,
  ListTodo,
  MoreHorizontal,
} from "lucide-react";
import * as React from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

interface CommandAction {
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: string;
}

interface CommandPaletteProps {
  editor: Editor;
  onAICommand?: (instruction: string) => void;
}

export function CommandPalette({ editor, onAICommand }: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      
      // AI shortcut
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const commands: CommandAction[] = [
    // AI Commands
    {
      label: "Improve Writing",
      description: "Enhance clarity, grammar, and style",
      icon: <Wand2 className="h-4 w-4" />,
      shortcut: "⌘/",
      category: "AI Assistant",
      action: () => {
        onAICommand?.(
          "Improve the clarity, grammar, and style of the selected text.",
        );
        setOpen(false);
      },
    },
    {
      label: "Make Shorter",
      description: "Condense text while keeping meaning",
      icon: <TrendingDown className="h-4 w-4" />,
      category: "AI Assistant",
      action: () => {
        onAICommand?.(
          "Make the selected text shorter and more concise.",
        );
        setOpen(false);
      },
    },
    {
      label: "Make Longer",
      description: "Expand and elaborate on ideas",
      icon: <TrendingUp className="h-4 w-4" />,
      category: "AI Assistant",
      action: () => {
        onAICommand?.(
          "Expand the selected text while keeping the meaning intact.",
        );
        setOpen(false);
      },
    },
    {
      label: "Simplify Language",
      description: "Make text easier to understand",
      icon: <Lightbulb className="h-4 w-4" />,
      category: "AI Assistant",
      action: () => {
        onAICommand?.(
          "Simplify the language of the selected text for easier understanding.",
        );
        setOpen(false);
      },
    },
    {
      label: "Fix Spelling & Grammar",
      description: "Correct all errors",
      icon: <CheckCircle2 className="h-4 w-4" />,
      category: "AI Assistant",
      action: () => {
        onAICommand?.(
          "Fix all spelling and grammar errors in the selected text.",
        );
        setOpen(false);
      },
    },
    {
      label: "Summarize",
      description: "Create a concise summary",
      icon: <FileText className="h-4 w-4" />,
      category: "AI Assistant",
      action: () => {
        onAICommand?.("Provide a concise summary of the selected text.");
        setOpen(false);
      },
    },
    {
      label: "Generate Action Items",
      description: "Extract tasks from text",
      icon: <ListTodo className="h-4 w-4" />,
      category: "AI Assistant",
      action: () => {
        onAICommand?.(
          "Extract and list action items from the selected text.",
        );
        setOpen(false);
      },
    },
  ];

  // Group commands by category
  const groupedCommands = commands.reduce(
    (acc, command) => {
      if (!acc[command.category]) {
        acc[command.category] = [];
      }
      acc[command.category].push(command);
      return acc;
    },
    {} as Record<string, CommandAction[]>,
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(groupedCommands).map(([category, items], index) => (
          <React.Fragment key={category}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup
              heading={
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {category}
                </div>
              }
            >
              {items.map((command) => (
                <CommandItem
                  key={command.label}
                  onSelect={command.action}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {command.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{command.label}</div>
                    {command.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {command.description}
                      </div>
                    )}
                  </div>
                  {command.shortcut && <Kbd>{command.shortcut}</Kbd>}
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
