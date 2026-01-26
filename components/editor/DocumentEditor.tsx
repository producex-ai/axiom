"use client";

import FileHandler from "@tiptap/extension-file-handler";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import * as React from "react";
import type { DocumentEditorProps } from "@/lib/editor/types";
import { cn } from "@/lib/utils";
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import { SlashCommandExtension } from "./SlashCommand";
import { AIDiffView, AIProcessingIndicator } from "./AIDiffView";
import { CommandPalette } from "./CommandPalette";
import { FindReplaceExtension } from "./extensions/FindReplaceExtension";
import { FindReplaceDialog } from "./FindReplaceDialog";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export function DocumentEditor({
  initialContent = "",
  readOnly = false,
  onChange,
  onSave,
  showAI = true,
  placeholder = "Start writing your document... Press '/' for AI commands",
}: DocumentEditorProps) {
  const [aiSuggestion, setAiSuggestion] = React.useState<{
    original: string;
    suggestion: string;
  } | null>(null);
  const [isAIProcessing, setIsAIProcessing] = React.useState(false);
  const [showBubbleAI, setShowBubbleAI] = React.useState(false);
  const [showFindReplace, setShowFindReplace] = React.useState(false);

  // Use a ref to store the AI command handler so it can be used in the extension
  const handleAICommandRef =
    React.useRef<(instruction: string) => Promise<void> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-4 cursor-pointer",
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:absolute before:text-muted-foreground before:pointer-events-none before:h-0",
      }),
      FileHandler.configure({
        allowedMimeTypes: [
          "image/png",
          "image/jpeg",
          "image/gif",
          "image/webp",
        ],
        onDrop: (currentEditor, files, pos) => {
          files.forEach((file) => {
            const fileReader = new FileReader();

            fileReader.readAsDataURL(file);
            fileReader.onload = () => {
              currentEditor
                .chain()
                .insertContentAt(pos, {
                  type: "image",
                  attrs: {
                    src: fileReader.result,
                  },
                })
                .focus()
                .run();
            };
          });
        },
        onPaste: (currentEditor, files) => {
          files.forEach((file) => {
            const fileReader = new FileReader();

            fileReader.readAsDataURL(file);
            fileReader.onload = () => {
              currentEditor
                .chain()
                .insertContentAt(currentEditor.state.selection.anchor, {
                  type: "image",
                  attrs: {
                    src: fileReader.result,
                  },
                })
                .focus()
                .run();
            };
          });
        },
      }),
      // Add slash command for AI
      ...(showAI
        ? [
            SlashCommandExtension({
              onAICommand: (editor, command) => {
                handleAICommandRef.current?.(command);
              },
            }),
          ]
        : []),
      // Add Find & Replace extension
      FindReplaceExtension,
    ],
    immediatelyRender: false,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: cn(
          // Modern typography
          "prose prose-base dark:prose-invert max-w-none",
          "min-h-[calc(100vh-200px)]",
          // Full width padding
          "px-8 py-12 md:px-12 lg:px-16",
          // Remove borders and outlines
          "focus:outline-none border-none",
          // Typography improvements
          "prose-headings:font-semibold prose-headings:tracking-tight",
          "prose-h1:text-4xl prose-h1:mb-4 prose-h1:mt-8",
          "prose-h2:text-3xl prose-h2:mb-3 prose-h2:mt-6",
          "prose-h3:text-2xl prose-h3:mb-2 prose-h3:mt-5",
          "prose-p:mb-4 prose-p:leading-relaxed prose-p:text-[16px]",
          // Lists
          "prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6",
          "prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6",
          "prose-li:my-2 prose-li:leading-relaxed",
          // Code
          "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
          "prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:border",
          // Blockquotes
          "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:not-italic prose-blockquote:font-normal",
          // Links
          "prose-a:text-primary prose-a:underline prose-a:underline-offset-4",
          // HR
          "prose-hr:my-8 prose-hr:border-border",
          // Images
          "prose-img:rounded-lg prose-img:shadow-sm",
          readOnly && "opacity-90",
        ),
      },
    },
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Handle AI command execution
  const handleAICommand = React.useCallback(
    async (instruction: string) => {
      if (!editor) return;

      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, " ");

      if (!selectedText) {
        // If no selection, don't process
        return;
      }

      setIsAIProcessing(true);
      setAiSuggestion(null);

      try {
        // Use existing Bedrock API
        const response = await fetch("/api/bedrock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction,
            text: selectedText,
          }),
        });

        const data = await response.json();

        if (data.output) {
          setAiSuggestion({
            original: selectedText,
            suggestion: data.output,
          });
        }
      } catch (error) {
        console.error("AI processing error:", error);
      } finally {
        setIsAIProcessing(false);
      }
    },
    [editor],
  );

  // Update the ref whenever the callback changes
  React.useEffect(() => {
    handleAICommandRef.current = handleAICommand;
  }, [handleAICommand]);

  const handleAcceptSuggestion = React.useCallback(() => {
    if (!editor || !aiSuggestion) return;

    const { from, to } = editor.state.selection;
    if (from !== to) {
      // Replace selected text
      editor
        .chain()
        .focus()
        .deleteSelection()
        .insertContent(aiSuggestion.suggestion)
        .run();
    } else {
      // Replace entire content if no selection
      editor.chain().focus().setContent(aiSuggestion.suggestion).run();
    }

    setAiSuggestion(null);
  }, [editor, aiSuggestion]);

  const handleRejectSuggestion = React.useCallback(() => {
    setAiSuggestion(null);
  }, []);

  // Update editable state when readOnly changes
  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // Only update content when initialContent changes AND editor is not focused
  const isInitialMount = React.useRef(true);
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (editor && initialContent !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  // Keyboard shortcuts
  React.useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Save shortcut (Cmd/Ctrl + S)
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSave?.(editor.getHTML());
      }

      // Find & Replace shortcut (Cmd/Ctrl + F)
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setShowFindReplace(true);
      }

      // AI Assistant shortcut (Cmd/Ctrl + /)
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        const { from, to } = editor.state.selection;
        if (from !== to) {
          setShowBubbleAI(true);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor, onSave]);

  if (!editor) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Loading editor...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border rounded-lg shadow-sm bg-background overflow-hidden">
      {/* Simple Toolbar for Edit Mode */}
      {!readOnly && (
        <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFindReplace(true)}
            className="h-8 gap-2"
          >
            <Search className="h-4 w-4" />
            Find & Replace
            <kbd className="ml-1 px-1.5 py-0.5 text-[10px] border rounded bg-muted text-muted-foreground font-mono">
              ⌘F
            </kbd>
          </Button>
        </div>
      )}

      {/* Editor Content - Full width */}
      <div className="flex-1 overflow-y-auto">
        {/* TipTap Editor */}
        <EditorContent editor={editor} />

        {/* AI Processing Indicator - Fixed at bottom */}
        {isAIProcessing && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]">
            <AIProcessingIndicator />
          </div>
        )}

        {/* AI Diff View - Fixed at bottom */}
        {aiSuggestion && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-4xl px-4">
            <AIDiffView
              original={aiSuggestion.original}
              suggestion={aiSuggestion.suggestion}
              onAccept={handleAcceptSuggestion}
              onReject={handleRejectSuggestion}
            />
          </div>
        )}
      </div>


      {/* Find & Replace Dialog (Cmd+F) */}
      <FindReplaceDialog
        editor={editor}
        open={showFindReplace}
        onOpenChange={setShowFindReplace}
      />
      {/* Floating Bubble Menu */}
      {showAI && !readOnly && (
        <EditorBubbleMenu editor={editor} onAICommand={handleAICommand} />
      )}

      {/* Command Palette (Cmd+K) */}
      {showAI && !readOnly && (
        <CommandPalette editor={editor} onAICommand={handleAICommand} />
      )}
    </div>
  );
}
