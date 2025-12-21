import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/bedrock
 * AI text transformation using AWS Bedrock
 */
export async function POST(request: Request) {
  try {
    const { instruction, text } = await request.json();

    if (!instruction || !text) {
      return NextResponse.json(
        { error: "Missing instruction or text" },
        { status: 400 },
      );
    }

    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const prompt = `Instruction: ${instruction}\n\nText:\n${text}\n\nRespond only with the transformed text.`;

    const command = new InvokeModelCommand({
      modelId:
        process.env.BEDROCK_MODEL || "anthropic.claude-3-sonnet-20240229-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2000,
        temperature: 0,
        top_p: 1,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const response = await client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    const output = result.content[0].text;

    return NextResponse.json({ output });
  } catch (error) {
    console.error("Bedrock API error:", error);
    return NextResponse.json(
      {
        error: "AI processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
