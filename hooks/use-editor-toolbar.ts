"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import type { BlockType } from "@/lib/editor/constants";
import type { EditorState } from "@/lib/editor/types";

export function useEditorToolbar(editor: Editor | null) {
  const editorState = useEditorState({
    editor,
    selector: (ctx): EditorState => {
      const ed = ctx.editor;
      return {
        isBold: ed?.isActive("bold") ?? false,
        isItalic: ed?.isActive("italic") ?? false,
        isStrike: ed?.isActive("strike") ?? false,
        isCode: ed?.isActive("code") ?? false,
        isBulletList: ed?.isActive("bulletList") ?? false,
        isOrderedList: ed?.isActive("orderedList") ?? false,
        isCodeBlock: ed?.isActive("codeBlock") ?? false,
        isBlockquote: ed?.isActive("blockquote") ?? false,
        isHeading1: ed?.isActive("heading", { level: 1 }) ?? false,
        isHeading2: ed?.isActive("heading", { level: 2 }) ?? false,
        isHeading3: ed?.isActive("heading", { level: 3 }) ?? false,
        isHeading4: ed?.isActive("heading", { level: 4 }) ?? false,
        isHeading5: ed?.isActive("heading", { level: 5 }) ?? false,
        isHeading6: ed?.isActive("heading", { level: 6 }) ?? false,
        isParagraph: ed?.isActive("paragraph") ?? false,
      };
    },
  });

  const currentBlockType: BlockType = editorState?.isHeading1
    ? "h1"
    : editorState?.isHeading2
      ? "h2"
      : editorState?.isHeading3
        ? "h3"
        : editorState?.isHeading4
          ? "h4"
          : editorState?.isHeading5
            ? "h5"
            : editorState?.isHeading6
              ? "h6"
              : "paragraph";

  const setBlockType = (blockType: BlockType) => {
    if (!editor) return;

    switch (blockType) {
      case "h1":
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case "h2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case "h3":
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case "h4":
        editor.chain().focus().toggleHeading({ level: 4 }).run();
        break;
      case "h5":
        editor.chain().focus().toggleHeading({ level: 5 }).run();
        break;
      case "h6":
        editor.chain().focus().toggleHeading({ level: 6 }).run();
        break;
      case "paragraph":
      default:
        editor.chain().focus().setParagraph().run();
        break;
    }
  };

  return {
    editorState,
    currentBlockType,
    setBlockType,
    canUndo: editor?.can().undo() ?? false,
    canRedo: editor?.can().redo() ?? false,
  };
}
