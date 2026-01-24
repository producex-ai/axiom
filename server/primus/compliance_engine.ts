/**
 * Primus GFS Compliance Engine
 * Accurate crosswalk generation and compliance linting
 * NOW SUPPORTS: JSON-driven requirements from submodule specifications
 */

import {
  type ChecklistRequirement,
  findSubmoduleSpecByName,
  getAllRequirements,
  getRelevantMicroRules,
  loadModuleChecklist,
  type MicroRules,
} from "./loader";

import type {
  ComplianceLintIssue,
  ComplianceLintReport,
  CrosswalkEntry,
  CrosswalkReport,
} from "./types";

// Re-export types for consumers
export type {
  CrosswalkEntry,
  CrosswalkReport,
  ComplianceLintIssue,
  ComplianceLintReport,
};

// ============================================================================
// CROSSWALK GENERATION
// ============================================================================

/**
 * Generate accurate crosswalk by keyword matching in document
 * Returns GAP entries for requirements not found
 * NEW: Supports submodule specification-based requirements
 */
export function generateCrosswalk(
  document: string,
  moduleNumber: string,
  documentName?: string,
  subModuleName?: string,
): CrosswalkReport {
  let requirements: ChecklistRequirement[] = [];
  let moduleName = `Module ${moduleNumber}`;

  // Try to load submodule specification first
  try {
    const submoduleSpec = findSubmoduleSpecByName(
      moduleNumber,
      documentName,
      subModuleName,
    );
    if (submoduleSpec) {
      console.log(
        `[CROSSWALK] Using submodule spec: ${submoduleSpec.code} - ${submoduleSpec.title}`,
      );
      moduleName = submoduleSpec.title;
      // Convert SubmoduleRequirement to ChecklistRequirement format
      requirements = submoduleSpec.requirements.map((req) => ({
        code: req.code,
        description: req.text || (req as any).question || req.code,
        mandatory: req.required,
        keywords: req.keywords || [],
      }));
    }
  } catch {
    console.warn(
      "[CROSSWALK] Submodule spec not found, using checklist fallback",
    );
  }

  // Fallback to module checklist if no spec found
  if (requirements.length === 0) {
    const checklist = loadModuleChecklist(moduleNumber);
    requirements = getAllRequirements(moduleNumber);
    moduleName = checklist.moduleName;
  }

  const entries: CrosswalkEntry[] = [];

  // Normalize document for searching (lowercase, preserve structure)
  const docLower = document.toLowerCase();
  const docLines = document.split("\n");

  for (const requirement of requirements) {
    const match = findRequirementInDocument(requirement, docLower, docLines);
    entries.push(match);
  }

  const fulfilledCount = entries.filter((e) => e.status === "FULFILLED").length;
  const gapCount = entries.filter((e) => e.status === "GAP").length;

  return {
    moduleNumber,
    moduleName,
    generatedDate: new Date().toISOString(),
    totalRequirements: requirements.length,
    fulfilledCount,
    gapCount,
    entries,
  };
}

/**
 * Find requirement in document using keyword matching
 */
function findRequirementInDocument(
  requirement: ChecklistRequirement,
  docLower: string,
  docLines: string[],
): CrosswalkEntry {
  // Try to match each keyword
  const matchedKeywords: string[] = [];
  const matchedSections: string[] = [];

  for (const keyword of requirement.keywords) {
    const kwLower = keyword.toLowerCase();
    if (docLower.includes(kwLower)) {
      matchedKeywords.push(keyword);

      // Find section where keyword appears
      const section = findSectionForKeyword(docLines, kwLower);
      if (section && !matchedSections.includes(section)) {
        matchedSections.push(section);
      }
    }
  }

  // Requirement fulfilled if at least 2 keywords matched (or 1 if only 1-2 keywords total)
  const threshold = requirement.keywords.length <= 2 ? 1 : 2;
  const isFulfilled = matchedKeywords.length >= threshold;

  if (isFulfilled) {
    const evidence = extractEvidenceText(
      docLines,
      matchedKeywords[0].toLowerCase(),
    );
    return {
      requirementCode: requirement.code,
      requirementDescription: requirement.description,
      mandatory: requirement.mandatory,
      documentSection: matchedSections.join(", ") || "Multiple sections",
      evidence: evidence || `Keywords found: ${matchedKeywords.join(", ")}`,
      status: "FULFILLED",
    };
  } else {
    // GAP detected
    return {
      requirementCode: requirement.code,
      requirementDescription: requirement.description,
      mandatory: requirement.mandatory,
      documentSection: null,
      evidence: requirement.mandatory
        ? "GAP: Mandatory requirement not addressed. Must be implemented within 30 days."
        : "GAP: Optional requirement not addressed. Consider implementation for enhanced compliance.",
      status: "GAP",
    };
  }
}

