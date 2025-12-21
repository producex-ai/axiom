export const TEXT_IMPROVEMENT_PROMPTS = {
  improve: `
  Clarity: Make sentences concise and easy to understand. Remove jargon or explain technical terms.
  Tone: Ensure the tone matches professional and simple.
  Structure: Organize ideas logically. Use short paragraphs and transitions between thoughts.
  Engagement: Make it more compelling or interesting with idea that our tool is for supply chain folks and they will be writing and reading this text.
  Grammar & Style: Fix any errors and improve flow`,
} as const;

export type PromptKey = keyof typeof TEXT_IMPROVEMENT_PROMPTS;
