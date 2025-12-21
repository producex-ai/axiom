import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { lintCompliance } from "./primus/compliance_engine";
// Import Primus GFS enhancement modules
import {
  findSubmoduleSpecByName,
  getRelevantMicroRules,
  loadModuleChecklist,
  loadModuleSpec,
  selectTemplate,
} from "./primus/loader";
import {
  checkForbiddenPatternsOnly,
  cutoffAfterSignatures,
  getCriticalErrors,
  hasPostSignatureContent,
  sanitizeOutput,
  stripComplianceAnnotations,
  validateLLMOutput,
} from "./primus/output_validator";
import { buildSpecDrivenPrompt } from "./primus/prompt_builder";
import { buildRequirementsList } from "./primus/structure_builder";
import {
  detectRelevantMicroRuleGroups,
  type MicroRuleCategory,
} from "./primus/utils/microRuleSelector";

// Export compliance functions for use in API routes
export {
  formatCrosswalkTable,
  generateComplianceSummary,
  generateCrosswalk,
} from "./primus/compliance_engine";

/**
 * Bedrock client (single instance). Model id & region must be provided via env vars.
 * Deterministic settings are applied at call time (temperature=0, top_p=1, etc.).
 */
const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION!,
});

export interface QuestionItem {
  id: string; // stable machine id (snake_case)
  question: string; // auditor-facing wording (ends with ? unless boolean phrased as statement)
  type: "text" | "boolean" | "date" | "number"; // constrained types
  hint?: string; // optional implementation hint or Primus GFS reference
  checklistRefs?: string[]; // Primus GFS checklist item codes this question maps to
}

export interface PrimusModuleContext {
  moduleName?: string; // e.g., "Module 1: FSMS", "Module 5: Facility", "Module 6: HACCP"
  subModuleName?: string; // e.g., "5.02 Building and Equipment Design", "6.03 Critical Control Points"
  moduleNumber?: string; // e.g., "1", "5", "6"
  complianceStandard?: string; // e.g., "Primus GFS v4.0"
}

// Core field ids enforced first & in deterministic order.
const CORE_FIELD_ORDER: string[] = [
  "company_name",
  "facility_name",
  "effective_date",
  "review_date",
  "document_number",
  "document_version",
  "revision_number",
  "approved_by",
  "position",
];

// Allowed extra category prefixes (for validation to reduce hallucinations)
const ALLOWED_EXTRA_PREFIXES = [
  "document_",
  "revision_",
  "food_safety_",
  "internal_",
  "management_",
  "monitoring_",
  "corrective_",
  "capa_",
  "traceability_",
  "responsibility_",
  "record_",
  "hazard_",
  "ccp_",
  "verification_",
  "training_",
  "audit_",
];

// Module checklist references (simplified mapping placeholders). In production, replace with authoritative codes.
interface ChecklistItem {
  code: string;
  description: string;
  mandatory: boolean;
}

/**
 * Get checklist items for a module (now loaded from JSON files)
 */
function getModuleChecklistItems(moduleNumber: string): ChecklistItem[] {
  try {
    const checklist = loadModuleChecklist(moduleNumber);
    return checklist.sections.flatMap((section) =>
      section.requirements.map((req) => ({
        code: req.code,
        description: req.description,
        mandatory: req.mandatory,
      })),
    );
  } catch {
    console.warn(
      `Failed to load checklist for module ${moduleNumber}, using fallback`,
    );
    return MODULE_CHECKLIST_FALLBACK[moduleNumber] || [];
  }
}

// Fallback checklist (only used if JSON files not accessible)
const MODULE_CHECKLIST_FALLBACK: Record<string, ChecklistItem[]> = {
  "1": [
    {
      code: "1.01",
      description: "Food safety policy documented",
      mandatory: true,
    },
    {
      code: "1.02",
      description: "Management responsibility defined",
      mandatory: true,
    },
    {
      code: "1.03",
      description: "Internal audit program established",
      mandatory: true,
    },
    {
      code: "1.04",
      description: "CAPA procedure implemented",
      mandatory: true,
    },
    {
      code: "1.05",
      description: "Training program documented",
      mandatory: true,
    },
    {
      code: "1.06",
      description: "Document control/versioning",
      mandatory: true,
    },
  ],
  "2": [
    { code: "2.01", description: "Water risk assessment", mandatory: true },
    {
      code: "2.02",
      description: "Soil amendments management",
      mandatory: true,
    },
    { code: "2.03", description: "Worker hygiene practices", mandatory: true },
    { code: "2.04", description: "Harvest field sanitation", mandatory: true },
    {
      code: "2.05",
      description: "Traceability field to packing",
      mandatory: true,
    },
  ],
  "3": [
    {
      code: "3.01",
      description: "Environmental monitoring program",
      mandatory: true,
    },
    {
      code: "3.02",
      description: "Nutrient solution management",
      mandatory: true,
    },
    { code: "3.03", description: "Contamination prevention", mandatory: true },
  ],
  "4": [
    {
      code: "4.01",
      description: "Harvester hygiene training",
      mandatory: true,
    },
    {
      code: "4.02",
      description: "Harvest equipment sanitation",
      mandatory: true,
    },
    {
      code: "4.03",
      description: "Lot identification at harvest",
      mandatory: true,
    },
  ],
  "5": [
    {
      code: "5.01",
      description: "Facility design for segregation",
      mandatory: true,
    },
    { code: "5.02", description: "SSOPs documented", mandatory: true },
    { code: "5.03", description: "Pest control program", mandatory: true },
    {
      code: "5.04",
      description: "Glass & brittle plastic control",
      mandatory: true,
    },
    { code: "5.05", description: "Water quality monitoring", mandatory: true },
  ],
  "6": [
    { code: "6.01", description: "HACCP team qualifications", mandatory: true },
    { code: "6.02", description: "Hazard analysis completed", mandatory: true },
    {
      code: "6.03",
      description: "CCP identification & justification",
      mandatory: true,
    },
    {
      code: "6.04",
      description: "Critical limits documented",
      mandatory: true,
    },
    {
      code: "6.05",
      description: "Monitoring procedures for CCPs",
      mandatory: true,
    },
    {
      code: "6.06",
      description: "Verification & validation records",
      mandatory: true,
    },
  ],
};

