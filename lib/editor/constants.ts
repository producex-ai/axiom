import type { AICategory } from "./types";

export const AI_CATEGORIES: AICategory[] = [
  {
    label: "Edit & Review",
    instructions: [
      {
        label: "Improve writing",
        instruction:
          "Improve the clarity, grammar, and style of the selected text.",
      },
      {
        label: "Make shorter",
        instruction: "Make the selected text shorter and more concise.",
      },
      {
        label: "Make longer",
        instruction:
          "Expand the selected text while keeping the meaning intact.",
      },
      {
        label: "Simplify language",
        instruction:
          "Simplify the language of the selected text for easier understanding.",
      },
      {
        label: "Fix spelling & grammar",
        instruction:
          "Fix all spelling and grammar errors in the selected text.",
      },
    ],
  },
  {
    label: "Generate from Selection",
    instructions: [
      {
        label: "Summarize",
        instruction: "Provide a concise summary of the selected text.",
      },
      {
        label: "Continue writing",
        instruction:
          "Continue writing from the selected text in the same style and tone.",
      },
      {
        label: "Generate action items",
        instruction: "Extract and list action items from the selected text.",
      },
    ],
  },
  {
    label: "Change Tone",
    instructions: [
      {
        label: "Professional",
        instruction: "Rewrite the selected text in a professional tone.",
      },
      {
        label: "Casual",
        instruction: "Rewrite the selected text in a casual tone.",
      },
      {
        label: "Direct",
        instruction:
          "Rewrite the selected text in a direct and straightforward tone.",
      },
      {
        label: "Confident",
        instruction: "Rewrite the selected text in a confident tone.",
      },
      {
        label: "Friendly",
        instruction:
          "Rewrite the selected text in a friendly and approachable tone.",
      },
    ],
  },
  {
    label: "Change Style",
    instructions: [
      {
        label: "Business",
        instruction: "Rewrite the selected text in a formal business style.",
      },
      {
        label: "Legal",
        instruction: "Rewrite the selected text in a formal legal style.",
      },
      {
        label: "Technical",
        instruction:
          "Rewrite the selected text in a technical and precise style.",
      },
      {
        label: "Creative",
        instruction:
          "Rewrite the selected text in a creative and engaging style.",
      },
    ],
  },
  {
    label: "Translate",
    instructions: [
      {
        label: "English",
        instruction: "Translate the selected text into English.",
      },
      {
        label: "Spanish",
        instruction: "Translate the selected text into Spanish.",
      },
      {
        label: "French",
        instruction: "Translate the selected text into French.",
      },
      {
        label: "German",
        instruction: "Translate the selected text into German.",
      },
      {
        label: "Chinese (Simplified)",
        instruction: "Translate the selected text into Simplified Chinese.",
      },
    ],
  },
];

export const EDITOR_BLOCK_TYPES = [
  { value: "paragraph", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "h4", label: "Heading 4" },
  { value: "h5", label: "Heading 5" },
  { value: "h6", label: "Heading 6" },
] as const;

export type BlockType = (typeof EDITOR_BLOCK_TYPES)[number]["value"];
