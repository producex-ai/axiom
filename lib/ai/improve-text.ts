"use server";

import { bedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";

import {
  type PromptKey,
  TEXT_IMPROVEMENT_PROMPTS,
} from "@/lib/constants/ai-prompts";

export interface TextImprovementOptions {
  text: string;
  promptKey?: PromptKey;
}

export interface TextImprovementResult {
  originalText: string;
  improvedText: string;
  promptUsed: string;
}

/**
 * Improves text using AI - can be called from both client and server
 */
export async function improveText({
  text,
  promptKey = "improve",
}: TextImprovementOptions): Promise<TextImprovementResult> {
  console.log("🚀 Text improvement started - Using AWS Bedrock");

  // Validation
  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  if (text.length < 10) {
    throw new Error("Text must be at least 10 characters");
  }

  if (text.length > 10000) {
    throw new Error("Text must be less than 10,000 characters");
  }

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error("❌ Missing AWS configuration for text improvement");
    throw new Error(
      "Missing AWS configuration. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.",
    );
  }

  console.log("✅ AWS credentials found for text improvement");
  console.log("📝 Processing text:", { textLength: text.length, promptKey });

  const prompt =
    TEXT_IMPROVEMENT_PROMPTS[promptKey] || TEXT_IMPROVEMENT_PROMPTS.improve;

  try {
    console.log(
      "🤖 Calling AWS Bedrock Claude 3.5 Sonnet for text improvement",
    );

    const { text: improvedText } = await generateText({
      model: bedrock("us.anthropic.claude-3-5-sonnet-20241022-v2:0"),
      messages: [
        {
          role: "system",
          content:
            "You are an expert writing assistant specializing in supply chain and logistics communication. Your goal is to help professionals write clear, concise, and effective business communications. Always return in a professional, simple, and clear manner. Without any communication format like email or text about how to use the output. Just the improved text.",
        },
        {
          role: "user",
          content: `Using below guidelines:\n${prompt}\n\nImprove the text:\n${text}`,
        },
      ],
      temperature: 0.3,
    });

    console.log("✅ Bedrock text improvement completed", {
      originalLength: text.length,
      improvedLength: improvedText.length,
    });

    return {
      originalText: text,
      improvedText: improvedText.trim(),
      promptUsed: promptKey,
    };
  } catch (error) {
    console.error("AI text improvement error:", error);
    throw new Error("Failed to improve text. Please try again.");
  }
}