/**
 * Detect document type and provide specific generation guidance
 * This prevents the LLM from generating wrong document types
 */
function detectDocumentType(
  documentName: string | undefined,
  moduleContext: PrimusModuleContext | undefined,
): string {
  const docNameLower = (documentName || "").toLowerCase();
  const moduleNum = moduleContext?.moduleNumber || "1";

  // POLICY documents (1.01 - Food Safety Policy)
  if (docNameLower.includes("policy") && docNameLower.includes("food safety")) {
    return `✓ DOCUMENT TYPE: Food Safety Policy (Module 1.01)
✓ DOCUMENT NAME: "${documentName}"
✓ TITLE FORMAT: "FOOD SAFETY POLICY"
✓ STRUCTURE: Management policy statement (NOT a procedure)
✓ CONTENT FOCUS: Commitment statements, management responsibility, policy objectives
✓ TONE: Authoritative, declarative (We commit to..., Management ensures..., Our policy is...)
✓ LENGTH: Shorter than procedures (1500-2500 words acceptable for policies)`;
  }

  // POLICY documents (1.01 - General Policy)
  if (docNameLower.includes("policy") && !docNameLower.includes("control")) {
    return `✓ DOCUMENT TYPE: Policy Document (Module ${moduleNum})
✓ DOCUMENT NAME: "${documentName}"
✓ TITLE FORMAT: Use exact name from documentName (e.g., "TRACEABILITY POLICY")
✓ STRUCTURE: Policy statement (NOT a procedure)
✓ CONTENT FOCUS: Policy objectives, commitments, management responsibility
✓ TONE: Authoritative, declarative (We commit to..., Management ensures...)
✓ LENGTH: 1500-2500 words (policies are shorter than procedures)`;
  }

  // PROCEDURE/SOP documents (1.02, 1.03, etc.)
  if (
    docNameLower.includes("procedure") ||
    docNameLower.includes("sop") ||
    docNameLower.includes("control") ||
    docNameLower.includes("program")
  ) {
    return `✓ DOCUMENT TYPE: Standard Operating Procedure (Module ${moduleNum})
✓ DOCUMENT NAME: "${documentName}"
✓ TITLE FORMAT: Use exact name from documentName
✓ STRUCTURE: Full 15-section SOP format
✓ CONTENT FOCUS: Step-by-step procedures, monitoring, verification, CAPA
✓ TONE: Procedural, instructional (specific steps, responsibilities, actions)
✓ LENGTH: 2500-4000 words (comprehensive procedures)`;
  }

  // MANUAL sections (Module 6 - HACCP)
  if (docNameLower.includes("manual") || docNameLower.includes("haccp plan")) {
    return `✓ DOCUMENT TYPE: HACCP Manual Section (Module 6)
✓ DOCUMENT NAME: "${documentName}"
✓ TITLE FORMAT: Use exact name from documentName
✓ STRUCTURE: Full 15-section format with HACCP-specific content
✓ CONTENT FOCUS: Hazard analysis, CCPs, critical limits, monitoring, verification
✓ TONE: Technical, precise (specific parameters, measurements, validation data)
✓ LENGTH: 3000-5000 words (comprehensive HACCP documentation)`;
  }

  // FORM templates
  if (
    docNameLower.includes("form") ||
    docNameLower.includes("record") ||
    docNameLower.includes("log") ||
    docNameLower.includes("checklist")
  ) {
    return `✓ DOCUMENT TYPE: Form/Record Template (Module ${moduleNum})
✓ DOCUMENT NAME: "${documentName}"
✓ TITLE FORMAT: Use exact name from documentName
✓ STRUCTURE: Form layout with fields, instructions for completion
✓ CONTENT FOCUS: Form fields, data entry instructions, frequency, responsible parties
✓ TONE: Instructional, clear (field labels, completion instructions)
✓ LENGTH: 800-1500 words (forms are concise)`;
  }

  // DEFAULT: Standard SOP
  return `✓ DOCUMENT TYPE: Standard Operating Procedure (Module ${moduleNum})
✓ DOCUMENT NAME: "${documentName}"
✓ TITLE FORMAT: Use exact name from documentName (preserve as given)
✓ STRUCTURE: Full 15-section SOP format
✓ CONTENT FOCUS: Comprehensive procedures for the specific topic
✓ LENGTH: 2500-4000 words`;
}

/**
 * NEW: Generate questions dynamically from submodule specification requirements
 * This eliminates template dependency and ensures questions map directly to requirements
 */
/**
 * Build questions from Primus submodule specification
 * Generates 6 core document control questions + N requirement-based questions
 *
 * @param moduleNumber - Module number (e.g., "1", "5")
 * @param documentName - Document name containing submodule code or keywords
 * @param subModuleName - Optional submodule name for matching
 * @returns Array of QuestionItem with compliance traceability
 */
