/**
 * Primus GFS v4.0 Spec-Driven Prompt Builder
 *
 * Builds LLM prompts entirely from JSON specifications
 * NO DEPENDENCY on external templates
 *
 * This module ensures deterministic document generation based solely on:
 * - Module specifications (module_X.json)
 * - Submodule specifications (X.XX.json)
 * - Micro-rules (pest.json, chemical.json, etc.)
 * - User-provided answers
 */

import {
  findSubmoduleSpecByName,
  getRelevantMicroRules,
  loadModuleSpec,
  type MicroRules,
  type ModuleSpec,
  type SubmoduleSpec,
} from "./loader";

import type { MicroRuleCategory } from "./types";

// ============================================================================
// CORE PROMPT BUILDING FUNCTIONS
// ============================================================================

/**
 * Build a complete LLM prompt for document generation from specifications
 * This replaces the template-dependent buildFillTemplatePrompt
 */
export function buildSpecDrivenPrompt(
  moduleNumber: string,
  answers: Record<string, string | boolean | number | Date>,
  documentName?: string,
  subModuleName?: string,
  forceMicroCategories?: MicroRuleCategory[],
): string {
  // Load specifications
  const moduleSpec = loadModuleSpec(moduleNumber);
  const submoduleSpec = findSubmoduleSpecByName(
    moduleNumber,
    documentName,
    subModuleName,
  );

  if (!submoduleSpec) {
    throw new Error(
      `No submodule specification found for module ${moduleNumber}, document: ${documentName}, submodule: ${subModuleName}`,
    );
  }

  console.log(
    `[PROMPT] Building spec-driven prompt for ${submoduleSpec.code} - ${submoduleSpec.title}`,
  );

  // Determine micro-rule categories
  const microCategories = forceMicroCategories || submoduleSpec.micro_inject;
  const microRules = getRelevantMicroRules(microCategories);

  // Build prompt sections
  const blocks: string[] = [];

  // 1. System role and critical constraints
  blocks.push(buildSystemRole());

  // 2. Document identification
  blocks.push(
    buildDocumentIdentification(submoduleSpec, documentName, answers),
  );

  // 3. Specification requirements
  blocks.push(buildRequirementsSection(submoduleSpec));

  // 4. Document structure template
  blocks.push(buildStructureTemplate(moduleSpec));

  // 5. Content generation rules
  blocks.push(buildContentRules(submoduleSpec));

  // 6. Micro-rules injection
  if (microRules.size > 0) {
    blocks.push(buildMicroRulesSection(microRules, microCategories));
  }

  // 7. Section-specific guidance
  blocks.push(buildSectionGuidance(submoduleSpec, moduleSpec));

  // 8. User answers
  blocks.push(buildAnswersSection(answers));

  // 9. Output format and termination rules
  blocks.push(buildOutputRules());

  return blocks.join("\n\n");
}

// ============================================================================
// PROMPT SECTION BUILDERS
// ============================================================================

function buildSystemRole(): string {
  return `You are a deterministic Primus GFS v4.0 document generator for Modules 1–7.
You generate ONE complete audit-ready Standard Operating Procedure (SOP) per submodule.

CRITICAL OUTPUT REQUIREMENTS:
✓ Only the final SOP document text (plain text format)
✓ Complete content for all 15 sections (MANDATORY - no skipping - highest priority)
✓ Actual procedures with step-by-step instructions, not descriptions
✓ Specific values from provided answers
✓ Minimum 2500 words for comprehensive audit-ready content
✓ ALL requirements from the specification integrated naturally

AUDIT-READY PROCEDURAL REQUIREMENTS (CRITICAL):
⚡ Write SPECIFIC step-by-step procedures: "1. The FSM reviews... 2. If deficiency found... 3. Complete Form..."
⚡ Include SPECIFIC forms/documents: "Form FSM-TR-01", "Document #1.01-POL-001", "Checklist QA-AUD-05"
⚡ Use SPECIFIC frequencies: "Every Monday at 9:00 AM", "Within 24 hours of discovery", "Quarterly (Jan, Apr, Jul, Oct)"
⚡ Specify RESPONSIBLE parties: Use job titles consistently ("Food Safety Manager", "QA Supervisor", "Line Supervisor")
⚡ Include ACCEPTANCE criteria: "Training completion rate must be ≥95%", "Temperature must be ≤40°F"
⚡ Add DECISION points: "If X occurs, proceed to Section Y", "When criteria not met, initiate CAPA per Section 11"
⚡ Reference RECORD locations: "Records stored in SharePoint/Quality/Training", "Filed in QA Office Cabinet 3"
⚡ Generate realistic form numbers using pattern: {SECTION}-{TYPE}-{NUMBER} (e.g., "FSM-TR-01", "CAPA-INV-02")

CRITICAL RULE FOR LARGE SUBMODULES (15+ requirements):
⚡ Your PRIMARY goal is completing ALL 15 SECTIONS
⚡ Be thorough but efficient: 2-4 well-developed paragraphs per section
⚡ Do NOT make early sections excessively long at the expense of later sections
⚡ Distribute content evenly - complete coverage is more important than excessive detail
⚡ Section 8 (Procedures) should be comprehensive but concise - 1-2 paragraphs per requirement
⚡ BUDGET YOUR TOKENS: Reserve minimum 10,000 tokens for sections 9-15

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

IMPORTANT: Generate COMPLETE sections with substantial content.
Do NOT abbreviate or skip content. Each section must be fully developed with concrete details.`;
}

