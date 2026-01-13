"use client";

import { type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Sparkles,
  Link2,
  MoreHorizontal,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

interface EditorBubbleMenuProps {
  editor: Editor;
  onAICommand?: (command: string) => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  highlight?: boolean;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  icon,
  label,
  shortcut,
  highlight,
}: ToolbarButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground transition-colors",
              isActive && "bg-accent text-accent-foreground",
              highlight && "text-primary hover:bg-primary/10",
            )}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="flex items-center gap-2">
          <span>{label}</span>
          {shortcut && <Kbd>{shortcut}</Kbd>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function EditorBubbleMenu({
  editor,
  onAICommand,
}: EditorBubbleMenuProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [showAIMenu, setShowAIMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const aiMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!editor) return;

    const updateMenu = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      if (!hasSelection) {
        setIsVisible(false);
        setShowAIMenu(false); // Close AI menu when selection is lost
        return;
      }

      // Get selection coordinates
      const { view } = editor;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);

      // Calculate menu position
      const left = (start.left + end.right) / 2;
      const top = start.top;

      setPosition({
        top: top + window.scrollY - 60, // Position above selection
        left: left + window.scrollX,
      });
      setIsVisible(true);
    };

    // Listen to selection changes
    editor.on("selectionUpdate", updateMenu);
    editor.on("update", updateMenu);

    return () => {
      editor.off("selectionUpdate", updateMenu);
      editor.off("update", updateMenu);
    };
  }, [editor]);

  // Close AI menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showAIMenu &&
        aiMenuRef.current &&
        !aiMenuRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setShowAIMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAIMenu]);

  if (!editor || !isVisible) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-50 flex items-center gap-0.5 rounded-lg border bg-background p-1 shadow-lg",
        "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
      }}
    >
      {/* Text Formatting */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          disabled={!editor.can().toggleBold()}
          icon={<Bold className="h-4 w-4" />}
          label="Bold"
          shortcut="⌘B"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          disabled={!editor.can().toggleItalic()}
          icon={<Italic className="h-4 w-4" />}
          label="Italic"
          shortcut="⌘I"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          disabled={!editor.can().toggleStrike()}
          icon={<Strikethrough className="h-4 w-4" />}
          label="Strikethrough"
          shortcut="⌘⇧X"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          disabled={!editor.can().toggleCode()}
          icon={<Code className="h-4 w-4" />}
          label="Code"
          shortcut="⌘E"
        />
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* AI Assistant */}
      {onAICommand && (
        <>
          <div className="relative">
            <ToolbarButton
              onClick={() => setShowAIMenu(!showAIMenu)}
              icon={<Sparkles className="h-4 w-4" />}
              label="AI Assistant"
              shortcut="⌘/"
              highlight
            />
            {showAIMenu && (
              <div
                ref={aiMenuRef}
                className={cn(
                  "absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50",
                  "w-64 rounded-lg border bg-background p-2 shadow-lg",
                  "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
                )}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="space-y-1">
                  <button
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                    onClick={() => {
                      onAICommand(
                        "Improve the clarity, grammar, and style of the selected text.",
                      );
                      setShowAIMenu(false);
                    }}
                  >
                    <div className="font-medium">✨ Improve Writing</div>
                    <div className="text-xs text-muted-foreground">
                      Enhance clarity & grammar
                    </div>
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                    onClick={() => {
                      onAICommand(
                        "Make the selected text shorter and more concise.",
                      );
                      setShowAIMenu(false);
                    }}
                  >
                    <div className="font-medium">📉 Make Shorter</div>
                    <div className="text-xs text-muted-foreground">
                      Condense the text
                    </div>
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                    onClick={() => {
                      onAICommand(
                        "Expand the selected text while keeping the meaning intact.",
                      );
                      setShowAIMenu(false);
                    }}
                  >
                    <div className="font-medium">📈 Make Longer</div>
                    <div className="text-xs text-muted-foreground">
                      Expand the content
                    </div>
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                    onClick={() => {
                      onAICommand(
                        "Simplify the language of the selected text for easier understanding.",
                      );
                      setShowAIMenu(false);
                    }}
                  >
                    <div className="font-medium">💡 Simplify</div>
                    <div className="text-xs text-muted-foreground">
                      Easier to understand
                    </div>
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                    onClick={() => {
                      onAICommand(
                        "Fix all spelling and grammar errors in the selected text.",
                      );
                      setShowAIMenu(false);
                    }}
                  >
                    <div className="font-medium">✓ Fix Grammar</div>
                    <div className="text-xs text-muted-foreground">
                      Correct all errors
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
          <Separator orientation="vertical" className="mx-1 h-6" />
        </>
      )}

      {/* Additional Actions */}
      <ToolbarButton
        onClick={() => {
          const url = window.prompt("Enter URL");
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        isActive={editor.isActive("link")}
        icon={<Link2 className="h-4 w-4" />}
        label="Link"
        shortcut="⌘K"
      />
    </div>
  );
}