export function buildQuestionsFromSpec(
  moduleNumber: string,
  documentName?: string,
  subModuleName?: string,
): QuestionItem[] {
  console.log(`[SPEC] buildQuestionsFromSpec called with:`, {
    moduleNumber,
    documentName,
    subModuleName,
  });

  const questions: QuestionItem[] = [];

  // Always include core document control questions
  questions.push(
    {
      id: "company_name",
      question: "What is the company name?",
      type: "text",
      hint: "Legal business name",
    },
    {
      id: "facility_name",
      question: "What is the facility name?",
      type: "text",
      hint: "Specific site or location name",
    },
    {
      id: "document_number",
      question: "What is the document control number?",
      type: "text",
      hint: "Unique identifier for this document",
    },
    {
      id: "document_version",
      question: "What is the current document version?",
      type: "text",
      hint: "Version or revision number (e.g., 1.0, Rev. 2)",
    },
    {
      id: "effective_date",
      question: "What is the effective date?",
      type: "date",
      hint: "Date when this document becomes active",
    },
    {
      id: "approved_by",
      question: "Who approved this document?",
      type: "text",
      hint: "Name and title of approving authority",
    },
  );

  console.log(`[SPEC] Core questions added: ${questions.length}`);

  // Try to load submodule specification
  try {
    console.log(`[SPEC] Attempting to find submodule spec...`);
    const submoduleSpec = findSubmoduleSpecByName(
      moduleNumber,
      documentName,
      subModuleName,
    );

    if (submoduleSpec) {
      console.log(
        `[SPEC] ✅ Found spec: ${submoduleSpec.code} - ${submoduleSpec.title}`,
      );
      console.log(
        `[SPEC] Requirements count: ${submoduleSpec.requirements.length}`,
      );

      // Generate questions from each requirement
      for (const req of submoduleSpec.requirements) {
        // Handle both old format (with 'required' field) and new format (with 'question' field)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reqAny = req as any; // Type assertion for flexibility between Module 1-3 and Module 4+ formats
        const isOldFormat = "required" in reqAny && "text" in reqAny;
        const isNewFormat = "question" in reqAny;

        if (isOldFormat) {
          // Old Module 1-3 format with required/text/keywords
          if (!reqAny.required) {
            console.log(`[SPEC] Skipping optional requirement: ${reqAny.code}`);
            continue; // Only generate questions for required items
          }

          // Determine question type based on keywords
          const questionType = determineQuestionType(
            reqAny.text,
            reqAny.keywords || [],
          );

          // Generate question from requirement text
          const questionText = generateQuestionFromRequirement(reqAny.text);

          // Create question ID from requirement code
          const questionId = `requirement_${reqAny.code.replace(/\./g, "_").toLowerCase()}`;

          console.log(
            `[SPEC] Adding requirement question: ${questionId} (${questionType})`,
          );

          questions.push({
            id: questionId,
            question: questionText,
            type: questionType,
            hint: `Addresses ${reqAny.code}: ${reqAny.text.slice(0, 80)}...`,
            checklistRefs: [reqAny.code],
          });
        } else if (isNewFormat) {
          // New Module 4+ format with question/totalPoints directly
          const questionText = reqAny.question;
          const questionId = `requirement_${reqAny.code.replace(/\./g, "_").toLowerCase()}`;

          console.log(
            `[SPEC] Adding requirement question: ${questionId} (text)`,
          );

          questions.push({
            id: questionId,
            question: questionText,
            type: "text",
            hint: `Primus GFS ${reqAny.code} - ${reqAny.totalPoints} points`,
            checklistRefs: [reqAny.code],
          });
        }
      }

      console.log(
        `[SPEC] ✅ Generated ${questions.length} total questions from specification`,
      );
      return questions;
    } else {
      console.log(`[SPEC] ⚠️ Spec not found, returning core questions only`);
    }
  } catch (error) {
    console.warn(
      "[SPEC] ❌ Could not load submodule spec, falling back to LLM extraction:",
      error,
    );
  }

  console.log(
    `[SPEC] Returning ${questions.length} core questions (no spec found)`,
  );
  return questions; // Return core questions if spec not found
}

/**
 * Determine question type based on requirement text and keywords
 */
function determineQuestionType(
  text: string,
  keywords: string[],
): "text" | "boolean" | "date" | "number" {
  const lowerText = text.toLowerCase();

  // Boolean for yes/no questions about existence or implementation
  if (
    lowerText.includes("must be") ||
    lowerText.includes("established") ||
    lowerText.includes("implemented") ||
    lowerText.includes("documented")
  ) {
    return "boolean";
  }

  // Date for time-related questions
  if (
    keywords.some(
      (kw) =>
        kw.toLowerCase().includes("date") ||
        kw.toLowerCase().includes("frequency"),
    )
  ) {
    return "date";
  }

  // Number for quantitative questions
  if (
    lowerText.includes("how many") ||
    lowerText.includes("how often") ||
    lowerText.includes("frequency") ||
    lowerText.includes("hours")
  ) {
    return "number";
  }

  // Default to text
  return "text";
}

/**
 * Generate a question from requirement text
 */