function buildDocumentIdentification(
  submoduleSpec: SubmoduleSpec,
  documentName: string | undefined,
  answers: Record<string, string | boolean | number | Date>,
): string {
  const companyName =
    answers.company_name || answers.org_name || "[Organization Name]";
  const facilityName = answers.facility_name || "[Facility Name]";
  const documentNumber = answers.document_number || `${submoduleSpec.code}-001`;
  const documentVersion = answers.document_version || "1.0";
  const effectiveDate =
    answers.effective_date || new Date().toISOString().split("T")[0];

  return `DOCUMENT IDENTIFICATION:
=================================
✓ DOCUMENT TYPE: Standard Operating Procedure
✓ PRIMUS GFS CODE: ${submoduleSpec.code}
✓ DOCUMENT TITLE: "${submoduleSpec.title}"
✓ DOCUMENT NAME: "${documentName || submoduleSpec.title}"
✓ MODULE: ${submoduleSpec.moduleName}
✓ ORGANIZATION: ${companyName}
✓ FACILITY: ${facilityName}
✓ DOCUMENT NUMBER: ${documentNumber}
✓ VERSION: ${documentVersion}
✓ EFFECTIVE DATE: ${effectiveDate}
✓ COMPLIANCE STANDARD: Primus GFS v4.0

TITLE FORMAT: Use exact title "${submoduleSpec.title}" - do not modify or abbreviate.`;
}

function buildRequirementsSection(submoduleSpec: SubmoduleSpec): string {
  const blocks: string[] = [
    "MANDATORY REQUIREMENTS FROM SPECIFICATION:",
    "=".repeat(80),
    `Submodule: ${submoduleSpec.code} - ${submoduleSpec.title}`,
    `Description: ${submoduleSpec.description}`,
    "",
    "YOU MUST INTEGRATE ALL REQUIREMENTS INTO THE DOCUMENT:",
    "",
  ];

  // Count requirements for optimization
  const requiredCount = submoduleSpec.requirements.filter(
    (r) => r.required,
  ).length;
  const isLarge = requiredCount > 15; // Large submodule optimization threshold
  const isVeryLarge = requiredCount > 20; // Extra large submodule - aggressive optimization

  // Add each requirement - use compact format for large submodules
  for (const req of submoduleSpec.requirements) {
    if (!req.required) continue; // Skip optional requirements

    blocks.push(`[${req.code}] ${req.text}`);

    if (isVeryLarge) {
      // Ultra-compact format for very large submodules - only show first 2 mandatory statements
      if (req.mandatoryStatements.length > 0) {
        const statementsToShow = req.mandatoryStatements.slice(0, 2);
        for (const statement of statementsToShow) {
          blocks.push(`  • ${statement}`);
        }
        if (req.mandatoryStatements.length > 2) {
          blocks.push(
            `  • (+${req.mandatoryStatements.length - 2} more - implement all)`,
          );
        }
      }
    } else if (isLarge) {
      // Compact format for large submodules - show first 3 mandatory statements
      if (req.mandatoryStatements.length > 0) {
        const statementsToShow = req.mandatoryStatements.slice(0, 3);
        for (const statement of statementsToShow) {
          blocks.push(`  • ${statement}`);
        }
        if (req.mandatoryStatements.length > 3) {
          blocks.push(
            `  • (+${req.mandatoryStatements.length - 3} more - implement all)`,
          );
        }
      }
    } else {
      // Full format for smaller submodules
      if (req.mandatoryStatements.length > 0) {
        for (const statement of req.mandatoryStatements) {
          blocks.push(`  • ${statement}`);
        }
      }
    }

    blocks.push("");
  }

  if (isVeryLarge) {
    blocks.push("");
    blocks.push(
      `CRITICAL: This submodule has ${requiredCount} requirements (very large module).`,
    );
    blocks.push(
      "For prompt efficiency, only 2 sample mandatory statements shown per requirement.",
    );
    blocks.push(
      "You MUST implement ALL mandatory statements for each requirement - not just the 2 samples.",
    );
    blocks.push(
      "Refer to the requirement text for complete implementation guidance.",
    );
    blocks.push("");
    blocks.push("EFFICIENCY REQUIREMENT: To fit all 15 sections:");
    blocks.push(
      "- Section 8 (Procedures): 1 paragraph per requirement (concise but complete)",
    );
    blocks.push("- Sections 9-14: 2-3 paragraphs each (focused content)");
    blocks.push(
      "- Distribute content evenly - DO NOT make Section 8 excessively long",
    );
  } else if (isLarge) {
    blocks.push("");
    blocks.push(
      `NOTE: This submodule has ${requiredCount} requirements. For brevity, only key mandatory statements shown above.`,
    );
    blocks.push(
      "You MUST implement ALL mandatory statements for each requirement, not just those listed.",
    );
    blocks.push(
      "Each requirement has been fully specified - refer to the requirement text for complete implementation guidance.",
    );
  }

  blocks.push("");
  blocks.push(
    "CRITICAL: Do NOT skip any requirement. Each one must appear with complete, detailed content.",
  );

  return blocks.join("\n");
}