/**
 * Find section heading where keyword appears
 */
function findSectionForKeyword(
  docLines: string[],
  keyword: string,
): string | null {
  let currentSection: string | null = null;

  for (const line of docLines) {
    const lineLower = line.toLowerCase();

    // Detect section headers (lines with numbers like "8.", "8.1", or "====" delimiters)
    if (/^\d+\./.test(line.trim()) || /^={10,}/.test(line)) {
      const match = line.match(/^\d+\.\s*(.+)/);
      if (match) {
        currentSection = match[1].trim();
      }
    }

    // If keyword found in current section
    if (lineLower.includes(keyword) && currentSection) {
      return currentSection;
    }
  }

  return null;
}

/**
 * Extract evidence text (1-2 sentences) around keyword
 */
function extractEvidenceText(
  docLines: string[],
  keyword: string,
): string | null {
  for (let i = 0; i < docLines.length; i++) {
    const lineLower = docLines[i].toLowerCase();
    if (lineLower.includes(keyword)) {
      // Extract current line + next line as evidence
      const evidence = [docLines[i].trim()];
      if (i + 1 < docLines.length && docLines[i + 1].trim()) {
        evidence.push(docLines[i + 1].trim());
      }
      return (
        evidence.join(" ").slice(0, 200) +
        (evidence.join(" ").length > 200 ? "..." : "")
      );
    }
  }
  return null;
}

/**
 * Format crosswalk report as table for document insertion
 */
export function formatCrosswalkTable(crosswalk: CrosswalkReport): string {
  const header = `Primus Code | Requirement | Document Section | Evidence\n${"=".repeat(120)}`;

  const rows = crosswalk.entries.map((entry) => {
    const section = entry.documentSection || "GAP";
    const evidence = entry.evidence.replace(/\n/g, " ").slice(0, 80);
    return `${entry.requirementCode} | ${entry.requirementDescription.slice(0, 50)}... | ${section} | ${evidence}`;
  });

  return [header, ...rows].join("\n");
}

// ============================================================================
// COMPLIANCE LINTING
// ============================================================================

/**
 * Lint document for missing micro-requirements
 * Automatically detects and can auto-correct missing content
 * Only checks rules from specified categories to prevent cross-contamination
 */
export function lintCompliance(
  document: string,
  relevantCategories: string[],
  autoCorrect: boolean = false,
): ComplianceLintReport {
  const docLower = document.toLowerCase();
  const issues: ComplianceLintIssue[] = [];

  // Load only relevant micro-rules for specified categories
  const relevantRules = getRelevantMicroRules(relevantCategories);

  // Check each micro-rule category (only those specified)
  for (const [category, microRules] of relevantRules.entries()) {
    for (const [ruleId, ruleText] of Object.entries(microRules.rules)) {
      const found = checkRuleInDocument(ruleText, docLower);

      if (!found) {
        issues.push({
          ruleId,
          ruleText,
          category,
          found: false,
          suggestedInsertion: ruleText,
          insertAfterSection: mapCategoryToSection(category),
        });
      }
    }
  }

  const missingRulesCount = issues.length;
  let correctedDocument: string | undefined;

  if (autoCorrect && missingRulesCount > 0) {
    correctedDocument = autoCorrectDocument(document, issues);
  }

  return {
    totalRulesChecked: Array.from(relevantRules.values()).reduce(
      (sum: number, mr: MicroRules) => sum + Object.keys(mr.rules).length,
      0,
    ),
    missingRulesCount,
    issues,
    correctedDocument,
  };
}

