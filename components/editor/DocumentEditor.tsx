"use client";

import FileHandler from "@tiptap/extension-file-handler";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import * as React from "react";
import { Separator } from "@/components/ui/separator";
import type { DocumentEditorProps } from "@/lib/editor/types";
import { cn } from "@/lib/utils";
import { AIToolbar } from "./AIToolbar";
import { FloatingAIMenu } from "./FloatingAIMenu";
import { FormattingToolbar } from "./FormattingToolbar";

export function DocumentEditor({
  documentTitle,
  initialContent = "",
  readOnly = false,
  onChange,
  showToolbar = true,
  showAI = true,
  placeholder = "Start writing your document...",
}: DocumentEditorProps) {
  const [floatingAIOpen, setFloatingAIOpen] = React.useState(false);
  const [floatingAIPosition, setFloatingAIPosition] = React.useState({
    top: 0,
    left: 0,
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:absolute before:text-muted-foreground before:pointer-events-none",
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
    ],
    immediatelyRender: false,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none",
          "min-h-[500px] px-8 py-6",
          "focus:outline-none",
          "prose-headings:font-semibold",
          "prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-6",
          "prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-5",
          "prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-4",
          "prose-p:mb-3 prose-p:leading-7",
          "prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6",
          "prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6",
          "prose-li:my-1",
          "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
          "prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg",
          "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic",
          "prose-hr:my-6 prose-hr:border-border",
          readOnly && "opacity-90",
        ),
      },
    },
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

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

  // Handle text selection for floating AI menu
  React.useEffect(() => {
    if (!editor || !showAI) return;

    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const text = selection.toString().trim();
      if (text.length < 2) return;

      const editorEl = editor.view.dom;
      if (!editorEl || !editorEl.contains(selection.anchorNode)) return;

      // Don't show if AI toolbar popover is open
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setFloatingAIPosition({
        top: rect.top + window.scrollY - 10,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    };

    document.addEventListener("mouseup", handleSelection);
    return () => document.removeEventListener("mouseup", handleSelection);
  }, [editor, showAI]);

  if (!editor) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Loading editor...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg border bg-background shadow-sm">
      {showToolbar && (
        <>
          <div className="flex items-center gap-2 border-b p-2">
            {showAI && (
              <>
                <AIToolbar editor={editor} documentTitle={documentTitle} />
                <Separator orientation="vertical" className="h-8" />
              </>
            )}
            <div className="flex-1 overflow-x-auto">
              <FormattingToolbar editor={editor} />
            </div>
          </div>
        </>
      )}

      <div className="flex-1 overflow-y-auto bg-white">
        <EditorContent editor={editor} />
      </div>

      {showAI && (
        <FloatingAIMenu
          editor={editor}
          isOpen={floatingAIOpen}
          onClose={() => setFloatingAIOpen(false)}
          position={floatingAIPosition}
          documentTitle={documentTitle}
        />
      )}
    </div>
  );
}
