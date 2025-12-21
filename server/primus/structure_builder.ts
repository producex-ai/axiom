/**
 * Deterministic Document Structure Builder
 *
 * Generates complete audit-ready Primus GFS documents from specifications alone,
 * eliminating dependency on external templates.
 *
 * This module builds the 15-section document structure with content guidance
 * injected directly from module and submodule specifications.
 */

import {
  findSubmoduleSpecByName,
  getRelevantMicroRules,
  loadModuleSpec,
  type MicroRules,
  type ModuleSpec,
  type SubmoduleSpec,
} from "./loader";

import type { SectionTemplate } from "./types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DocumentStructureOptions {
  moduleNumber: string;
  subModuleName?: string;
  documentName?: string;
  answers?: Record<string, string | boolean | number | Date>;
}

export interface StructureSection extends SectionTemplate {
  requiredContent: string[];
}

// ============================================================================
// MAIN STRUCTURE BUILDER
// ============================================================================

/**
 * Build deterministic 15-section document structure from specifications
 * Returns a structured template with all required guidance embedded
 * NO dependency on external S3 templates
 */
export function buildDeterministicStructure(
  options: DocumentStructureOptions,
): string {
  const { moduleNumber, subModuleName, documentName, answers } = options;

  console.log(
    `[STRUCTURE] Building deterministic structure for Module ${moduleNumber}, Submodule: ${subModuleName || "N/A"}`,
  );

  // Load specifications
  const moduleSpec = loadModuleSpec(moduleNumber);
  const submoduleSpec = findSubmoduleSpecByName(
    moduleNumber,
    documentName,
    subModuleName,
  );

  // Get micro-rule categories to inject
  const microCategories = submoduleSpec?.micro_inject || [];
  const microRules = getRelevantMicroRules(microCategories);

  // Build structured sections
  const sections = buildStructuredSections(
    moduleSpec,
    submoduleSpec,
    microRules,
    answers,
  );

  // Assemble final structure
  return assembleStructure(sections, moduleSpec, submoduleSpec, answers);
}

/**
 * Build each of the 15 sections with specific content guidance
 */
function buildStructuredSections(
  moduleSpec: ModuleSpec,
  submoduleSpec: SubmoduleSpec | null,
  microRules: Map<string, MicroRules>,
  answers?: Record<string, string | boolean | number | Date>,
): StructureSection[] {
  const sections: StructureSection[] = [];

  for (const sectionTemplate of moduleSpec.documentStructureTemplate.sections) {
    const section: StructureSection = {
      number: sectionTemplate.number,
      title: sectionTemplate.title,
      required: sectionTemplate.required,
      minParagraphs: sectionTemplate.minParagraphs,
      contentGuidance: sectionTemplate.contentGuidance,
      requiredContent: [],
    };

    // Inject section-specific required content
    switch (sectionTemplate.number) {
      case 1: // Title & Document Control
        section.requiredContent = buildTitleSection(submoduleSpec, answers);
        break;
      case 2: // Purpose / Objective
        section.requiredContent = buildPurposeSection(submoduleSpec);
        break;
      case 3: // Scope
        section.requiredContent = buildScopeSection(submoduleSpec);
        break;
      case 7: // Hazard / Risk Analysis
        section.requiredContent = buildHazardSection(submoduleSpec, moduleSpec);
        break;
      case 8: // Procedures
        section.requiredContent = buildProceduresSection(
          submoduleSpec,
          microRules,
        );
        break;
      case 9: // Monitoring Plan
        section.requiredContent = buildMonitoringSection(submoduleSpec);
        break;
      case 10: // Verification & Validation
        section.requiredContent = buildVerificationSection(submoduleSpec);
        break;
      case 11: // CAPA Protocol
        section.requiredContent = buildCAPASection(submoduleSpec);
        break;
      case 12: // Traceability & Recall
        section.requiredContent = buildTraceabilitySection(submoduleSpec);
        break;
    }

    sections.push(section);
  }

  return sections;
}

/**
 * Assemble final document structure with all sections
 */
function assembleStructure(
  sections: StructureSection[],
  moduleSpec: ModuleSpec,
  submoduleSpec: SubmoduleSpec | null,
  answers?: Record<string, string | boolean | number | Date>,
): string {
  const blocks: string[] = [];

  // Document header
  blocks.push("=".repeat(80));
  blocks.push("PRIMUS GFS v4.0 DOCUMENT STRUCTURE");
  blocks.push(`Module: ${moduleSpec.moduleName}`);
  if (submoduleSpec) {
    blocks.push(`Submodule: ${submoduleSpec.code} - ${submoduleSpec.title}`);
  }
  blocks.push("=".repeat(80));
  blocks.push("");

  // Each section
  for (const section of sections) {
    blocks.push(`${section.number}. ${section.title.toUpperCase()}`);
    blocks.push("=".repeat(80));
    blocks.push("");
    blocks.push(`[Content Guidance: ${section.contentGuidance}]`);
    blocks.push(`[Minimum Paragraphs: ${section.minParagraphs}]`);
    blocks.push("");

    if (section.requiredContent.length > 0) {
      blocks.push("[REQUIRED CONTENT TO INCLUDE:]");
      for (const content of section.requiredContent) {
        blocks.push(`- ${content}`);
      }
      blocks.push("");
    }

    blocks.push("[Generate comprehensive content for this section now]");
    blocks.push("");
    blocks.push("");
  }

  return blocks.join("\n");
}

// ============================================================================
// SECTION-SPECIFIC BUILDERS
// ============================================================================