function generateQuestionFromRequirement(text: string): string {
  // Convert requirement statements to questions
  if (text.includes("must be")) {
    // "X must be Y" -> "Is X Y?"
    const parts = text.split("must be");
    return `Is ${parts[0].trim()} ${parts[1].trim()}?`;
  }

  if (text.includes("must include")) {
    const parts = text.split("must include");
    return `Does ${parts[0].trim()} include ${parts[1].trim()}?`;
  }

  if (text.includes("must")) {
    // Generic must statement
    return `Is the following requirement met: ${text}?`;
  }

  // Default: ask about implementation status
  return `Has the following been implemented: ${text}?`;
}

/** Build deterministic extraction prompt */
function buildExtractionPrompt(
  templateText: string,
  moduleContext?: PrimusModuleContext,
  documentName?: string,
): string {
  const moduleNumber = moduleContext?.moduleNumber || "1";

  // NEW: Try spec-based extraction first
  const specQuestions = buildQuestionsFromSpec(
    moduleNumber,
    documentName,
    moduleContext?.subModuleName,
  );
  if (specQuestions.length > 6) {
    console.log("[EXTRACT] Using spec-based question generation");
    // Return a prompt that will be validated but bypassed
    return JSON.stringify(specQuestions); // This will be handled specially
  }

  // FALLBACK: LLM-based extraction
  const checklist = getModuleChecklistItems(moduleNumber);
  const checklistBlock = checklist
    .map(
      (c: ChecklistItem) =>
        `- ${c.code}: ${c.description} (${c.mandatory ? "MANDATORY" : "OPTIONAL"})`,
    )
    .join("\n");

  return `You are a deterministic Primus GFS v4.0 compliance question extractor. Output ONLY strict JSON.\nROLE: Identify organization-specific data points required to finalize this template for Primus GFS audit readiness for Module ${moduleNumber}.\n\nSTRICT RULES:\n1. Return ONLY a JSON array. No prose, no markdown, no comments.\n2. Array length: 7 to 15 items total.\n3. First ${CORE_FIELD_ORDER.length} items MUST be the core fields IN EXACT ORDER if relevant; omit only if truly irrelevant (still preserve order of those used).\n4. Additional fields MUST derive from: placeholders {{like_this}}, explicit section headings, mandatory checklist items (${checklist.map((c: ChecklistItem) => c.code).join(", ")}), or obvious data gaps needed for monitoring, verification, CAPA, traceability.\n5. No speculative or generic best-practice questions.\n6. Field ids: snake_case; core fields fixed; extras must start with one of prefixes: ${ALLOWED_EXTRA_PREFIXES.join(", ")}.\n7. Allowed types: "text" | "boolean" | "date" | "number".\n8. Boolean ONLY for compliance status or existence (e.g., presence of plan / program).\n9. Each item MUST map at least one checklist reference code in checklistRefs when derived from a checklist requirement.\n10. Deterministic wording: do not vary synonyms across runs.\n11. Hints optional; if present must be < 120 chars and may cite Primus code.\n12. NO placeholders like [FILL], no TBD, no nulls.\n13. If facility_name not applicable, exclude it (do not replace with another field in that slot).\n14. Maintain stable ordering: core fields first (filtered), then extras sorted alphabetically by id.\n\nOUTPUT JSON SCHEMA (informal):\n[\n  {\n    "id": string,\n    "question": string,\n    "type": "text"|"boolean"|"date"|"number",\n    "hint"?: string,\n    "checklistRefs"?: string[]\n  }\n]\n\nCHECKLIST (Module ${moduleNumber}):\n${checklistBlock}\n\nTEMPLATE:\n<<<BEGIN_TEMPLATE>>>\n${templateText}\n<<<END_TEMPLATE>>>\n\nReturn JSON now:`;
}

