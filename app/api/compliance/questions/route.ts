import { type NextRequest, NextResponse } from "next/server";
import { buildQuestionsFromSpec } from "@/server/llm";

export const runtime = "nodejs";

/**
 * GET /api/compliance/questions
 * Generate dynamic questions from Primus submodule specification
 *
 * Query params:
 * - moduleNumber: string (e.g., "1", "5")
 * - subModuleCode: string (e.g., "1.01", "5.12", "4.04.01")
 *
 * Returns: Array of QuestionItem with compliance traceability
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleNumber = searchParams.get("moduleNumber");
    const subModuleCode = searchParams.get("subModuleCode");

    // Validate module number
    if (!moduleNumber || !/^[1-7]$/.test(moduleNumber)) {
      return NextResponse.json(
        { error: "Invalid module number. Must be 1-7." },
        { status: 400 },
      );
    }

    // Validate submodule code format (e.g., "1.01", "5.12" or "4.04.01" for sub-submodules)
    if (!subModuleCode || !/^\d+\.\d{2}(\.\d+)?$/.test(subModuleCode)) {
      return NextResponse.json(
        {
          error:
            "Invalid submodule code format. Expected format: X.XX (e.g., 1.01) or X.XX.XX for sub-submodules (e.g., 4.04.01)",
        },
        { status: 400 },
      );
    }

    console.log(
      `[API] Generating questions for Module ${moduleNumber}, Submodule ${subModuleCode}`,
    );

    // Generate questions from spec using existing buildQuestionsFromSpec function
    // Pass submoduleCode as documentName to enable spec matching
    const questions = buildQuestionsFromSpec(
      moduleNumber,
      subModuleCode, // documentName contains the code
      undefined, // subModuleName not needed since code is in documentName
    );

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        {
          error: "No questions generated",
          hint: "This could mean the submodule spec was not found or has no requirements",
        },
        { status: 404 },
      );
    }

    console.log(
      `[API] ✅ Generated ${questions.length} questions for ${subModuleCode}`,
    );

    // Return questions with metadata
    return NextResponse.json(
      {
        moduleNumber,
        subModuleCode,
        questionCount: questions.length,
        coreQuestionCount: 6, // First 6 are always core document control questions
        requirementQuestionCount: questions.length - 6,
        questions,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API] Error generating questions:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          error: `Submodule specification not found`,
          hint: "This submodule may not have a specification file yet.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate questions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
