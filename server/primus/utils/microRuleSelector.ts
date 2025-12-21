/**
 * Micro-Rule Selection Logic
 * Determines which micro-rule groups are relevant for a specific document
 * Prevents cross-contamination between different document types
 */

import type { PrimusModuleContext } from "../../llm";

export type MicroRuleCategory =
  | "pest"
  | "chemical"
  | "glass_brittle_plastic"
  | "document_control"
  | "haccp"
  | "traceability"
  | "allergen";

/**
 * Detect relevant micro-rule groups based on module context and document name
 * Returns only the categories that should be included in the document
 */
export function detectRelevantMicroRuleGroups(
  moduleContext: PrimusModuleContext | undefined,
  documentName?: string,
): MicroRuleCategory[] {
  const relevantGroups: MicroRuleCategory[] = [];

  const moduleNumber = moduleContext?.moduleNumber || "1";
  const subModuleName = (moduleContext?.subModuleName || "").toLowerCase();
  const docName = (documentName || "").toLowerCase();

  // Combined search string
  const searchText = `${subModuleName} ${docName}`.toLowerCase();

  // ============================================================================
  // CHEMICAL CONTROL - Module 5.11
  // ============================================================================
  if (
    searchText.includes("chemical") ||
    searchText.includes("5.11") ||
    searchText.includes("sanitizer") ||
    searchText.includes("inventory") ||
    searchText.includes("cleaning") ||
    searchText.includes("sds") ||
    searchText.includes("msds") ||
    searchText.includes("hazardous material") ||
    (searchText.includes("storage") &&
      (searchText.includes("chemical") || searchText.includes("sanitiz")))
  ) {
    relevantGroups.push("chemical");
  }

  // ============================================================================
  // PEST CONTROL - Module 5.12
  // ============================================================================
  if (
    searchText.includes("pest") ||
    searchText.includes("5.12") ||
    searchText.includes("rodent") ||
    searchText.includes("trap") ||
    searchText.includes("bait") ||
    searchText.includes("exterminator") ||
    searchText.includes("ipm") ||
    searchText.includes("insect") ||
    searchText.includes("pest management")
  ) {
    relevantGroups.push("pest");
  }

  // ============================================================================
  // GLASS & BRITTLE PLASTIC - Module 5.04
  // ============================================================================
  if (
    searchText.includes("glass") ||
    searchText.includes("brittle") ||
    searchText.includes("5.04") ||
    searchText.includes("foreign material") ||
    searchText.includes("breakage") ||
    searchText.includes("plastic control")
  ) {
    relevantGroups.push("glass_brittle_plastic");
  }

  // ============================================================================
  // DOCUMENT CONTROL - Module 1.02
  // ============================================================================
  if (
    moduleNumber === "1" &&
    (searchText.includes("document") ||
      searchText.includes("1.02") ||
      searchText.includes("record") ||
      searchText.includes("control") ||
      searchText.includes("version") ||
      searchText.includes("obsolete"))
  ) {
    relevantGroups.push("document_control");
  }

  // ============================================================================
  // HACCP - Module 6
  // ============================================================================
  if (
    moduleNumber === "6" ||
    searchText.includes("haccp") ||
    searchText.includes("ccp") ||
    searchText.includes("critical control") ||
    searchText.includes("hazard analysis")
  ) {
    relevantGroups.push("haccp");
  }

  // ============================================================================
  // TRACEABILITY - Modules 1, 2, 4, 6
  // ============================================================================
  if (
    searchText.includes("traceability") ||
    searchText.includes("recall") ||
    searchText.includes("lot code") ||
    searchText.includes("batch") ||
    (moduleNumber === "1" && searchText.includes("trace")) ||
    ["2", "4", "6"].includes(moduleNumber)
  ) {
    relevantGroups.push("traceability");
  }

  // ============================================================================
  // ALLERGEN - Modules 5, 6
  // ============================================================================
  if (
    searchText.includes("allergen") ||
    searchText.includes("allergy") ||
    searchText.includes("cross-contact") ||
    searchText.includes("big 8") ||
    searchText.includes("big 9")
  ) {
    relevantGroups.push("allergen");
  }

  // Remove duplicates
  return Array.from(new Set(relevantGroups));
}

/**
 * Get human-readable category names
 */
export function getCategoryDisplayName(category: MicroRuleCategory): string {
  const displayNames: Record<MicroRuleCategory, string> = {
    pest: "Pest Control",
    chemical: "Chemical Control",
    glass_brittle_plastic: "Glass & Brittle Plastic Control",
    document_control: "Document Control",
    haccp: "HACCP",
    traceability: "Traceability",
    allergen: "Allergen Management",
  };

  return displayNames[category];
}

/**
 * Validate that detected groups make logical sense
 * Warns if suspicious combinations are detected
 */
export function validateMicroRuleGroups(
  groups: MicroRuleCategory[],
  documentName?: string,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Warn if pest + chemical both selected (unless it's a facility-wide program)
  if (groups.includes("pest") && groups.includes("chemical")) {
    if (documentName && !documentName.toLowerCase().includes("facility")) {
      warnings.push(
        "Both pest and chemical rules detected. Ensure document covers both topics or split into separate documents.",
      );
    }
  }

  // Warn if no groups detected for Module 5
  if (groups.length === 0 && documentName) {
    warnings.push(
      "No specific micro-rule groups detected. Document will only use base checklist requirements.",
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