/** Build deterministic fill template prompt */
function buildFillTemplatePrompt(
  templateText: string,
  answers: Record<string, string | boolean | number | Date>,
  moduleContext?: PrimusModuleContext,
  documentName?: string,
): string {
  const moduleNumber = moduleContext?.moduleNumber || "1";

  // NEW: Try to load specifications instead of using template
  let requirementsBlock = "";
  let moduleSpec = null;
  let submoduleSpec = null;

  try {
    moduleSpec = loadModuleSpec(moduleNumber);
    submoduleSpec = findSubmoduleSpecByName(
      moduleNumber,
      documentName,
      moduleContext?.subModuleName,
    );

    if (submoduleSpec) {
      console.log(
        `[LLM] Using spec-based generation for ${submoduleSpec.code} - ${submoduleSpec.title}`,
      );
      requirementsBlock = buildRequirementsList(
        moduleNumber,
        moduleContext?.subModuleName,
        documentName,
      );
    }
  } catch (error) {
    console.warn(
      "[LLM] Could not load specifications, falling back to checklist:",
      error,
    );
  }

  const checklist = getModuleChecklistItems(moduleNumber);
  const checklistTable = checklist
    .map(
      (c: ChecklistItem) =>
        `${c.code} | ${c.description} | ${c.mandatory ? "Mandatory" : "Optional"}`,
    )
    .join("\n");

  // NEW: Detect relevant micro-rule groups based on context
  const relevantGroups = detectRelevantMicroRuleGroups(
    moduleContext,
    documentName,
  );
  const microRules = getRelevantMicroRules(relevantGroups);
  const microRulesBlock = buildMicroRulesBlock(microRules, relevantGroups);

  // NEW: Detect document type and provide specific guidance
  const documentTypeGuidance = detectDocumentType(documentName, moduleContext);

  // NEW: Build spec-based structure guidance
  const structureGuidance = buildStructureGuidance(moduleSpec, submoduleSpec);

  return `You are a deterministic Primus GFS v4.0 document generator for Modules 1–6. Produce a single complete audit-ready document ONLY (plain text).

CRITICAL DOCUMENT IDENTIFICATION:
=================================
${documentTypeGuidance}

${
  requirementsBlock
    ? `
SPECIFICATION-BASED REQUIREMENTS:
=================================
${requirementsBlock}

YOU MUST INTEGRATE ALL REQUIREMENTS FROM THE SPECIFICATION ABOVE.
Every requirement listed must appear in the appropriate section with complete content.
Do NOT skip or abbreviate any requirement.
`
    : ""
}

${structureGuidance}

CRITICAL OUTPUT REQUIREMENTS:
=================================
YOUR OUTPUT MUST CONTAIN:
✓ Only the final SOP document text
✓ Complete content for ALL 15 SECTIONS WITHOUT EXCEPTION - Sections 1-15 must all be present
✓ Actual procedures, not descriptions of procedures
✓ Specific values from provided answers
✓ Minimum 2500 words, maximum 5000 words (scalable for modules with many requirements)
✓ ALL requirements from the specification integrated naturally
✓ EVERY SECTION from 1-15 complete with adequate content (prioritize completing all sections over excessive detail in early sections)

YOUR OUTPUT MUST NOT CONTAIN:
✗ Bracketed meta-comments like "[...]", "[continued]", "[fill in]"
✗ Phrases like "COMPLIANCE AUTO-CORRECTION", "missing requirement(s) added"
✗ Conversational phrases like "Would you like me to", "I have generated", "Here is the"
✗ Explanations like "EXPLANATION:", "Note: The SOP should", "This document would"
✗ Template variables like {{variable}}, \${variable}, %VARIABLE%
✗ Placeholders like [TBD], [TODO], [PENDING], [FILL]
✗ First-person voice ("I will", "We can see")
✗ Meta-commentary about how you generated the document
✗ References to templates, LLMs, AI, or generation process
✗ Incomplete sections followed by "..." or "continued as per template"

IMPORTANT: Generate COMPLETE sections with adequate content (2-4 paragraphs each, except tables).
Balance thoroughness with conciseness - you MUST complete all 15 sections within the token limit.
DO NOT STOP EARLY - Generate ALL 15 sections before adding signatures.
If running low on space, make later sections more concise but still complete.

MANDATORY STRUCTURE (numbered headings - ALL 15 SECTIONS REQUIRED - NO EXCEPTIONS):
==========================================
1. Title & Document Control (include doc number, version, dates, approval info)
2. Purpose / Objective (why this document exists, what it achieves)
3. Scope (what/who it covers, any exclusions)
4. Definitions & Abbreviations (minimum 5-8 relevant terms)
5. Roles & Responsibilities (specific people/positions with duties)
6. Prerequisites & Reference Documents (standards, related SOPs)
7. Hazard / Risk Analysis (module-appropriate hazards, assessment)
8. Procedures (detailed step-by-step, minimum 8-12 steps)
9. Monitoring Plan (frequencies, responsible role, records, methods)
10. Verification & Validation Activities (how/when to verify effectiveness)
11. Corrective & Preventive Action (CAPA) Protocol (trigger → investigate → correct → prevent)
12. Traceability & Recall Elements (lot codes, record linkages, recall procedures)
13. Record Retention & Document Control (what records, how long, where stored)
14. Compliance Crosswalk (table: Primus Code | Requirement | Section | Evidence)
15. Revision History & Approval Signatures (table + signature lines)

CONTENT GENERATION RULES:
==========================
- Integrate provided answers; never invent conflicting data.
- If a boolean answer is false: create a GAP STATEMENT + corrective action with timeline (<= 90 days) + interim controls.
- Replace all placeholders ({{ }}) using answers or deterministic text. No remaining braces or [FILL].
- Frequencies: use explicit units (e.g., "every 4 hours", "daily", "weekly"). Avoid vague terms like "regularly".
- Critical limits: numeric or clearly measurable statements.
- CAPA: include trigger, containment, root cause, corrective, preventive, verification steps.
- Crosswalk table lists each checklist code, section number where fulfilled, and brief evidence phrase.
- Use stable terminology: FSMS, CCP, verification, validation, preventive controls, traceability.
- No marketing fluff, no speculative claims beyond template + answers.
- Use organizational roles (e.g., "Food Safety Manager", "Quality Assurance"), never first-person.
- Each section must have complete content but be concise (2-4 paragraphs for most sections, tables where appropriate).
- For modules with many requirements (8+), prioritize efficiency: be thorough but avoid redundancy.
- Prioritize completing ALL 15 sections over making early sections overly long.
- No orphan headings (each section has complete content).
- Total length: 2500-5000 words (sufficient for audit, scalable for complex modules with many requirements).

${microRulesBlock}

CHECKLIST CROSSWALK SOURCE (Module ${moduleNumber}):
Code | Requirement | Mandatory
${checklistTable}

ANSWERS JSON:
${JSON.stringify(answers, null, 2)}

TEMPLATE SOURCE (FOR REFERENCE ONLY - USE SPECIFICATIONS ABOVE AS PRIMARY SOURCE):
<<<BEGIN_TEMPLATE>>>
${templateText}
<<<END_TEMPLATE>>>

===================================================================================================
IMPORTANT — TERMINATE OUTPUT STRICTLY HERE:
===================================================================================================
After completing "15. REVISION HISTORY & APPROVAL SIGNATURES" with the three signature lines:
  - Prepared By: _________________________ Date: __________
  - Reviewed By: _________________________ Date: __________
  - Approved By: _________________________ Date: __________

STOP IMMEDIATELY. END YOUR RESPONSE.

DO NOT ADD:
✗ Compliance summaries (e.g., "CHEMICAL COMPLIANCE:", "PEST COMPLIANCE:")
✗ Additional notes or appendices
✗ Program compliance sections
✗ Repeated content
✗ Explanations of what you generated
✗ Any text after the "Approved By" signature line

Your response MUST end exactly at the signature lines. Generate nothing after that point.
===================================================================================================

Generate the final document now. Output ONLY the complete SOP document text with no preamble, no meta-commentary, no explanations. Start with the title and end with the approval signatures:`;
}