function buildStructureTemplate(moduleSpec: ModuleSpec): string {
  const blocks: string[] = [
    "MANDATORY DOCUMENT STRUCTURE (15 SECTIONS):",
    "=".repeat(80),
    "ALL 15 SECTIONS MUST BE PRESENT. DO NOT SKIP ANY SECTION.",
    "",
  ];

  for (const section of moduleSpec.documentStructureTemplate.sections) {
    blocks.push(`${section.number}. ${section.title.toUpperCase()}`);
    blocks.push(`   Required: ${section.required ? "YES (MANDATORY)" : "NO"}`);
    blocks.push(`   Minimum Paragraphs: ${section.minParagraphs}`);
    blocks.push(`   Content Guidance: ${section.contentGuidance}`);
    blocks.push("");
  }

  return blocks.join("\n");
}

function buildContentRules(submoduleSpec: SubmoduleSpec): string {
  return `CONTENT GENERATION RULES:
=================================
1. REQUIREMENTS INTEGRATION:
   - Every requirement listed above MUST appear in the document
   - Integrate requirements into the appropriate sections (see section guidance below)
   - Preserve exact wording of mandatory statements
   - Use provided answers to make requirements organization-specific
   
2. COMPLETENESS:
   - Generate minimum 2500 words for comprehensive audit-ready content
   - Each section must have substantial content (${Math.max(3, Math.ceil(2500 / 15 / 50))} paragraphs minimum per section)
   - No placeholders, no "[TBD]", no "[FILL]"
   - Replace all variables with actual values from answers
   
3. BOOLEAN ANSWERS:
   - If a boolean answer is false: create a GAP STATEMENT + corrective action with timeline (<= 90 days) + interim controls
   - Document gaps transparently but professionally
   
4. SPECIFICITY:
   - Frequencies: use explicit units (e.g., "every 4 hours", "daily", "weekly")
   - Critical limits: numeric or clearly measurable statements
   - Roles: use specific position titles from answers or generic roles (e.g., "Food Safety Manager")
   
5. CAPA PROTOCOL:
   - Include trigger → containment → root cause → corrective → preventive → verification steps
${submoduleSpec.capaInject ? `   - MUST include: ${submoduleSpec.capaInject.join("; ")}` : ""}
   
6. TRACEABILITY:
${submoduleSpec.traceabilityInject ? `   - MUST include: ${submoduleSpec.traceabilityInject.join("; ")}` : "   - Document all record linkages and audit trails"}

7. CROSSWALK TABLE (Section 14):
   - List each requirement code with section number where fulfilled and brief evidence
   - Format: Primus Code | Requirement | Document Section | Evidence
   
8. NO HALLUCINATIONS:
   - Only use content from: specifications above + answers provided + standard SOP structure
   - No speculative claims, no invented data, no generic "best practices" not in spec`;
}

