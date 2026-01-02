"use client";

import { type Editor, Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import {
  Sparkles,
  Wand2,
  TrendingDown,
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  FileText,
  ListTodo,
} from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import tippy, { type Instance as TippyInstance } from "tippy.js";

interface SlashCommand {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (editor: Editor) => void;
  category: string;
}

interface SlashCommandMenuProps {
  items: SlashCommand[];
  command: (item: SlashCommand) => void;
  onClose?: () => void;
}

const SlashCommandMenu = React.forwardRef<
  HTMLDivElement,
  SlashCommandMenuProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : props.items.length - 1,
        );
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev < props.items.length - 1 ? prev + 1 : 0,
        );
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (props.items[selectedIndex]) {
          props.command(props.items[selectedIndex]);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        props.onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [props, selectedIndex]);

  if (props.items.length === 0) {
    return (
      <div
        ref={ref}
        className="rounded-lg border bg-background p-4 shadow-lg w-[400px]"
      >
        <p className="text-sm text-muted-foreground">No commands found</p>
      </div>
    );
  }

  // Group items by category
  const groupedItems = props.items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, SlashCommand[]>,
  );

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-background shadow-xl w-[400px] max-h-[400px] overflow-y-auto",
        "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2",
      )}
    >
      <div className="p-2">
        {Object.entries(groupedItems).map(([category, items], categoryIndex) => (
          <div key={category}>
            {categoryIndex > 0 && <div className="h-px bg-border my-2" />}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              {category}
            </div>
            {items.map((item, index) => {
              const globalIndex = props.items.indexOf(item);
              const isSelected = globalIndex === selectedIndex;
              return (
                <button
                  key={index}
                  onClick={() => props.command(item)}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent text-accent-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-muted",
                    )}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

SlashCommandMenu.displayName = "SlashCommandMenu";

export interface SlashCommandExtensionOptions {
  onAICommand?: (editor: Editor, command: string) => void;
}

export const SlashCommandExtension = (
  options: SlashCommandExtensionOptions = {},
) =>
  Extension.create({
    name: "slashCommand",

    addOptions() {
      return {
        suggestion: {
          char: "/",
          startOfLine: false,
          command: ({ editor, range, props }: any) => {
            props.command(editor, range);
          },
        } as Partial<SuggestionOptions>,
      };
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
          items: ({ query }: { query: string }): SlashCommand[] => {
            const commands: SlashCommand[] = [
              {
                title: "Improve Writing",
                description: "Enhance clarity, grammar, and style",
                icon: <Wand2 className="h-4 w-4" />,
                category: "✨ AI Assistant",
                command: (editor) => {
                  options.onAICommand?.(
                    editor,
                    "Improve the clarity, grammar, and style of the selected text.",
                  );
                },
              },
              {
                title: "Make Shorter",
                description: "Condense text while keeping meaning",
                icon: <TrendingDown className="h-4 w-4" />,
                category: "✨ AI Assistant",
                command: (editor) => {
                  options.onAICommand?.(
                    editor,
                    "Make the selected text shorter and more concise.",
                  );
                },
              },
              {
                title: "Make Longer",
                description: "Expand and elaborate on ideas",
                icon: <TrendingUp className="h-4 w-4" />,
                category: "✨ AI Assistant",
                command: (editor) => {
                  options.onAICommand?.(
                    editor,
                    "Expand the selected text while keeping the meaning intact.",
                  );
                },
              },
              {
                title: "Simplify Language",
                description: "Make text easier to understand",
                icon: <Lightbulb className="h-4 w-4" />,
                category: "✨ AI Assistant",
                command: (editor) => {
                  options.onAICommand?.(
                    editor,
                    "Simplify the language of the selected text for easier understanding.",
                  );
                },
              },
              {
                title: "Fix Spelling & Grammar",
                description: "Correct all errors",
                icon: <CheckCircle2 className="h-4 w-4" />,
                category: "✨ AI Assistant",
                command: (editor) => {
                  options.onAICommand?.(
                    editor,
                    "Fix all spelling and grammar errors in the selected text.",
                  );
                },
              },
              {
                title: "Summarize",
                description: "Create a concise summary",
                icon: <FileText className="h-4 w-4" />,
                category: "✨ AI Assistant",
                command: (editor) => {
                  options.onAICommand?.(
                    editor,
                    "Provide a concise summary of the selected text.",
                  );
                },
              },
              {
                title: "Generate Action Items",
                description: "Extract tasks from text",
                icon: <ListTodo className="h-4 w-4" />,
                category: "✨ AI Assistant",
                command: (editor) => {
                  options.onAICommand?.(
                    editor,
                    "Extract and list action items from the selected text.",
                  );
                },
              },
            ];

            return commands.filter((item) =>
              item.title.toLowerCase().includes(query.toLowerCase()),
            );
          },
          render: () => {
            let component: ReactRenderer<any>;
            let popup: TippyInstance[];

            return {
              onStart: (props: any) => {
                component = new ReactRenderer(SlashCommandMenu, {
                  props: {
                    ...props,
                    onClose: () => {
                      popup?.[0]?.hide();
                    },
                  },
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                  maxWidth: "none",
                });
              },

              onUpdate(props: any) {
                component?.updateProps({
                  ...props,
                  onClose: () => {
                    popup?.[0]?.hide();
                  },
                });

                if (!props.clientRect) {
                  return;
                }

                popup?.[0]?.setProps({
                  getReferenceClientRect: props.clientRect,
                });
              },

              onKeyDown(props: any) {
                if (props.event.key === "Escape") {
                  popup?.[0]?.hide();
                  return true;
                }

                return false;
              },

              onExit() {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
        }),
      ];
    },
  });