/**
 * Check if rule requirement is present in document
 * Uses fuzzy matching for key phrases
 */
function checkRuleInDocument(ruleText: string, docLower: string): boolean {
  // Extract key phrases from rule text (phrases with 3+ words)
  const keyPhrases = extractKeyPhrases(ruleText);

  // Rule is present if at least 50% of key phrases found
  const threshold = Math.ceil(keyPhrases.length * 0.5);
  const matchedCount = keyPhrases.filter((phrase) =>
    docLower.includes(phrase.toLowerCase()),
  ).length;

  return matchedCount >= threshold;
}

/**
 * Extract key phrases from rule text
 */
function extractKeyPhrases(text: string): string[] {
  // Simple extraction: look for quoted phrases or capitalize words
  const quoted = text.match(/"([^"]+)"/g);
  if (quoted) {
    return quoted.map((q) => q.replace(/"/g, ""));
  }

  // Fallback: split on punctuation and take phrases with 3+ words
  const sentences = text.split(/[.;]/).filter((s) => s.trim().length > 0);
  const phrases: string[] = [];

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    if (words.length >= 3) {
      // Take first 5 words as key phrase
      phrases.push(words.slice(0, 5).join(" "));
    }
  }

  return phrases.slice(0, 3); // Max 3 key phrases per rule
}

/**
 * Map micro-rule category to appropriate document section for insertion
 */
function mapCategoryToSection(category: string): string {
  const sectionMap: Record<string, string> = {
    pest: "8. Procedures",
    chemical: "8. Procedures",
    document_control: "8. Procedures",
    glass_brittle_plastic: "8. Procedures",
    haccp: "8. Procedures",
    traceability: "12. Traceability & Recall Elements",
    allergen: "8. Procedures",
  };

  return sectionMap[category] || "8. Procedures";
}

/**
 * Auto-correct document by inserting missing micro-rules
 */
function autoCorrectDocument(
  document: string,
  issues: ComplianceLintIssue[],
): string {
  let corrected = document;

  // Group issues by insert location
  const issuesBySection = new Map<string, ComplianceLintIssue[]>();

  for (const issue of issues) {
    const section = issue.insertAfterSection || "8. Procedures";
    if (!issuesBySection.has(section)) {
      issuesBySection.set(section, []);
    }
    issuesBySection.get(section)!.push(issue);
  }

  // Insert missing content after each section
  for (const [section, sectionIssues] of issuesBySection.entries()) {
    const insertionText = buildInsertionText(section, sectionIssues);
    corrected = insertAfterSection(corrected, section, insertionText);
  }

  return corrected;
}

/**
 * Build insertion text for missing rules
 * COMPLETELY SILENT: Integrate rules as natural SOP content with NO category headers
 */
function buildInsertionText(
  section: string,
  issues: ComplianceLintIssue[],
): string {
  const blocks: string[] = [];

  // Group by category but DON'T add category headers
  const categoryGroups = new Map<string, ComplianceLintIssue[]>();

  for (const issue of issues) {
    if (!categoryGroups.has(issue.category)) {
      categoryGroups.set(issue.category, []);
    }
    categoryGroups.get(issue.category)!.push(issue);
  }

  // Inject requirements as plain bullet points without ANY headers
  // This makes them appear as natural procedure steps
  for (const [, categoryIssues] of categoryGroups.entries()) {
    for (const issue of categoryIssues) {
      // Add as simple list item that blends into the section
      blocks.push(`\n- ${issue.ruleText}`);
    }
  }

  return blocks.join("");
}

/**
 * Insert text after a section in document
 * CRITICAL: Never insert after Section 15 (signatures)
 */