function buildMicroRulesSection(
  microRules: Map<string, MicroRules>,
  categories: string[],
): string {
  const blocks: string[] = [
    "ADDITIONAL MANDATORY COMPLIANCE REQUIREMENTS:",
    "=".repeat(80),
    `You MUST integrate ALL requirements from these micro-rule categories: ${categories.join(", ")}`,
    "DO NOT include requirements from any other categories.",
    "",
    "Integrate these requirements naturally into Section 8 (Procedures), Section 9 (Monitoring), or Section 11 (CAPA).",
    "DO NOT announce their inclusion. DO NOT add bracketed notes. Write them as if they were always part of the SOP.",
    "",
  ];

  for (const [category, rulesData] of microRules.entries()) {
    blocks.push(`${category.toUpperCase().replace(/_/g, " ")} REQUIREMENTS:`);
    blocks.push("-".repeat(80));
    const ruleTexts = Object.values(rulesData.rules);
    for (const ruleText of ruleTexts) {
      blocks.push(`• ${ruleText}`);
    }
    blocks.push("");
  }

  blocks.push(
    "CRITICAL: Integrate these requirements seamlessly into appropriate sections.",
  );
  blocks.push(
    "They must appear as natural SOP content, not as separately labeled additions.",
  );

  return blocks.join("\n");
}