function buildTitleSection(
  submoduleSpec: SubmoduleSpec | null,
  answers?: Record<string, string | boolean | number | Date>,
): string[] {
  const content: string[] = [];

  if (submoduleSpec) {
    content.push(`Document Title: ${submoduleSpec.title}`);
    content.push(`Document Code: ${submoduleSpec.code}`);
  }

  if (answers) {
    if (answers.document_number)
      content.push(`Document Number: ${answers.document_number}`);
    if (answers.document_version)
      content.push(`Version: ${answers.document_version}`);
    if (answers.effective_date)
      content.push(`Effective Date: ${answers.effective_date}`);
    if (answers.approved_by)
      content.push(`Approved By: ${answers.approved_by}`);
  }

  return content;
}

function buildPurposeSection(submoduleSpec: SubmoduleSpec | null): string[] {
  const content: string[] = [];

  if (submoduleSpec) {
    content.push(`Purpose: ${submoduleSpec.description}`);
    content.push(`Compliance Standard: Primus GFS v4.0`);
  }

  return content;
}

function buildScopeSection(submoduleSpec: SubmoduleSpec | null): string[] {
  const content: string[] = [];

  if (submoduleSpec && submoduleSpec.appliesTo) {
    content.push(`Applies To: ${submoduleSpec.appliesTo.join(", ")}`);
  }

  return content;
}

function buildHazardSection(
  submoduleSpec: SubmoduleSpec | null,
  moduleSpec: ModuleSpec,
): string[] {
  const content: string[] = [];

  content.push(`Hazard types relevant to ${moduleSpec.moduleName}:`);
  content.push("- Biological hazards (if applicable)");
  content.push("- Chemical hazards (if applicable)");
  content.push("- Physical hazards (if applicable)");

  if (submoduleSpec) {
    content.push(`Specific risks for ${submoduleSpec.title} must be analyzed`);
  }

  return content;
}

function buildProceduresSection(
  submoduleSpec: SubmoduleSpec | null,
  microRules: Map<string, MicroRules>,
): string[] {
  const content: string[] = [];

  if (submoduleSpec) {
    content.push(`Core Procedures for ${submoduleSpec.title}:`);

    // Add all requirements as procedure steps
    for (const req of submoduleSpec.requirements) {
      if (req.required) {
        content.push(`[${req.code}] ${req.text}`);

        // Add mandatory statements
        for (const statement of req.mandatoryStatements) {
          content.push(`  → ${statement}`);
        }
      }
    }
  }

  // Add micro-rules
  if (microRules.size > 0) {
    content.push("");
    content.push("[Additional Mandatory Requirements:]");

    for (const [category, rules] of microRules.entries()) {
      for (const [ruleId, ruleText] of Object.entries(rules.rules)) {
        content.push(`[${category}/${ruleId}] ${ruleText}`);
      }
    }
  }

  return content;
}

function buildMonitoringSection(submoduleSpec: SubmoduleSpec | null): string[] {
  const content: string[] = [];

  if (submoduleSpec) {
    for (const req of submoduleSpec.requirements) {
      if (req.required && req.monitoringExpectations) {
        content.push(`[${req.code}] Monitoring: ${req.monitoringExpectations}`);
      }
    }
  }

  return content;
}

function buildVerificationSection(
  submoduleSpec: SubmoduleSpec | null,
): string[] {
  const content: string[] = [];

  if (submoduleSpec) {
    for (const req of submoduleSpec.requirements) {
      if (req.required && req.verificationExpectations) {
        content.push(
          `[${req.code}] Verification: ${req.verificationExpectations}`,
        );
      }
    }
  }

  return content;
}

function buildCAPASection(submoduleSpec: SubmoduleSpec | null): string[] {
  const content: string[] = [];

  if (submoduleSpec && submoduleSpec.capaInject) {
    content.push("CAPA Triggers and Protocols:");
    for (const capaItem of submoduleSpec.capaInject) {
      content.push(`- ${capaItem}`);
    }
  }

  return content;
}

function buildTraceabilitySection(
  submoduleSpec: SubmoduleSpec | null,
): string[] {
  const content: string[] = [];

  if (submoduleSpec && submoduleSpec.traceabilityInject) {
    content.push("Traceability Requirements:");
    for (const traceItem of submoduleSpec.traceabilityInject) {
      content.push(`- ${traceItem}`);
    }
  }

  return content;
}

/**
 * Generate human-readable requirements list for LLM prompt
 */
export function buildRequirementsList(
  moduleNumber: string,
  subModuleName?: string,
  documentName?: string,
): string {
  const moduleSpec = loadModuleSpec(moduleNumber);
  const submoduleSpec = findSubmoduleSpecByName(
    moduleNumber,
    documentName,
    subModuleName,
  );

  const blocks: string[] = [];

  blocks.push(`MODULE: ${moduleSpec.moduleName}`);
  blocks.push("");

  if (submoduleSpec) {
    blocks.push(`SUBMODULE: ${submoduleSpec.code} - ${submoduleSpec.title}`);
    blocks.push(`Description: ${submoduleSpec.description}`);
    blocks.push("");
    blocks.push("MANDATORY REQUIREMENTS:");
    blocks.push("=".repeat(80));

    for (const req of submoduleSpec.requirements) {
      if (req.required) {
        blocks.push(`\n[${req.code}] ${req.text}`);
        blocks.push("Mandatory Statements:");
        for (const statement of req.mandatoryStatements) {
          blocks.push(`  - ${statement}`);
        }
        blocks.push(`Monitoring: ${req.monitoringExpectations}`);
        blocks.push(`Verification: ${req.verificationExpectations}`);
      }
    }
  }

  return blocks.join("\n");
}