function insertAfterSection(
  document: string,
  section: string,
  insertionText: string,
): string {
  const lines = document.split("\n");
  let insertIndex = -1;

  // Find section header
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(section)) {
      // Find next section or end of current section
      insertIndex = i + 1;
      while (insertIndex < lines.length) {
        const line = lines[insertIndex];
        // Stop if we hit another section header or separator
        if (/^\d+\./.test(line.trim()) || /^={10,}/.test(line)) {
          break;
        }
        // CRITICAL: Stop if we hit signatures (never insert after signatures)
        if (/Approved\s+By:|Prepared\s+By:|Reviewed\s+By:/i.test(line)) {
          console.warn(
            `[LINT] ⚠️ Attempted to insert after signatures. Skipping insertion.`,
          );
          return document; // Return unchanged
        }
        insertIndex++;
      }
      break;
    }
  }

  if (insertIndex === -1) {
    // Section not found - DO NOT append at end (prevents post-signature insertion)
    console.warn(
      `[LINT] ⚠️ Section "${section}" not found. Skipping insertion to prevent post-signature content.`,
    );
    return document; // Return unchanged
  }

  // SAFETY CHECK: Verify we're not inserting after section 15
  const remainingDoc = lines.slice(insertIndex).join("\n");
  if (
    /15\.\s*Revision\s+History|Approved\s+By:/i.test(remainingDoc.slice(0, 500))
  ) {
    console.warn(`[LINT] ⚠️ Would insert too close to signatures. Skipping.`);
    return document;
  }

  // Insert text at found position
  lines.splice(insertIndex, 0, insertionText);
  return lines.join("\n");
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate document has all mandatory sections
 */
export function validateMandatoryStructure(document: string): {
  valid: boolean;
  missingSections: string[];
} {
  const requiredSections = [
    "Title & Document Control",
    "Purpose / Objective",
    "Scope",
    "Procedures",
    "Monitoring Plan",
    "Verification & Validation",
    "Corrective & Preventive Action",
    "Traceability",
    "Record Retention",
    "Compliance Crosswalk",
    "Revision History",
  ];

  const docLower = document.toLowerCase();
  const missingSections: string[] = [];

  for (const section of requiredSections) {
    if (!docLower.includes(section.toLowerCase())) {
      missingSections.push(section);
    }
  }

  return {
    valid: missingSections.length === 0,
    missingSections,
  };
}

/**
 * Count placeholder remaining in document
 */
export function countPlaceholders(document: string): number {
  const placeholderPattern = /\{\{[^}]+\}\}|\[FILL\]|\[TBD\]|\[TODO\]/gi;
  const matches = document.match(placeholderPattern);
  return matches ? matches.length : 0;
}

/**
 * Generate compliance summary
 * NEW: Supports submodule specification-based requirements
 */
export function generateComplianceSummary(
  document: string,
  moduleNumber: string,
  subModuleName?: string,
  relevantCategories?: string[],
  documentName?: string,
): {
  crosswalk: CrosswalkReport;
  lint: ComplianceLintReport;
  structure: { valid: boolean; missingSections: string[] };
  placeholders: number;
  overallScore: number; // 0-100
} {
  const crosswalk = generateCrosswalk(
    document,
    moduleNumber,
    documentName,
    subModuleName,
  );

  // Use provided categories or fallback to empty array (no linting)
  const categoriesToLint = relevantCategories || [];
  const lint = lintCompliance(document, categoriesToLint, false);

  const structure = validateMandatoryStructure(document);
  const placeholders = countPlaceholders(document);

  // Calculate overall score
  const crosswalkScore =
    (crosswalk.fulfilledCount / crosswalk.totalRequirements) * 40;
  const lintScore =
    lint.missingRulesCount === 0
      ? 30
      : Math.max(0, 30 - lint.missingRulesCount * 2);
  const structureScore = structure.valid
    ? 20
    : Math.max(0, 20 - structure.missingSections.length * 5);
  const placeholderScore =
    placeholders === 0 ? 10 : Math.max(0, 10 - placeholders);

  const overallScore = Math.round(
    crosswalkScore + lintScore + structureScore + placeholderScore,
  );

  return {
    crosswalk,
    lint,
    structure,
    placeholders,
    overallScore,
  };
}