function buildSectionGuidance(
  submoduleSpec: SubmoduleSpec,
  _moduleSpec: ModuleSpec,
): string {
  const requiredCount = submoduleSpec.requirements.filter(
    (r) => r.required,
  ).length;
  const isLarge = requiredCount > 15;
  const isVeryLarge = requiredCount > 20;

  const blocks: string[] = [
    "SECTION-SPECIFIC GUIDANCE:",
    "=".repeat(80),
    "",
    "⚡ CRITICAL: YOU MUST COMPLETE ALL 15 SECTIONS. Balance thoroughness with conciseness.",
    isVeryLarge
      ? "⚡ VERY LARGE MODULE: Prioritize efficiency - 1-2 paragraphs per requirement in Section 8."
      : "For large submodules, each section should be 2-4 well-developed paragraphs.",
    "⚡ Focus on completing ALL sections rather than making early sections excessively long.",
    "",
  ];

  // Provide streamlined guidance
  if (isVeryLarge) {
    blocks.push(
      `EFFICIENCY MODE: This submodule has ${requiredCount} requirements (very large).`,
    );
    blocks.push("To complete ALL 15 sections within token limit:");
    blocks.push(
      "1. Section 8 (Procedures): 1 concise paragraph per requirement (~600-800 words total)",
    );
    blocks.push(
      "2. Sections 9-14: 2-3 focused paragraphs each (~150-250 words per section)",
    );
    blocks.push(
      "3. NO excessive detail - comprehensive coverage is the priority",
    );
    blocks.push("4. Reserve minimum 8,000 tokens for sections 9-15");
    blocks.push("");
  } else if (isLarge) {
    blocks.push(
      `NOTE: This submodule has ${requiredCount} requirements. To ensure ALL 15 sections are completed:`,
    );
    blocks.push("1. Be thorough but concise (2-4 paragraphs per section)");
    blocks.push("2. Integrate requirements naturally into Sections 8-12");
    blocks.push(
      "3. Do NOT make Section 8 excessively long - distribute content across sections",
    );
    blocks.push(
      "4. PRIORITIZE completing all sections over excessive detail in any one section",
    );
    blocks.push("");
  }

  // Streamlined section guidance
  blocks.push(
    `SECTION 1: Title "${submoduleSpec.title}", Code ${submoduleSpec.code}, metadata from answers`,
  );
  blocks.push("");
  blocks.push(
    `SECTION 2: Purpose: ${submoduleSpec.description?.slice(0, 100)}...`,
  );
  blocks.push("");
  blocks.push(
    `SECTION 3: Scope: ${submoduleSpec.appliesTo?.slice(0, 3).join(", ")}${submoduleSpec.appliesTo.length > 3 ? ", etc." : ""}`,
  );
  blocks.push("");
  blocks.push(
    "SECTIONS 4-7: Definitions, Roles, Prerequisites, Hazard Analysis - Standard SOP format, concise",
  );
  blocks.push("");

  // Section 8: Procedures (main requirements)
  blocks.push(
    `SECTION 8: PROCEDURES - Integrate ALL ${requiredCount} requirements`,
  );
  if (isVeryLarge) {
    blocks.push(
      `List requirements concisely: ${submoduleSpec.requirements
        .filter((r) => r.required)
        .slice(0, 5)
        .map((r) => r.code)
        .join(", ")}, ... (all ${requiredCount})`,
    );
    blocks.push(
      "Format: 1 paragraph per requirement, ~50-70 words each. Total Section 8: ~600-800 words.",
    );
  } else if (isLarge) {
    blocks.push(
      `Requirements: ${submoduleSpec.requirements
        .filter((r) => r.required)
        .map((r) => r.code)
        .join(", ")}`,
    );
    blocks.push(
      "Format: 1-2 paragraphs per requirement. Be efficient but complete.",
    );
  }
  blocks.push("");

  // Section 9: Monitoring
  blocks.push(
    `SECTION 9: MONITORING PLAN - Specific monitoring procedures for each requirement`,
  );
  const monitoringCount = submoduleSpec.requirements.filter(
    (r) => r.required && r.monitoringExpectations,
  ).length;
  blocks.push(
    `${monitoringCount} requirements need monitoring. For EACH, specify:`,
  );
  blocks.push(`- WHO monitors (specific job title)`);
  blocks.push(
    `- WHEN (specific frequency: "Daily at 8 AM", "Every Monday", "Within 24 hours")`,
  );
  blocks.push(
    `- HOW (method: "Visual inspection using Checklist MON-01", "Review Form XYZ")`,
  );
  blocks.push(
    `- WHAT form/record used (generate realistic form numbers like MON-TR-01, MON-AUD-02)`,
  );
  blocks.push(
    `- ACCEPTANCE criteria ("≥95% completion", "No deficiencies", "Within limits")`,
  );
  blocks.push(
    `- WHAT happens if criteria not met ("Initiate CAPA per Section 11")`,
  );
  blocks.push("");

  // Section 10: Verification
  blocks.push(
    `SECTION 10: VERIFICATION & VALIDATION ACTIVITIES - Independent checks of monitoring effectiveness`,
  );
  const verificationCount = submoduleSpec.requirements.filter(
    (r) => r.required && r.verificationExpectations,
  ).length;
  blocks.push(
    `${verificationCount} requirements need verification. For EACH, specify:`,
  );
  blocks.push(
    `- Verification method: "Internal audit using Checklist VER-01", "Management review of reports"`,
  );
  blocks.push(
    `- Frequency: "Quarterly", "Semi-annually", "Annually on [specific month]"`,
  );
  blocks.push(
    `- Responsible party: Specific job title ("QA Manager", "Internal Auditor")`,
  );
  blocks.push(
    `- Records generated: "Audit Report VER-AUD-01", "Validation Study Report VER-VAL-01"`,
  );
  blocks.push(
    `- Record retention period: "3 years", "5 years", "Life of facility"`,
  );
  blocks.push("");

  // Section 11: CAPA
  blocks.push(
    `SECTION 11: CORRECTIVE & PREVENTIVE ACTION (CAPA) PROTOCOL - Step-by-step procedures`,
  );
  blocks.push(`Use this format (be SPECIFIC):`);
  blocks.push(
    `1. TRIGGERS: List specific triggers ("Monitoring failure", "Audit finding", "Customer complaint")`,
  );
  blocks.push(
    `2. INITIATION: "Within X hours, [Job Title] completes Form CAPA-INIT-01"`,
  );
  blocks.push(
    `3. INVESTIGATION: "[Job Title] conducts root cause analysis using 5-Why or Fishbone method within Y days"`,
  );
  blocks.push(
    `4. CORRECTIVE ACTIONS: "Immediate actions documented on Form CAPA-CORR-01 within Z hours"`,
  );
  blocks.push(
    `5. PREVENTIVE ACTIONS: "Long-term actions to prevent recurrence, documented with timelines"`,
  );
  blocks.push(
    `6. VERIFICATION: "QA Manager verifies effectiveness within [timeframe] using [method]"`,
  );
  blocks.push(
    `7. CLOSURE: "CAPA closed by [Job Title] when verified effective, filed in [location]"`,
  );
  if (submoduleSpec.capaInject && submoduleSpec.capaInject.length > 0) {
    blocks.push(
      `Include ${Math.min(submoduleSpec.capaInject.length, 5)} specific CAPA scenarios from spec`,
    );
  }
  blocks.push("");

  // Section 12: Traceability
  blocks.push(
    `SECTION 12: TRACEABILITY - Lot codes, record linkages, recall procedures`,
  );
  if (
    submoduleSpec.traceabilityInject &&
    submoduleSpec.traceabilityInject.length > 0
  ) {
    blocks.push(
      `Include ${Math.min(submoduleSpec.traceabilityInject.length, 5)} key traceability requirements`,
    );
  }
  blocks.push("");

  // Sections 13-15
  blocks.push("SECTION 13: RECORD RETENTION & DOCUMENT CONTROL");
  blocks.push(
    "Create a detailed table with columns: Record Type | Form Number | Retention Period | Storage Location | Responsible Party",
  );
  blocks.push(
    "Examples: 'Training Records | FSM-TR-01 | 2 years | SharePoint/Quality/Training | Food Safety Manager'",
  );
  blocks.push(
    "Include ALL records generated by procedures in Sections 8-11 (monitoring forms, audit reports, CAPA records, etc.)",
  );
  blocks.push("");
  blocks.push("SECTION 14: COMPLIANCE CROSSWALK TABLE");
  blocks.push(
    "Format as table: Primus Code | Requirement | Section Reference | Evidence/Form Number",
  );
  blocks.push(
    "Example: '1.01.01 | Food Safety Policy | Section 2, 8 | Document FSM-POL-001, Form FSM-REV-01'",
  );
  blocks.push("Include ALL Primus GFS requirements from this submodule");
  blocks.push("");
  blocks.push(
    "SECTION 15: REVISION HISTORY & APPROVAL SIGNATURES - Table with Version, Date, Description + 3 signature lines",
  );
  blocks.push("");

  blocks.push(
    "⚡ FINAL REMINDER: Complete ALL 15 sections. Do not stop at Section 8. Reserve tokens for sections 9-15.",
  );

  return blocks.join("\n");
}

