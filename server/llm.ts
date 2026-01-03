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
} from "./primus/loader";
import {
  checkForbiddenPatternsOnly,
  cutoffAfterSignatures,
  getCriticalErrors,
  hasPostSignatureContent,
  sanitizeOutput,
  stripComplianceAnnotations,
  validateLLMOutput,
  validateProceduralQuality,
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

/**
 * Extract requirement code from question ID in deterministic format
 * Pattern: requirement_X_XX_XX → X.XX.XX or requirement_X_XX_XXa → X.XX.XXa
 * 
 * @example
 * extractRequirementCode("requirement_1_01_01") → "1.01.01"
 * extractRequirementCode("requirement_5_02_03") → "5.02.03"
 * extractRequirementCode("requirement_2_03_04a") → "2.03.04a"
 * extractRequirementCode("requirement_2_03_04b") → "2.03.04b"
 * extractRequirementCode("company_name") → null
 */
function extractRequirementCode(questionId: string): string | null {
  // Pattern: requirement_X_XX_XX[a-z] (letter suffix is optional)
  const match = questionId.match(/requirement_(\d+)_(\d+)_(\d+)([a-z]?)/i);
  if (!match) return null;
  const suffix = match[4] ? match[4].toLowerCase() : '';
  return `${match[1]}.${match[2].padStart(2, '0')}.${match[3].padStart(2, '0')}${suffix}`;
}

/**
 * Determine target section number for a requirement based on deterministic rules
 * Uses keyword matching to assign requirements to appropriate sections
 * 
 * @param requirementText - The requirement description or question text
 * @param requirementCode - The requirement code (e.g., "1.01.01")
 * @returns Section number (1-15) where this requirement should appear
 */
function determineTargetSection(
  requirementText: string,
  requirementCode: string,
): number {
  const text = requirementText.toLowerCase();
  
  // Deterministic rules based on keywords (sorted by priority)
  
  // Section 2: Purpose/Policy (policy statements, objectives)
  if (
    (text.includes('policy') && text.includes('document')) ||
    (text.includes('policy') && text.includes('establish')) ||
    text.includes('purpose') ||
    text.includes('objective')
  ) {
    return 2;
  }
  
  // Section 9: Monitoring (monitoring, frequency, inspection)
  if (
    text.includes('monitor') ||
    text.includes('frequency') ||
    text.includes('inspection') ||
    text.includes('check') ||
    text.includes('observe')
  ) {
    return 9;
  }
  
  // Section 13: Records (record keeping, retention, documentation storage)
  if (
    text.includes('record') ||
    text.includes('retention') ||
    text.includes('document control') ||
    text.includes('filing') ||
    text.includes('archive')
  ) {
    return 13;
  }
  
  // Section 10: Verification (verification, validation, testing)
  if (
    text.includes('verify') ||
    text.includes('validation') ||
    text.includes('test') ||
    text.includes('confirm') ||
    text.includes('audit')
  ) {
    return 10;
  }
  
  // Section 11: CAPA (corrective, preventive, non-conformance)
  if (
    text.includes('corrective') ||
    text.includes('preventive') ||
    text.includes('capa') ||
    text.includes('non-conformance') ||
    text.includes('deviation')
  ) {
    return 11;
  }
  
  // Section 7: Hazard Analysis (hazard, risk, analysis)
  if (
    text.includes('hazard') ||
    text.includes('risk') ||
    text.includes('analysis') ||
    text.includes('assess')
  ) {
    return 7;
  }
  
  // Section 5: Roles & Responsibilities (role, responsibility, responsible)
  if (
    text.includes('role') ||
    text.includes('responsibility') ||
    text.includes('responsible') ||
    text.includes('accountable')
  ) {
    return 5;
  }
  
  // Section 12: Traceability (traceability, recall, lot)
  if (
    text.includes('traceability') ||
    text.includes('recall') ||
    text.includes('lot') ||
    text.includes('batch')
  ) {
    return 12;
  }
  
  // Default to Section 8: Procedures (most requirements are procedural)
  return 8;
}

/**
 * Format answer value for display in documents (deterministic output)
 * Ensures consistent formatting across all document generations
 * 
 * @param answer - The answer value (can be any type)
 * @returns Formatted string for display
 */
function formatAnswerForDisplay(answer: unknown): string {
  if (typeof answer === 'boolean') return answer ? 'Yes' : 'No';
  if (answer instanceof Date) return answer.toISOString().split('T')[0]; // YYYY-MM-DD
  if (typeof answer === 'number') return String(answer);
  if (answer === null || answer === undefined) return 'To be determined';
  return String(answer);
}

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
 * Requirement mapping result with all metadata needed for document generation
 */
interface RequirementMapping {
  code: string; // e.g., "1.01.01"
  questionId: string; // e.g., "requirement_1_01_01"
  answer: string | boolean | number | Date;
  question: string; // Human-readable question text
  requirementText: string; // From spec: requirement description
  sectionNumber: number; // Target section (1-15) where this should appear
}

/**
 * Maps answers to their Primus GFS requirement codes with deterministic ordering
 * Returns stable mapping for document generation with requirement headers
 * 
 * @param answers - User-provided answers keyed by question ID
 * @param questions - Question items from buildQuestionsFromSpec()
 * @param moduleNumber - Module number for loading specs
 * @param documentName - Document name for submodule identification
 * @param subModuleName - Optional submodule name
 * @returns Array of requirement mappings sorted by code (ascending)
 * 
 * @example
 * Input: { requirement_1_01_01: "Yes", requirement_1_01_02: "Quarterly" }
 * Output: [
 *   { 
 *     code: "1.01.01", 
 *     questionId: "requirement_1_01_01", 
 *     answer: "Yes",
 *     question: "Is food safety policy documented?",
 *     requirementText: "Food safety policy must be documented",
 *     sectionNumber: 2
 *   },
 *   { 
 *     code: "1.01.02", 
 *     questionId: "requirement_1_01_02", 
 *     answer: "Quarterly",
 *     question: "How often is policy reviewed?",
 *     requirementText: "Policy must be reviewed at defined intervals",
 *     sectionNumber: 8
 *   }
 * ]
 */
function mapAnswersToRequirements(
  answers: Record<string, string | boolean | number | Date>,
  questions: QuestionItem[],
  moduleNumber: string,
  documentName?: string,
  subModuleName?: string,
): RequirementMapping[] {
  const mappings: RequirementMapping[] = [];
  
  // Load submodule spec to get requirement details
  let submoduleSpec: any = null;
  try {
    submoduleSpec = findSubmoduleSpecByName(moduleNumber, documentName, subModuleName);
  } catch (error) {
    console.warn('[MAPPING] Could not load submodule spec:', error);
    // Continue without spec - will use question text as requirement text
  }
  
  // Build lookup map for requirements by code
  const requirementsByCode = new Map<string, any>();
  if (submoduleSpec?.requirements) {
    for (const req of submoduleSpec.requirements) {
      requirementsByCode.set(req.code, req);
    }
  }
  
  // Process each question with a checklistRef
  for (const question of questions) {
    // Skip core fields (not requirement-based)
    if (CORE_FIELD_ORDER.includes(question.id)) continue;
    
    // Extract requirement code from question ID
    const code = extractRequirementCode(question.id);
    if (!code) continue; // Not a requirement question
    
    // Check if this question has an answer
    if (!(question.id in answers)) {
      console.warn(`[MAPPING] No answer provided for ${question.id} (${code})`);
      continue;
    }
    
    const answer = answers[question.id];
    
    // Get requirement details from spec
    const requirement = requirementsByCode.get(code);
    const requirementText = requirement?.text || requirement?.required || question.question;
    
    // Determine target section using deterministic rules
    const sectionNumber = determineTargetSection(
      requirementText,
      code,
    );
    
    mappings.push({
      code,
      questionId: question.id,
      answer,
      question: question.question,
      requirementText,
      sectionNumber,
    });
  }
  
  // Sort deterministically by requirement code (numerical sort)
  mappings.sort((a, b) => {
    const [aMaj, aMin, aSub] = a.code.split('.').map(Number);
    const [bMaj, bMin, bSub] = b.code.split('.').map(Number);
    return (aMaj - bMaj) || (aMin - bMin) || (aSub - bSub);
  });
  
  console.log(`[MAPPING] Generated ${mappings.length} requirement mappings`);
  return mappings;
}

/**
 * Validates that core answers AND requirement headers appear in generated document
 * Checks both raw answer presence and requirement code header formatting
 * 
 * @param document - Generated document text
 * @param answers - Original answers provided by user
 * @param questions - Questions with checklistRefs for requirement validation
 * @param coreFieldsOnly - If true, only validate core fields (skip requirement headers)
 * @returns Validation results with missing/found fields and requirement headers
 * 
 * @example Header pattern to match: "### 1.01.01 - Food Safety Policy"
 */
function validateAnswersPresent(
  document: string,
  answers: Record<string, string | boolean | number | Date>,
  questions: QuestionItem[],
  coreFieldsOnly = false,
): {
  missing: string[];
  found: string[];
  missingRequirementHeaders: string[];
  foundRequirementHeaders: string[];
} {
  const missing: string[] = [];
  const found: string[] = [];
  const missingRequirementHeaders: string[] = [];
  const foundRequirementHeaders: string[] = [];
  
  const docLower = document.toLowerCase();
  
  // Validate core fields
  for (const fieldId of CORE_FIELD_ORDER) {
    if (!(fieldId in answers)) continue; // Skip if not provided
    
    const answer = answers[fieldId];
    const answerStr = formatAnswerForDisplay(answer).toLowerCase();
    
    // Special handling for approved_by - must be in Section 15
    if (fieldId === 'approved_by') {
      // Match Section 15 to end of document (use multiline mode only)
      const section15Match = document.match(/15\.\s*REVISION HISTORY[\s\S]*$/i);
      
      if (section15Match) {
        const section15Text = section15Match[0].toLowerCase();
        // Accept if actual name OR signature line exists
        if (section15Text.includes(answerStr) || section15Text.includes('approved by:')) {
          found.push(fieldId);
          console.log(`[VALIDATION] ✅ approved_by found in Section 15`);
        } else {
          console.warn(`[VALIDATION] ❌ approved_by "${answerStr}" not found in Section 15`);
          console.warn(`[VALIDATION] Section 15 contains:`, section15Text.slice(0, 200));
          missing.push(fieldId);
        }
      } else {
        console.warn(`[VALIDATION] ❌ Section 15 not found in document`);
        missing.push(fieldId);
      }
    } else {
      // General validation for other core fields
      if (docLower.includes(answerStr)) {
        found.push(fieldId);
      } else {
        missing.push(fieldId);
      }
    }
  }
  
  // Validate requirement headers (unless core fields only)
  if (!coreFieldsOnly) {
    for (const question of questions) {
      // Skip core fields
      if (CORE_FIELD_ORDER.includes(question.id)) continue;
      
      // Extract requirement code
      const code = extractRequirementCode(question.id);
      if (!code) continue; // Not a requirement question
      
      // Check if answer exists
      if (!(question.id in answers)) continue;
      
      // Build header pattern: ### {code} - (case insensitive)
      // Pattern: ###\s+{code}\s+-
      // Escape dots in code (1.01.01 -> 1\.01\.01)
      const escapedCode = code.replace(/\./g, '\\.');
      
      // Build regex pattern with single backslashes for RegExp constructor
      const headerPattern = new RegExp(`###\\s+${escapedCode}\\s+-`, 'i');
      
      // Debug first code only
      if (code === '1.01.01') {
        console.log(`[VALIDATION] Looking for code: ${code}`);
        console.log(`[VALIDATION] Escaped code: ${escapedCode}`);
        console.log(`[VALIDATION] Pattern: ${headerPattern}`);
        console.log(`[VALIDATION] Document contains "### 1.01.01 -": ${document.includes('### 1.01.01 -')}`);
      }
      
      const headerMatch = document.match(headerPattern);
      
      if (headerMatch) {
        foundRequirementHeaders.push(code);
        
        // Verify answer appears within 500 characters after header
        const headerIndex = headerMatch.index || 0;
        const sectionText = document.slice(headerIndex, headerIndex + 500);
        const answer = answers[question.id];
        const answerStr = formatAnswerForDisplay(answer);
        
        if (!sectionText.toLowerCase().includes(answerStr.toLowerCase())) {
          console.warn(
            `[VALIDATION] Header found for ${code} but answer "${answerStr}" not nearby`,
          );
        }
      } else {
        missingRequirementHeaders.push(code);
      }
    }
  }
  
  return { missing, found, missingRequirementHeaders, foundRequirementHeaders };
}

/**
 * Build requirement-to-section mapping table for LLM prompt
 * Shows exactly which requirements go in which sections (deterministic)
 * 
 * @param mappings - Requirement mappings from mapAnswersToRequirements()
 * @returns Formatted string showing section assignments
 * 
 * @example Output:
 * Section 2:
 *   - 1.01.01: Is food safety policy documented?
 *   - 1.01.02: How often is policy reviewed?
 * Section 8:
 *   - 1.01.03: What are the documented procedures?
 */
function buildRequirementSectionMapping(mappings: RequirementMapping[]): string {
  // Group by section number
  const grouped = new Map<number, RequirementMapping[]>();
  
  for (const mapping of mappings) {
    if (!grouped.has(mapping.sectionNumber)) {
      grouped.set(mapping.sectionNumber, []);
    }
    grouped.get(mapping.sectionNumber)!.push(mapping);
  }
  
  // Sort sections numerically
  const sortedSections = Array.from(grouped.entries()).sort(([a], [b]) => a - b);
  
  // Build output string
  const lines: string[] = [];
  for (const [sectionNum, reqs] of sortedSections) {
    lines.push(`\\nSection ${sectionNum}:`);
    for (const req of reqs) {
      lines.push(`  - ${req.code}: ${req.question}`);
    }
  }
  
  return lines.join('\\n');
}

/**
 * Build requirement structure guidance for LLM prompt
 * Provides deterministic rules for generating requirement headers
 * 
 * @param mappings - Requirement mappings from mapAnswersToRequirements()
 * @returns Formatted instruction block for prompt
 */
function buildRequirementStructureGuidance(mappings: RequirementMapping[]): string {
  if (mappings.length === 0) return '';
  
  const sectionMapping = buildRequirementSectionMapping(mappings);
  
  return `
REQUIREMENT-SPECIFIC CONTENT STRUCTURE (MANDATORY):
===================================================
YOU MUST structure content using Primus GFS requirement codes as subsection headers.

FORMAT FOR SECTIONS WITH REQUIREMENTS:
Each section must include subsections for relevant requirements in this EXACT format:

### {REQUIREMENT_CODE} - {REQUIREMENT_TITLE}

**Requirement:** {Brief statement of what Primus GFS requires}
**Implementation Status:** {Answer from provided data}

{2-3 paragraphs describing HOW this requirement is met, referencing the answer}

EXAMPLE for Section 8 (Procedures):

8. PROCEDURES

### 1.01.01 - Food Safety Policy Documentation

**Requirement:** A documented food safety policy must be established and maintained.
**Implementation Status:** Yes - Policy documented as of {effective_date}

The company has established a comprehensive food safety policy (Document #: {document_number}) 
that outlines our commitment to producing safe food products. This policy is reviewed annually 
by {approved_by} and updated as needed to reflect regulatory changes...

[Continue with specific procedures...]

### 1.01.02 - Policy Review and Update Frequency

**Requirement:** Food safety policy must be reviewed at defined intervals.
**Implementation Status:** Quarterly reviews conducted

The Food Safety Manager conducts formal policy reviews on a quarterly basis...

DETERMINISTIC RULES:
1. Requirement codes MUST match exactly: ${mappings.map(m => m.code).join(', ')}
2. Sort requirements numerically within each section (ascending order)
3. Every requirement answer MUST appear under its corresponding code header
4. Use exact format: "### {code} - {title}" (3 hashes, space, code, space, hyphen, space, title)
5. Blank line before "**Requirement:**", blank line after Implementation Status, then content paragraphs
6. If a requirement has no associated answer, use: "**Implementation Status:** To be determined"

REQUIREMENT-TO-SECTION MAPPING (follow this exactly):
${sectionMapping}

ALL ${mappings.length} REQUIREMENTS LISTED ABOVE MUST APPEAR AS HEADERS IN THEIR ASSIGNED SECTIONS.

CRITICAL - MANDATORY REQUIREMENT CHECKLIST:
===========================================
YOU MUST GENERATE HEADERS FOR EVERY SINGLE REQUIREMENT BELOW.
Before finishing your response, verify that ALL of these headers appear in your output:

${mappings.map((m, idx) => `${idx + 1}. ### ${m.code} - (${m.question.slice(0, 50)}...)`).join('\n')}

VERIFICATION CHECKLIST (verify each before responding):
${mappings.map(m => `☐ ### ${m.code} - header present with content`).join('\n')}

DO NOT SKIP ANY REQUIREMENT. All ${mappings.length} headers listed above are MANDATORY.
If you cannot find a natural place for a requirement, add it to Section 8 (Procedures) with appropriate content.
`;
}

/**
 * Build explicit answer placement map showing where each value must appear
 * Ensures LLM knows exactly where to inject each answer
 * 
 * @param answers - User-provided answers
 * @param mappings - Requirement mappings with section assignments
 * @returns Formatted instruction block for prompt
 */
function buildAnswerPlacementMap(
  answers: Record<string, string | boolean | number | Date>,
  mappings: RequirementMapping[],
): string {
  const coreFieldInstructions: string[] = [];
  
  // Build core field placement instructions
  const coreFieldMap: Record<string, string> = {
    company_name: 'Section 1: "Organization: {value}"',
    facility_name: 'Section 1: "Facility: {value}"',
    document_number: 'Section 1: "Document Number: {value}"',
    document_version: 'Section 1: "Version: {value}"',
    effective_date: 'Section 1: "Effective Date: {value}"',
    approved_by: 'Section 15: "Approved By: {value} Date: __________"',
    review_date: 'Section 15: "Review Date: {value}"',
    revision_number: 'Section 1: "Revision: {value}"',
    position: 'Section 15: "Position: {value}"',
  };
  
  for (const fieldId of CORE_FIELD_ORDER) {
    if (fieldId in answers) {
      const value = formatAnswerForDisplay(answers[fieldId]);
      const location = coreFieldMap[fieldId] || 'Section 1';
      coreFieldInstructions.push(`- ${fieldId}: "${value}" → ${location}`);
    }
  }
  
  // Build requirement answer placement instructions
  const requirementInstructions = mappings.map(m => 
    `- ${m.code}: "${formatAnswerForDisplay(m.answer)}" → Under "### ${m.code} - ..." in Section ${m.sectionNumber}`
  );
  
  return `
MANDATORY ANSWER PLACEMENT (inject exact values shown):
========================================================
CORE FIELDS (must appear in Sections 1 and 15):
${coreFieldInstructions.join('\\n')}

REQUIREMENT ANSWERS (must appear under their ### headers):
${requirementInstructions.join('\\n')}

CRITICAL: Every answer listed above MUST appear in the document at its specified location.
Use the EXACT values shown (do not paraphrase or summarize).
Place requirement answers within 2-3 paragraphs under their respective ### headers.
`;
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
          // Include ALL requirements (both required and optional) as questions
          // Users decide which ones to answer, and we only include answered requirements in the document
          
          // Determine question type based on keywords
          const questionType = determineQuestionType(
            reqAny.text,
            reqAny.keywords || [],
          );

          // Generate question from requirement text
          const questionText = generateQuestionFromRequirement(reqAny.text);

          // Create question ID from requirement code
          const questionId = `requirement_${reqAny.code.replace(/\./g, "_").toLowerCase()}`;

          // Log with required/optional indicator
          const requiredLabel = reqAny.required ? 'REQUIRED' : 'OPTIONAL';
          console.log(
            `[SPEC] Adding ${requiredLabel} question: ${questionId} (${questionType})`,
          );

          questions.push({
            id: questionId,
            question: questionText,
            type: questionType,
            hint: `${reqAny.required ? 'REQUIRED - ' : 'OPTIONAL - '}${reqAny.code}: ${reqAny.text.slice(0, 60)}...`,
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

/**
 * Build explicit answer placement map showing where each value must appear
 * Ensures LLM knows exactly where to inject each answer
 * 
/**
 * Enhanced spec-driven prompt with requirement header enforcement
 * Wraps buildSpecDrivenPrompt() with additional structure requirements
 * 
 * @param moduleNumber - Module number (e.g., \"1\", \"5\", \"6\")
 * @param answers - User-provided answers
 * @param questions - Questions from buildQuestionsFromSpec()
 * @param documentName - Document name for context
 * @param subModuleName - Submodule name for context
 * @returns Enhanced prompt with requirement header guidance
 */
function buildEnhancedSpecDrivenPrompt(
  moduleNumber: string,
  answers: Record<string, string | boolean | number | Date>,
  questions: QuestionItem[],
  documentName?: string,
  subModuleName?: string,
): string {
  // Get base spec-driven prompt
  const basePrompt = buildSpecDrivenPrompt(
    moduleNumber,
    answers,
    documentName,
    subModuleName,
  );
  
  // Build requirement mappings
  const mappings = mapAnswersToRequirements(
    answers,
    questions,
    moduleNumber,
    documentName,
    subModuleName,
  );
  
  if (mappings.length === 0) {
    console.log('[ENHANCED] No requirement mappings found, using base prompt');
    return basePrompt;
  }
  
  // Build answer placement map
  const answerPlacementMap = buildAnswerPlacementMap(answers, mappings);
  
  // Build requirement structure guidance
  const structureGuidance = buildRequirementStructureGuidance(mappings);
  
  console.log(`[ENHANCED] Adding answer placement map and requirement structure guidance for ${mappings.length} requirements`);
  
  // Inject answer placement map AND requirement structure guidance before the main structure section
  // Try multiple possible structure markers from buildSpecDrivenPrompt
  const possibleMarkers = [
    'MANDATORY DOCUMENT STRUCTURE (15 SECTIONS):',
    'DOCUMENT STRUCTURE:',
    '## Document Structure',
    'STRUCTURE:',
    '## Structure',
    'You must generate a document with the following structure',
  ];
  
  let markerIndex = -1;
  let foundMarker = '';
  
  for (const marker of possibleMarkers) {
    markerIndex = basePrompt.indexOf(marker);
    if (markerIndex !== -1) {
      foundMarker = marker;
      break;
    }
  }
  
  if (markerIndex === -1) {
    console.warn('[ENHANCED] Could not find structure marker in base prompt');
    console.warn('[ENHANCED] Base prompt length:', basePrompt.length);
    console.warn('[ENHANCED] First 500 chars:', basePrompt.slice(0, 500));
    console.warn('[ENHANCED] Appending requirement guidance at end');
    return basePrompt + '\\n\\n' + structureGuidance;
  }
  
  console.log(`[ENHANCED] Found structure marker "${foundMarker}" at position ${markerIndex}`);
  console.log(`[ENHANCED] Injecting answer placement map and requirement guidance`);
  
  // Inject BOTH answer placement map AND requirement guidance before the structure marker
  const enhancedPrompt = 
    basePrompt.slice(0, markerIndex) +
    answerPlacementMap +
    '\\n\\n' +
    structureGuidance +
    '\\n\\n' +
    basePrompt.slice(markerIndex);
  
  return enhancedPrompt;
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
    .join("\\n");

  return `You are a deterministic Primus GFS v4.0 compliance question extractor. Output ONLY strict JSON.\\nROLE: Identify organization-specific data points required to finalize this template for Primus GFS audit readiness for Module ${moduleNumber}.\\n\\nSTRICT RULES:\\n1. Return ONLY a JSON array. No prose, no markdown, no comments.\\n2. Array length: 7 to 15 items total.\\n3. First ${CORE_FIELD_ORDER.length} items MUST be the core fields IN EXACT ORDER if relevant; omit only if truly irrelevant (still preserve order of those used).\\n4. Additional fields MUST derive from: placeholders {{like_this}}, explicit section headings, mandatory checklist items (${checklist.map((c: ChecklistItem) => c.code).join(", ")}), or obvious data gaps needed for monitoring, verification, CAPA, traceability.\\n5. No speculative or generic best-practice questions.\\n6. Field ids: snake_case; core fields fixed; extras must start with one of prefixes: ${ALLOWED_EXTRA_PREFIXES.join(", ")}.\\n7. Allowed types: "text" | "boolean" | "date" | "number".\\n8. Boolean ONLY for compliance status or existence (e.g., presence of plan / program).\\n9. Each item MUST map at least one checklist reference code in checklistRefs when derived from a checklist requirement.\\n10. Deterministic wording: do not vary synonyms across runs.\\n11. Hints optional; if present must be < 120 chars and may cite Primus code.\\n12. NO placeholders like [FILL], no TBD, no nulls.\\n13. If facility_name not applicable, exclude it (do not replace with another field in that slot).\\n14. Maintain stable ordering: core fields first (filtered), then extras sorted alphabetically by id.\\n\\nOUTPUT JSON SCHEMA (informal):\\n[\\n  {\\n    "id": string,\\n    "question": string,\\n    "type": "text"|"boolean"|"date"|"number",\\n    "hint"?: string,\\n    "checklistRefs"?: string[]\\n  }\\n]\\n\\nCHECKLIST (Module ${moduleNumber}):\\n${checklistBlock}\\n\\nTEMPLATE:\\n<<<BEGIN_TEMPLATE>>>\\n${templateText}\\n<<<END_TEMPLATE>>>\\n\\nReturn JSON now:`;
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
  maxTokens = 30000,
): Promise<string> {
  // Increased to 30000 for audit-ready procedural documents with 15+ requirements
  // This ensures complete documents without truncation
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
  
  // Log token usage for monitoring
  if (json.usage) {
    console.log(`[BEDROCK] Token usage: input=${json.usage.input_tokens}, output=${json.usage.output_tokens}`);
  }
  
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
  const moduleNumber = moduleContext?.moduleNumber || "1";

  // SPEC-DRIVEN ONLY: Build questions first (needed for requirement mapping)
  const questions = buildQuestionsFromSpec(
    moduleNumber,
    documentName,
    moduleContext?.subModuleName,
  );

  if (questions.length <= 6) {
    // Fail fast if specs not available
    throw new Error(
      `Spec-driven generation failed: insufficient questions (${questions.length}). ` +
      `Module ${moduleNumber}, Submodule: ${moduleContext?.subModuleName || 'N/A'}, ` +
      `Document: ${documentName || 'N/A'}. Spec files may be missing or incomplete.`,
    );
  }

  console.log(
    `[LLM] ✅ Using SPEC-DRIVEN ONLY generation for module ${moduleNumber} (${questions.length} questions)`,
  );

  // Build enhanced prompt with requirement headers
  let prompt = buildEnhancedSpecDrivenPrompt(
    moduleNumber,
    answers,
    questions,
    documentName,
    moduleContext?.subModuleName,
  );

  // Detect relevant micro-rule groups for compliance linting
  const relevantGroups = detectRelevantMicroRuleGroups(moduleContext, documentName);

  // Retry loop with enhanced validation
  let lastError: string | undefined;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // Determine token limit based on requirement count (more requirements = more tokens needed)
    const requirementCount = questions.filter(q => extractRequirementCode(q.id)).length;
    let tokenLimit = 25000; // Base token limit
    
    if (requirementCount >= 20) {
      tokenLimit = 35000; // Very large submodules
    } else if (requirementCount >= 15) {
      tokenLimit = 30000; // Large submodules
    } else if (requirementCount >= 10) {
      tokenLimit = 28000; // Medium submodules
    }
    
    // Log generation metrics
    console.log(`[LLM] Generation metrics:`, {
      attempt,
      moduleNumber,
      submodule: moduleContext?.subModuleName,
      answerCount: Object.keys(answers).length,
      requirementCount,
      tokenLimit, // Dynamic token limit
      specDriven: true,
      microRuleGroups: relevantGroups.length,
    });

    const doc = await invokeClaude(prompt, tokenLimit); // Use dynamic token limit

    // STEP 1: Check for forbidden patterns
    const forbiddenCheck = checkForbiddenPatternsOnly(doc);

    if (!forbiddenCheck.hasForbiddenPatterns) {
      console.log(
        `[LLM] ✅ Output passed forbidden pattern check on attempt ${attempt}`,
      );

      // STEP 2: Apply sanitization
      let sanitized = sanitizeOutput(doc);

      // STEP 3: Apply signature cutoff
      sanitized = cutoffAfterSignatures(sanitized);

      // STEP 4: Apply micro-rule linting (ALWAYS, not just template-based)
      if (relevantGroups.length > 0) {
        const lintReport = lintCompliance(sanitized, relevantGroups, true);
        sanitized = lintReport.correctedDocument || sanitized;
      }

      // STEP 5: Strip any compliance annotations
      let finalDoc = stripComplianceAnnotations(sanitized);

      // STEP 6: Final cutoff pass
      finalDoc = cutoffAfterSignatures(finalDoc);

      // STEP 7: Verify no post-signature content
      if (hasPostSignatureContent(finalDoc)) {
        console.warn(
          `[LLM] ⚠️ Post-signature content detected. Applying aggressive cutoff.`,
        );
        finalDoc = cutoffAfterSignatures(finalDoc);
      }

      // STEP 8: Validate answer presence AND requirement headers
      // Debug: Log snippet of generated document
      console.log('[DEBUG] First 1500 chars of generated doc:');
      console.log(finalDoc.slice(0, 1500));
      console.log('[DEBUG] ---');
      
      const answerValidation = validateAnswersPresent(finalDoc, answers, questions);
      
      // Debug: Log first 2000 chars to see what was generated
      console.log('[DEBUG] First 2000 chars of generated doc:');
      console.log(finalDoc.slice(0, 2000));
      console.log('[DEBUG] Searching for headers like: ### 1.01.01 -');

      // STEP 9: Validate structure
      const structureValidation = validateLLMOutput(finalDoc);

      // STEP 10: Check procedural quality (soft check for audit readiness)
      const qualityCheck = validateProceduralQuality(finalDoc);
      
      // Log validation results
      console.log(`[LLM] Validation results:`, {
        answersFound: answerValidation.found.length,
        answersMissing: answerValidation.missing,
        requirementHeadersFound: answerValidation.foundRequirementHeaders.length,
        requirementHeadersMissing: answerValidation.missingRequirementHeaders,
        forbiddenPatterns: forbiddenCheck.hasForbiddenPatterns,
        structureValid: structureValidation.valid,
        proceduralQualityScore: qualityCheck.score,
      });
      
      // Log quality warnings if score is below threshold
      if (qualityCheck.score < 80) {
        console.warn(`[LLM] ⚠️ Procedural quality score: ${qualityCheck.score}/100`);
        console.warn(`[LLM] Quality warnings:`, qualityCheck.warnings);
        console.warn(`[LLM] Suggestions:`, qualityCheck.suggestions);
      } else {
        console.log(`[LLM] ✅ Procedural quality score: ${qualityCheck.score}/100`);
      }

      // Check if critical answers or requirement headers are missing
      const hasMissingCore = answerValidation.missing.length > 0;
      const hasMissingHeaders = answerValidation.missingRequirementHeaders.length > 0;

      if (hasMissingCore || hasMissingHeaders) {
        // Build feedback for retry
        const feedback: string[] = [
          '',
          '❌ PREVIOUS ATTEMPT FAILED - REGENERATE WITH ALL REQUIREMENTS:',
          '',
        ];

        if (hasMissingCore) {
          feedback.push('MISSING CORE FIELDS (must appear in document):');
          for (const fieldId of answerValidation.missing) {
            const value = formatAnswerForDisplay(answers[fieldId]);
            const section = fieldId === 'approved_by' ? 'Section 15' : 'Section 1';
            feedback.push(`- ${fieldId}: "${value}" (MUST appear in ${section})`);
          }
          feedback.push('');
        }

        if (hasMissingHeaders) {
          feedback.push('MISSING REQUIREMENT HEADERS (must use exact format):');
          for (const code of answerValidation.missingRequirementHeaders) {
            const question = questions.find(q => extractRequirementCode(q.id) === code);
            const answer = question ? formatAnswerForDisplay(answers[question.id]) : 'N/A';
            feedback.push(`- Missing header "### ${code} - {title}" with answer "${answer}"`);
          }
          feedback.push('');
          feedback.push('REMEMBER: Header format is "### {code} - {title}" (3 hashes, space, code, space, hyphen, space, title)');
          feedback.push('');
        }

        lastError = feedback.join('\\n');

        if (attempt < MAX_RETRIES) {
          console.log(`[LLM] 🔄 Retrying with feedback about missing items...`);
          prompt = prompt + '\\n\\n' + lastError;
          continue; // Retry with enhanced prompt
        } else {
          // Max retries reached - throw detailed error
          throw new Error(
            `Document generation failed after ${MAX_RETRIES} attempts.\\n` +
            `Missing core answers: ${answerValidation.missing.join(', ')}\\n` +
            `Missing requirement headers: ${answerValidation.missingRequirementHeaders.join(', ')}\\n` +
            `Module: ${moduleNumber}, Submodule: ${moduleContext?.subModuleName || 'N/A'}\\n` +
            `Document: ${documentName || 'N/A'}`,
          );
        }
      }

      // FINAL SAFETY CHECK: Ensure document is complete (all 15 sections present)
      const sectionPattern = /^\d{1,2}\.\s+[A-Z]/gm;
      const sectionMatches = finalDoc.match(sectionPattern);
      const sectionCount = sectionMatches?.length || 0;
      
      if (sectionCount < 15) {
        console.error(`[LLM] ❌ Document incomplete: only ${sectionCount}/15 sections found`);
        lastError = `Document incomplete: only ${sectionCount}/15 sections. Missing sections after Section ${sectionCount}.`;
        
        if (attempt < MAX_RETRIES) {
          console.log(`[LLM] 🔄 Retrying with section completion feedback...`);
          const sectionFeedback = `\n\n❌ PREVIOUS ATTEMPT INCOMPLETE - ONLY ${sectionCount}/15 SECTIONS GENERATED\n\nYou MUST generate ALL 15 sections:\n1. Title & Document Control\n2. Purpose/Objective\n3. Scope\n4. Definitions & Abbreviations\n5. Roles & Responsibilities\n6. Prerequisites & Reference Documents\n7. Hazard/Risk Analysis\n8. Procedures\n9. Monitoring Plan\n10. Verification & Validation Activities\n11. Corrective & Preventive Action (CAPA) Protocol\n12. Traceability & Recall Elements\n13. Record Retention & Document Control\n14. Compliance Crosswalk\n15. Revision History & Approval Signatures\n\nBUDGET YOUR TOKENS: Make sections 9-15 more concise if needed, but DO NOT SKIP ANY.\n`;
          prompt = prompt + sectionFeedback;
          continue; // Retry with section feedback
        } else {
          throw new Error(
            `Document generation failed after ${MAX_RETRIES} attempts.\n` +
            `Only ${sectionCount}/15 sections generated.\n` +
            `Module: ${moduleNumber}, Submodule: ${moduleContext?.subModuleName || 'N/A'}\n` +
            `Document: ${documentName || 'N/A'}`,
          );
        }
      }

      // Success - return document
      if (!twoPass) return finalDoc.trim();

      // Optional second pass completeness check
      const checklist = getModuleChecklistItems(moduleNumber);
      const verificationPrompt = `You are verifying a Primus GFS document for completeness. Return ONLY JSON: {"missingSections": string[], "issues": string[], "ok": boolean}.\\nChecklist Codes: ${checklist.map((c: ChecklistItem) => c.code).join(", ")}\\nDocument:\\n<<<BEGIN_DOC>>>\\n${finalDoc}\\n<<<END_DOC>>>\\nAssess now:`;
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
      // Forbidden patterns detected
      const errorSummary = forbiddenCheck.forbiddenPatterns
        .slice(0, 3)
        .join("; ");
      lastError = errorSummary;

      console.log(
        `[LLM] ❌ Attempt ${attempt} has forbidden patterns: ${errorSummary}`,
      );

      if (attempt < MAX_RETRIES) {
        console.log(`[LLM] 🔄 Retrying...`);
        continue;
      } else {
        // Max retries reached - throw error
        throw new Error(
          `Document generation failed after ${MAX_RETRIES} attempts.\\n` +
          `Forbidden patterns: ${errorSummary}\\n` +
          `Module: ${moduleNumber}, Submodule: ${moduleContext?.subModuleName || 'N/A'}`,
        );
      }
    }
  }

  // Should never reach here (loop always returns or throws)
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