/**
 * Build structure guidance from module and submodule specs
 */
function buildStructureGuidance(
  moduleSpec: {
    documentStructureTemplate?: {
      sections: Array<{
        number: number;
        title: string;
        required: boolean;
        minParagraphs: number;
        contentGuidance: string;
      }>;
    };
  } | null,
  submoduleSpec: { code?: string } | null,
): string {
  if (!moduleSpec || !moduleSpec.documentStructureTemplate) {
    return "";
  }

  const blocks: string[] = [
    "\nDOCUMENT STRUCTURE GUIDANCE (from specifications):",
    "=".repeat(80),
  ];

  for (const section of moduleSpec.documentStructureTemplate.sections) {
    blocks.push(`\n${section.number}. ${section.title}`);
    blocks.push(`   Required: ${section.required ? "YES" : "NO"}`);
    blocks.push(`   Minimum Paragraphs: ${section.minParagraphs}`);
    blocks.push(`   Guidance: ${section.contentGuidance}`);

    // Add submodule-specific content if available
    if (submoduleSpec && section.number === 8) {
      blocks.push(
        `   MUST INCLUDE: All requirements from ${submoduleSpec.code} specification`,
      );
    }
  }

  blocks.push("");
  return blocks.join("\n");
}

/** Build micro-rules injection block for prompt */
function buildMicroRulesBlock(
  microRules: Map<string, { category: string; rules: Record<string, string> }>,
  relevantGroups: MicroRuleCategory[],
): string {
  if (microRules.size === 0) return "";

  const blocks: string[] = [
    "\nMANDATORY COMPLIANCE REQUIREMENTS (must be integrated naturally):",
    "=========================================================================",
    `You MUST integrate ALL requirements from these categories: ${relevantGroups.join(", ")}`,
    "DO NOT include requirements from any other categories.",
    "\nIntegrate these requirements naturally into Section 8 (Procedures), Section 9 (Monitoring), or Section 11 (CAPA).",
    "DO NOT announce their inclusion. DO NOT add bracketed notes. Write them as if they were always part of the SOP.\n",
  ];

  for (const [category, rulesData] of microRules.entries()) {
    blocks.push(`\n${category.toUpperCase().replace(/_/g, " ")} REQUIREMENTS:`);
    const ruleTexts = Object.values(rulesData.rules);
    for (const ruleText of ruleTexts) {
      blocks.push(`- ${ruleText}`);
    }
  }

  blocks.push(
    "\nIntegrate these requirements seamlessly. They must appear as natural SOP content, not as injected additions.\n",
  );

  return blocks.join("\n");
}

/** Simple stable bedrock call wrapper */
async function invokeClaude(
  prompt: string,
  maxTokens = 20000,
): Promise<string> {
  // Increased default from 8000 to 20000 for complex modules
  const payload: Record<string, unknown> = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    temperature: 0, // deterministic
    top_p: 1,
    messages: [{ role: "user", content: prompt }],
  };

  const command = new InvokeModelCommand({
    modelId: process.env.BEDROCK_MODEL!,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });
  const response = await bedrock.send(command);
  const json = JSON.parse(new TextDecoder().decode(response.body));
  return json.content[0].text;
}

/** Extract JSON block safely */
function safeExtractJSONArray(text: string): string {
  // Trim leading whitespace; expect first non-whitespace to be '['
  const trimmed = text.trim();
  if (!trimmed.startsWith("[")) {
    throw new Error(
      "Model output is not a JSON array (no leading '['). Raw: " +
        trimmed.slice(0, 120),
    );
  }
  const lastBracket = trimmed.lastIndexOf("]");
  if (lastBracket === -1)
    throw new Error("Model output missing closing ']' for JSON array.");
  return trimmed.slice(0, lastBracket + 1);
}

/** Validate & sanitize extracted questions */
function validateQuestions(raw: QuestionItem[]): QuestionItem[] {
  const seen = new Set<string>();
  const modulePrefRegex = new RegExp(
    `^(?:${ALLOWED_EXTRA_PREFIXES.map((p) => p.replace(/[_-]/g, "[_-]?")).join("|")})`,
  );

  const corePresent: string[] = [];
  const extras: QuestionItem[] = [];

  for (const q of raw) {
    if (!q.id || typeof q.id !== "string")
      throw new Error("Question missing id");
    if (seen.has(q.id)) throw new Error(`Duplicate id: ${q.id}`);
    seen.add(q.id);
    if (!q.question || typeof q.question !== "string")
      throw new Error(`Question missing wording: ${q.id}`);
    if (!q.type || !["text", "boolean", "date", "number"].includes(q.type))
      throw new Error(`Invalid type for ${q.id}`);

    if (CORE_FIELD_ORDER.includes(q.id)) corePresent.push(q.id);
    else {
      if (!modulePrefRegex.test(q.id)) {
        console.warn(
          `Warning: Extra field id '${q.id}' not using allowed prefix. Allowing anyway.`,
        );
      }
      extras.push(q);
    }
  }

  // Enforce core order subset
  corePresent.sort(
    (a, b) => CORE_FIELD_ORDER.indexOf(a) - CORE_FIELD_ORDER.indexOf(b),
  );
  extras.sort((a, b) => a.id.localeCompare(b.id));
  return [...corePresent.map((id) => raw.find((r) => r.id === id)!), ...extras];
}