function buildAnswersSection(
  answers: Record<string, string | boolean | number | Date>,
): string {
  const blocks: string[] = [
    "ORGANIZATION-SPECIFIC ANSWERS:",
    "=".repeat(80),
    "Use these answers to populate the document with organization-specific information.",
    "Replace generic placeholders with actual values from answers below.",
    "",
    JSON.stringify(answers, null, 2),
    "",
  ];

  return blocks.join("\n");
}

function buildOutputRules(): string {
  return `CRITICAL OUTPUT TERMINATION RULES:
=================================
⚡ DO NOT STOP AFTER SECTION 8 (PROCEDURES)
⚡ YOU MUST GENERATE ALL 15 SECTIONS IN ORDER

If you complete Section 8 and have limited tokens remaining:
- Make sections 9-15 MORE CONCISE (2-3 paragraphs each)
- But DO NOT SKIP any section
- Complete all 15 sections before adding signatures

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

CORRECT FORMAT EXAMPLE (with Markdown formatting):
### 1.01.01 - Food Safety Policy Documentation

**Requirement:** A documented food safety policy detailing company's commitment to food safety
**Implementation Status:** Yes

The purpose of this Standard Operating Procedure...

INCORRECT FORMAT (DO NOT USE):
Plain text without formatting (lacks structure for Word conversion)

Your response MUST end exactly at the signature lines. Generate nothing after that point.
=================================

FORMATTING GUIDELINES:
=================================
✓ USE Markdown for proper formatting (will be converted to DOCX)
✓ Headers: Use ### for requirement subsections (e.g., "### 1.01.01 - Food Safety Policy")
✓ Bold: Use **text** for emphasis (e.g., "**Requirement:**", "**Implementation Status:**")
✓ Lists: Use standard list formatting ("- Item" or "1. Item")
✓ This Markdown will be automatically converted to proper Word formatting

Generate the final SOP document now. Output ONLY the complete document text with no preamble, no meta-commentary, no explanations. Start with the title and end with the approval signatures.`;
}

// ============================================================================
// LEGACY COMPATIBILITY FUNCTION
// ============================================================================

/**
 * Legacy function for backward compatibility
 * New code should use buildSpecDrivenPrompt instead
 */
export function buildFillTemplatePromptLegacy(
  moduleNumber: string,
  answers: Record<string, string | boolean | number | Date>,
  documentName?: string,
  subModuleName?: string,
): string {
  console.warn(
    "[PROMPT] Using legacy buildFillTemplatePromptLegacy. Consider migrating to buildSpecDrivenPrompt.",
  );

  try {
    return buildSpecDrivenPrompt(
      moduleNumber,
      answers,
      documentName,
      subModuleName,
    );
  } catch (error) {
    console.error(
      "[PROMPT] Spec-driven prompt failed, cannot generate document:",
      error,
    );
    throw error;
  }
}
