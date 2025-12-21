/**
 * Primus GFS v4.0 Enhancement System - Main Entry Point
 *
 * This module provides comprehensive Primus GFS v4.0 compliance features:
 * - Authentic checklist data (150+ requirements across 6 modules)
 * - 81 mandatory micro-requirements (deterministic injection)
 * - Pre-built document templates
 * - Accurate crosswalk generation (keyword-based, zero hallucination)
 * - Compliance linting with auto-correction
 * - Micro-rule scoping to prevent cross-contamination
 * - JSON-driven submodule specifications (Module 1-7 support)
 */

// ============================================================================
// EXPORTS
// ============================================================================

// Compliance engine functions
export {
  countPlaceholders,
  formatCrosswalkTable,
  generateComplianceSummary,
  generateCrosswalk,
  lintCompliance,
  validateMandatoryStructure,
} from "./compliance_engine";

// Loader functions
export {
  clearAllCaches,
  findRequirementsByKeyword,
  findSubmoduleSpecByName,
  getAllRequirements,
  getCacheStats,
  getDocumentStructure,
  getMandatoryRequirements,
  getMandatorySubmoduleRequirements,
  getMicroInjectCategories,
  getModuleTemplates,
  getRelevantMicroRules,
  getRelevantMicroRulesLegacy,
  getSubmoduleRequirements,
  loadAllChecklists,
  loadAllMicroRules,
  loadMicroRules,
  loadModuleChecklist,
  loadModuleSpec,
  loadSubmoduleSpec,
  loadTemplate,
  selectTemplate,
} from "./loader";
// Output validation and sanitization
export {
  cutoffAfterSignatures,
  formatValidationReport,
  getCriticalErrors,
  hasPostSignatureContent,
  isValidOutput,
  sanitizeOutput,
  stripComplianceAnnotations,
  type ValidationError,
  type ValidationResult,
  type ValidationWarning,
  validateLLMOutput,
} from "./output_validator";
// Type definitions
export type {
  ChecklistRequirement,
  ChecklistSection,
  ComplianceLintIssue,
  ComplianceLintReport,
  ComplianceSummary,
  CrosswalkEntry,
  CrosswalkReport,
  DocumentGenerationOptions,
  GeneratedDocument,
  MicroRuleCategory,
  MicroRules,
  ModuleChecklist,
  ModuleSpec,
  QuestionGenerationResult,
  QuestionItem,
  SectionTemplate,
  SubmoduleReference,
  SubmoduleRequirement,
  SubmoduleSpec,
  TemplateMetadata,
} from "./types";
// Micro-rule selector utilities
export {
  detectRelevantMicroRuleGroups,
  getCategoryDisplayName,
  validateMicroRuleGroups,
} from "./utils/microRuleSelector";

/**
 * USAGE EXAMPLES:
 *
 * 1. Generate Crosswalk for a Document:
 * ```typescript
 * import { generateCrosswalk, formatCrosswalkTable } from './primus';
 *
 * const document = "...generated document text...";
 * const crosswalk = generateCrosswalk(document, "5");
 * console.log(`Fulfilled: ${crosswalk.fulfilledCount}/${crosswalk.totalRequirements}`);
 * console.log(`Gaps: ${crosswalk.gapCount}`);
 *
 * // Insert formatted crosswalk into document
 * const table = formatCrosswalkTable(crosswalk);
 * ```
 *
 * 2. Lint Document for Compliance:
 * ```typescript
 * import { lintCompliance } from './primus';
 *
 * const document = "...generated document text...";
 * const lintReport = lintCompliance(document, "5", "Pest Control", true); // autoCorrect=true
 *
 * if (lintReport.missingRulesCount > 0) {
 *   console.log(`Missing ${lintReport.missingRulesCount} micro-requirements`);
 *   // Use corrected document
 *   const corrected = lintReport.correctedDocument;
 * }
 * ```
 *
 * 3. Get Comprehensive Compliance Summary:
 * ```typescript
 * import { generateComplianceSummary } from './primus';
 *
 * const summary = generateComplianceSummary(document, "5", "Pest Control");
 * console.log(`Overall Score: ${summary.overallScore}/100`);
 * console.log(`Crosswalk: ${summary.crosswalk.fulfilledCount}/${summary.crosswalk.totalRequirements}`);
 * console.log(`Missing Rules: ${summary.lint.missingRulesCount}`);
 * console.log(`Structure Valid: ${summary.structure.valid}`);
 * console.log(`Placeholders Remaining: ${summary.placeholders}`);
 * ```
 *
 * 4. Load Module-Specific Template:
 * ```typescript
 * import { selectTemplate } from './primus';
 *
 * const template = selectTemplate("5", "Pest Control");
 * if (template) {
 *   // Use pre-built template instead of generic template
 *   console.log("Using specialized pest control template");
 * }
 * ```
 *
 * 5. Access Checklist Data:
 * ```typescript
 * import { loadModuleChecklist, getMandatoryRequirements } from './primus';
 *
 * const checklist = loadModuleChecklist("5");
 * console.log(`Module: ${checklist.moduleName}`);
 *
 * const mandatory = getMandatoryRequirements("5");
 * console.log(`Mandatory requirements: ${mandatory.length}`);
 * ```
 */

/**
 * INTEGRATION GUIDE:
 *
 * To integrate with existing document generation:
 *
 * 1. In your document generation API route (e.g., app/api/generate-doc/route.ts):
 *
 * ```typescript
 * import { callLLM_fillTemplate } from '@/server/llm';
 * import { generateComplianceSummary, lintCompliance } from '@/server/primus';
 *
 * // After generating document
 * const document = await callLLM_fillTemplate(template, answers, moduleContext, true);
 *
 * // Perform compliance check
 * const summary = generateComplianceSummary(
 *   document,
 *   moduleContext.moduleNumber || "1",
 *   moduleContext.subModuleName
 * );
 *
 * // Return summary along with document
 * return {
 *   document,
 *   complianceScore: summary.overallScore,
 *   crosswalk: summary.crosswalk,
 *   gaps: summary.crosswalk.entries.filter(e => e.status === 'GAP'),
 * };
 * ```
 *
 * 2. In your frontend UI, display compliance metrics:
 *
 * ```typescript
 * // Show overall compliance score
 * <div>Compliance Score: {complianceScore}/100</div>
 *
 * // Show gaps that need attention
 * {gaps.length > 0 && (
 *   <Alert severity="warning">
 *     {gaps.length} requirements not addressed. Review and update document.
 *   </Alert>
 * )}
 *
 * // Display crosswalk table
 * <CrosswalkTable entries={crosswalk.entries} />
 * ```
 */

/**
 * ADVANCED: Post-Generation Quality Enhancement
 *
 * Apply compliance linting after document generation to auto-correct:
 *
 * ```typescript
 * async function enhanceDocumentQuality(
 *   document: string,
 *   moduleNumber: string,
 *   subModuleName?: string
 * ): Promise<string> {
 *   // Run compliance linter with auto-correction
 *   const lintReport = lintCompliance(document, moduleNumber, subModuleName, true);
 *
 *   if (lintReport.correctedDocument) {
 *     console.log(`Auto-corrected ${lintReport.missingRulesCount} missing requirements`);
 *     return lintReport.correctedDocument;
 *   }
 *
 *   return document;
 * }
 * ```
 */