/** Optional second pass verification: ask model to confirm mapping & flag issues */
export async function verifyExtractedQuestions(
  questions: QuestionItem[],
  moduleContext?: PrimusModuleContext,
): Promise<{ valid: boolean; issues: string[]; enriched?: QuestionItem[] }> {
  const moduleNumber = moduleContext?.moduleNumber || "1";
  const checklist = getModuleChecklistItems(moduleNumber);
  const prompt = `You validate a JSON question array for Primus GFS Module ${moduleNumber}.\nRules:\n- Ensure each core field present is appropriate; do not add new fields.\n- Ensure extras map to checklist or justified data gaps (monitoring, CAPA, CCP, traceability).\n- Return ONLY JSON object: {"valid": boolean, "issues": string[], "questions": QuestionItem[]}\n- If modifying hints or checklistRefs for accuracy you may adjust them; DO NOT change ids or types.\n\nChecklist Codes: ${checklist.map((c: ChecklistItem) => c.code).join(", ")}\nInput Questions JSON:\n${JSON.stringify(questions, null, 2)}\nReturn JSON now:`;
  const raw = await invokeClaude(prompt, 1200);
  // Attempt to isolate single JSON object (no array expected). Find first '{' and last '}'
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1)
    throw new Error("Verification output missing JSON object braces");
  const jsonFragment = raw.slice(firstBrace, lastBrace + 1).trim();
  const parsedObj = JSON.parse(jsonFragment);
  return {
    valid: parsedObj.valid,
    issues: parsedObj.issues,
    enriched: parsedObj.questions,
  };
}

/** New deterministic extraction with validation */
export async function callLLM_extractQuestions(
  templateText: string,
  moduleContext?: PrimusModuleContext,
  verifyPass = false,
  documentName?: string,
): Promise<QuestionItem[]> {
  const moduleNumber = moduleContext?.moduleNumber || "1";

  // NEW: Try spec-based extraction first
  const specQuestions = buildQuestionsFromSpec(
    moduleNumber,
    documentName,
    moduleContext?.subModuleName,
  );
  if (specQuestions.length > 6) {
    console.log(
      `[EXTRACT] ✅ Using spec-based extraction: ${specQuestions.length} questions generated`,
    );
    return validateQuestions(specQuestions);
  }

  // FALLBACK: LLM-based extraction
  console.log("[EXTRACT] ⚠️ Falling back to LLM-based extraction");
  const prompt = buildExtractionPrompt(
    templateText,
    moduleContext,
    documentName,
  );
  const raw = await invokeClaude(prompt, 1800);
  const jsonStr = safeExtractJSONArray(raw);
  const parsed = JSON.parse(jsonStr) as QuestionItem[];
  const validated = validateQuestions(parsed);
  if (verifyPass) {
    try {
      const verification = await verifyExtractedQuestions(
        validated,
        moduleContext,
      );
      if (!verification.valid) {
        console.warn("Question verification issues:", verification.issues);
      } else if (verification.enriched) {
        return validateQuestions(verification.enriched);
      }
    } catch (e) {
      console.warn("Verification pass failed:", (e as Error).message);
    }
  }
  return validated;
}

