"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Undo2,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useEditorToolbar } from "@/hooks/use-editor-toolbar";
import { type BlockType, EDITOR_BLOCK_TYPES } from "@/lib/editor/constants";
import { cn } from "@/lib/utils";

interface FormattingToolbarProps {
  editor: Editor;
  className?: string;
}

const FormattingToolbarComponent = ({
  editor,
  className,
}: FormattingToolbarProps) => {
  const { editorState, currentBlockType, setBlockType, canUndo, canRedo } =
    useEditorToolbar(editor);

  // Create array of active formatting values
  const activeFormats = React.useMemo(() => {
    const active: string[] = [];
    if (editorState?.isBold) active.push("bold");
    if (editorState?.isItalic) active.push("italic");
    if (editorState?.isStrike) active.push("strike");
    if (editorState?.isCode) active.push("code");
    return active;
  }, [editorState]);

  const activeBlocks = React.useMemo(() => {
    const active: string[] = [];
    if (editorState?.isBulletList) active.push("bulletList");
    if (editorState?.isOrderedList) active.push("orderedList");
    if (editorState?.isBlockquote) active.push("blockquote");
    return active;
  }, [editorState]);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 border-b bg-background p-2",
        className,
      )}
    >
      {/* Block Type */}
      <Select
        value={currentBlockType}
        onValueChange={(value) => setBlockType(value as BlockType)}
      >
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EDITOR_BLOCK_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-8" />

      {/* Text Formatting */}
      <ToggleGroup type="multiple" value={activeFormats} className="gap-0.5">
        <ToggleGroupItem
          value="bold"
          aria-label="Toggle bold"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleBold().run();
          }}
          disabled={!editor.can().toggleBold()}
        >
          <Bold className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="italic"
          aria-label="Toggle italic"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleItalic().run();
          }}
          disabled={!editor.can().toggleItalic()}
        >
          <Italic className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="strike"
          aria-label="Toggle strikethrough"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleStrike().run();
          }}
          disabled={!editor.can().toggleStrike()}
        >
          <Strikethrough className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="code"
          aria-label="Toggle code"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleCode().run();
          }}
          disabled={!editor.can().toggleCode()}
        >
          <Code className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Separator orientation="vertical" className="h-8" />

      {/* Lists & Blocks */}
      <ToggleGroup type="multiple" value={activeBlocks} className="gap-0.5">
        <ToggleGroupItem
          value="bulletList"
          aria-label="Toggle bullet list"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleBulletList().run();
          }}
          data-state={editorState?.isBulletList ? "on" : "off"}
        >
          <List className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="orderedList"
          aria-label="Toggle ordered list"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleOrderedList().run();
          }}
          data-state={editorState?.isOrderedList ? "on" : "off"}
        >
          <ListOrdered className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="blockquote"
          aria-label="Toggle blockquote"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleBlockquote().run();
          }}
          data-state={editorState?.isBlockquote ? "on" : "off"}
        >
          <Quote className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Separator orientation="vertical" className="h-8" />

      {/* Additional Actions */}
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          editor.chain().focus().setHorizontalRule().run();
        }}
        title="Insert horizontal rule"
      >
        <Minus className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          editor.chain().focus().unsetAllMarks().run();
        }}
        disabled={!editor.can().unsetAllMarks()}
        title="Clear formatting"
      >
        <RemoveFormatting className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-8" />

      {/* History */}
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          editor.chain().focus().undo().run();
        }}
        disabled={!canUndo}
        title="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          editor.chain().focus().redo().run();
        }}
        disabled={!canRedo}
        title="Redo"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const FormattingToolbar = React.memo(FormattingToolbarComponent);
