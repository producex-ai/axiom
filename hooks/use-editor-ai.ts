"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { AIResponse } from "@/lib/editor/types";

interface UseEditorAIOptions {
  editor: Editor | null;
  documentTitle?: string;
}

export function useEditorAI({
  editor,
  documentTitle = "",
}: UseEditorAIOptions) {
  const [isLoading, setIsLoading] = useState(false);

  const getSelectedText = useCallback(() => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ").trim();
  }, [editor]);

  const executeAI = useCallback(
    async (instruction: string, customText?: string) => {
      if (!editor) {
        toast.error("Editor not ready");
        return null;
      }

      const text = customText || getSelectedText();

      if (!text) {
        toast.error("Please select text first");
        return null;
      }

      setIsLoading(true);

      try {
        const fullInstruction = documentTitle
          ? `${documentTitle} - ${instruction}`
          : instruction;

        const response = await fetch("/api/bedrock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction: fullInstruction,
            text,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI request failed: ${response.statusText}`);
        }

        const data: AIResponse = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        // Replace selected text with AI output
        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent(data.output)
          .run();

        toast.success("AI transformation applied");
        return data.output;
      } catch (error) {
        console.error("AI Error:", error);
        toast.error(
          error instanceof Error ? error.message : "AI transformation failed",
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [editor, documentTitle, getSelectedText],
  );

  return {
    isLoading,
    executeAI,
    getSelectedText,
  };
}