export async function callLLM_fillTemplate(
  templateText: string,
  answers: Record<string, string | boolean | number | Date>,
  moduleContext?: PrimusModuleContext,
  twoPass = false,
  documentName?: string,
): Promise<string> {
  const MAX_RETRIES = 3;
  let lastError: string | undefined;

  const moduleNumber = moduleContext?.moduleNumber || "1";

  // NEW: Try spec-driven approach first
  let prompt: string;
  let useSpecDriven = false;

  try {
    // Attempt to build spec-driven prompt
    prompt = buildSpecDrivenPrompt(
      moduleNumber,
      answers,
      documentName,
      moduleContext?.subModuleName,
    );
    useSpecDriven = true;
    console.log(
      `[LLM] ✅ Using spec-driven generation for module ${moduleNumber}`,
    );
  } catch (error) {
    // Fallback to template-based approach
    console.warn(
      `[LLM] ⚠️ Spec-driven generation not available, falling back to template-based: ${(error as Error).message}`,
    );

    // Use pre-built template if available
    const prebuiltTemplate = selectTemplate(
      moduleNumber,
      moduleContext?.subModuleName,
      documentName,
    );
    const actualTemplate = prebuiltTemplate || templateText;

    // Build template-based prompt (legacy)
    prompt = buildFillTemplatePrompt(
      actualTemplate,
      answers,
      moduleContext,
      documentName,
    );
    useSpecDriven = false;
  }

  // Detect relevant micro-rule groups for compliance linting
  const relevantGroups = useSpecDriven
    ? [] // Spec-driven approach handles micro-rules in prompt
    : detectRelevantMicroRuleGroups(moduleContext, documentName);

  // Retry loop with validation
  // Token limits configured to handle modules with varying complexity:
  // - Spec-driven: 45000 tokens (supports very large modules like Module 3.06 with 22 requirements - ensures complete 15-section documents)
  // - Template-based: 18000 tokens (legacy approach, fewer requirements typically)
  // - Default: 20000 tokens (balanced for most use cases)
  // These limits ensure complete 15-section documents for all Primus GFS modules (1-6)
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(
      `[LLM] Generation attempt ${attempt}/${MAX_RETRIES} (${useSpecDriven ? "spec-driven" : "template-based"})`,
    );

    // Use higher token limit for spec-driven generation to ensure complete 15-section documents
    // Increased to 45000 to accommodate very large submodules (Module 3.06 has 22 requirements, Module 3.09 has 18)
    const tokenLimit = useSpecDriven ? 45000 : 18000;
    console.log(`[LLM] Using token limit: ${tokenLimit}`);

    const doc = await invokeClaude(prompt, tokenLimit);

    // STEP 1: Check for forbidden patterns ONLY (not structure yet)
    const forbiddenCheck = checkForbiddenPatternsOnly(doc);

    if (!forbiddenCheck.hasForbiddenPatterns) {
      console.log(
        `[LLM] ✅ Output passed forbidden pattern check on attempt ${attempt}`,
      );

      // STEP 2: Apply sanitization
      let sanitized = sanitizeOutput(doc);

      // STEP 3: Apply signature cutoff to remove post-signature content
      sanitized = cutoffAfterSignatures(sanitized);

      // STEP 4: Auto-lint and auto-correct compliance issues (only for template-based)
      if (!useSpecDriven && relevantGroups.length > 0) {
        const lintReport = lintCompliance(sanitized, relevantGroups, true);
        sanitized = lintReport.correctedDocument || sanitized;
      }

      // STEP 5: Strip any compliance annotations that may have leaked through
      let finalDoc = stripComplianceAnnotations(sanitized);

      // STEP 6: Final cutoff pass to catch any compliance content added by linting
      finalDoc = cutoffAfterSignatures(finalDoc);

      // STEP 7: Verify no post-signature content remains
      if (hasPostSignatureContent(finalDoc)) {
        console.warn(
          `[LLM] ⚠️ Post-signature content still detected. Applying aggressive cutoff.`,
        );
        finalDoc = cutoffAfterSignatures(finalDoc);
      }

      // STEP 8: Now validate structure (after all processing)
      const structureValidation = validateLLMOutput(finalDoc);

      if (!structureValidation.valid) {
        // Log warnings but continue anyway - structure issues might be acceptable
        console.warn(
          `[LLM] ⚠️ Structure validation issues detected (continuing anyway):`,
        );
        const criticalErrors = getCriticalErrors(structureValidation);
        criticalErrors
          .slice(0, 5)
          .forEach((e) => console.warn(`  - ${e.message}`));
      }

      if (!twoPass) return finalDoc.trim();

      // Second pass completeness check (optional)
      const checklist = getModuleChecklistItems(moduleNumber);
      const verificationPrompt = `You are verifying a Primus GFS document for completeness. Return ONLY JSON: {"missingSections": string[], "issues": string[], "ok": boolean}.\nChecklist Codes: ${checklist.map((c: ChecklistItem) => c.code).join(", ")}\nDocument:\n<<<BEGIN_DOC>>>\n${finalDoc}\n<<<END_DOC>>>\nAssess now:`;
      const verifyRaw = await invokeClaude(verificationPrompt, 1200);
      try {
        const firstBrace = verifyRaw.indexOf("{");
        const lastBrace = verifyRaw.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
          const fragment = verifyRaw.slice(firstBrace, lastBrace + 1).trim();
          const parsed = JSON.parse(fragment);
          if (!parsed.ok) {
            console.warn(
              "[LLM] Verification issues:",
              parsed.issues,
              parsed.missingSections,
            );
          }
        }
      } catch (e) {
        console.warn(
          "[LLM] Verification JSON parse failed",
          (e as Error).message,
        );
      }
      return finalDoc.trim();
    } else {
      // Forbidden patterns detected - retry with modified prompt
      const errorSummary = forbiddenCheck.forbiddenPatterns
        .slice(0, 3)
        .join("; ");
      lastError = errorSummary;

      console.log(
        `[LLM] ❌ Attempt ${attempt} has forbidden patterns: ${errorSummary}`,
      );

      if (attempt < MAX_RETRIES) {
        console.log(`[LLM] 🔄 Retrying...`);
        // Continue to next attempt
      } else {
        // Max retries reached - apply aggressive sanitization and return
        console.error(
          `[LLM] ❌ Max retries reached. Returning sanitized output despite issues.`,
        );

        let aggressivelySanitized = stripComplianceAnnotations(
          sanitizeOutput(doc),
        );
        aggressivelySanitized = cutoffAfterSignatures(aggressivelySanitized);

        return aggressivelySanitized.trim();
      }
    }
  }

  // Fallback (should never reach here)
  throw new Error(
    `Document generation failed after ${MAX_RETRIES} attempts. Last error: ${lastError}`,
  );
}

// Legacy function removed: use invokeClaude above. (Kept stub for backward compatibility if imported elsewhere.)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function callBedrock(_prompt: string, _temperature = 0): Promise<string> {
  throw new Error("callBedrock deprecated. Use invokeClaude().");
}

// Legacy extractor retained for compatibility (avoid usage in new code)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractJSON(text: string): string {
  return safeExtractJSONArray(text);
}
