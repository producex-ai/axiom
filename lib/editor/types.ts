import type { Editor } from "@tiptap/react";

export interface AIInstruction {
  label: string;
  instruction: string;
  icon?: string;
}

export interface AICategory {
  label: string;
  icon?: string;
  instructions: AIInstruction[];
}

export interface EditorState {
  isBold: boolean;
  isItalic: boolean;
  isStrike: boolean;
  isCode: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  isCodeBlock: boolean;
  isBlockquote: boolean;
  isHeading1: boolean;
  isHeading2: boolean;
  isHeading3: boolean;
  isHeading4: boolean;
  isHeading5: boolean;
  isHeading6: boolean;
  isParagraph: boolean;
}

export interface DocumentEditorProps {
  documentId?: string;
  documentTitle: string;
  initialContent?: string;
  readOnly?: boolean;
  onSave?: (content: string) => Promise<void>;
  onChange?: (content: string) => void;
  onToggleReadOnly?: () => void;
  showToolbar?: boolean;
  showAI?: boolean;
  placeholder?: string;
}

export interface AIResponse {
  output: string;
  error?: string;
}

export interface EditorToolbarProps {
  editor: Editor;
  onAIClick?: () => void;
  showAI?: boolean;
}

export interface FloatingAIMenuProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  selectedText: string;
}
