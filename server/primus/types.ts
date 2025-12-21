/**
 * Primus GFS v4.0 Type Definitions
 * Comprehensive TypeScript types for JSON-driven document generation
 */

// ============================================================================
// SUBMODULE REQUIREMENT TYPES
// ============================================================================

/**
 * Individual requirement within a submodule
 * Represents a single compliance obligation with all necessary metadata
 */
export interface SubmoduleRequirement {
  /** Unique identifier (e.g., "1.01.01") */
  id: string;

  /** Requirement code for crosswalk (e.g., "1.01.01") */
  code: string;

  /** Whether this requirement is mandatory for compliance */
  required: boolean;

  /** Full text of the requirement */
  text: string;

  /** Keywords for document matching and gap detection */
  keywords: string[];

  /** Mandatory statements that MUST appear in the document */
  mandatoryStatements: string[];

  /** Expected monitoring activities for this requirement */
  monitoringExpectations: string;

  /** Expected verification activities for this requirement */
  verificationExpectations: string;

  /** Optional: Traceability requirements specific to this item */
  traceabilityExpectations?: string;

  /** Optional: CAPA triggers specific to this requirement */
  capaTriggersFor?: string[];

  /** Optional: Risk level (high, medium, low) */
  riskLevel?: "high" | "medium" | "low";

  /** Optional: Section number where this requirement should appear (8=Procedures, 9=Monitoring, etc.) */
  targetSection?: number;
}

/**
 * Complete submodule specification
 * Defines all requirements and injection rules for a specific submodule
 */
export interface SubmoduleSpec {
  /** Submodule code (e.g., "1.01", "5.12") */
  code: string;

  /** Full title of the submodule */
  title: string;

  /** Parent module name */
  moduleName: string;

  /** Who/what this submodule applies to */
  appliesTo: string[];

  /** High-level description of the submodule purpose */
  description: string;

  /** Array of all requirements for this submodule */
  requirements: SubmoduleRequirement[];

  /** Micro-rule categories to inject (e.g., ["fsms", "document_control"]) */
  micro_inject: string[];

  /** CAPA protocol items to inject into Section 11 */
  capaInject?: string[];

  /** Traceability items to inject into Section 12 */
  traceabilityInject?: string[];

  /** Optional: Hazard analysis items to inject into Section 7 */
  hazardInject?: string[];

  /** Optional: Record retention items to inject into Section 13 */
  recordsInject?: string[];

  /** Optional: Training requirements to inject */
  trainingInject?: string[];

  /** Optional: Indicates this is a parent with sub-submodules */
  hasSubSubmodules?: boolean;
}

/**
 * Sub-submodule specification (for very large submodules like 4.05)
 * Used when a submodule has too many questions (30+) and needs to be broken down
 */
export interface SubSubmoduleSpec {
  /** Sub-submodule code (e.g., "4.05.01", "4.04.01") */
  code: string;

  /** Parent submodule code (e.g., "4.05", "4.04") */
  parentCode: string;

  /** Full title of the sub-submodule */
  title: string;

  /** Array of all requirements for this sub-submodule */
  requirements: SubmoduleRequirement[];

  /** Mandatory statements that MUST appear */
  mandatoryStatements: string[];

  /** CAPA protocol items to inject into Section 11 */
  capaInject?: string[];

  /** Traceability items to inject into Section 12 */
  traceabilityInject?: string[];

  /** Micro-rule injection content */
  micro_inject?: string[];

  /** Optional: Parent module name */
  moduleName?: string;

  /** Optional: Who/what this sub-submodule applies to */
  appliesTo?: string[];

  /** Optional: High-level description of the sub-submodule purpose */
  description?: string;

  /** Optional: Hazard analysis items to inject into Section 7 */
  hazardInject?: string[];

  /** Optional: Record retention items to inject into Section 13 */
  recordsInject?: string[];

  /** Optional: Training requirements to inject */
  trainingInject?: string[];
}

// ============================================================================
// MODULE SPECIFICATION TYPES
// ============================================================================

/**
 * Submodule reference within module spec
 */
export interface SubmoduleReference {
  /** Submodule code (e.g., "1.01") */
  code: string;

  /** Submodule name */
  name: string;

  /** Optional alias for matching (e.g., "document_control") */
  alias?: string;

  /** Spec file name (e.g., "1.01.json") */
  specFile: string;

  /** Micro-rule categories for this submodule */
  micro_inject: string[];
}

/**
 * Document section template definition
 */
export interface SectionTemplate {
  /** Section number (1-15) */
  number: number;

  /** Section title */
  title: string;

  /** Whether this section is mandatory */
  required: boolean;

  /** Minimum paragraphs expected in this section */
  minParagraphs: number;

  /** Guidance for what content should appear in this section */
  contentGuidance: string;

  /** Optional: Specific subsections to include */
  subsections?: string[];
}

/**
 * Complete module specification
 * Defines module-level metadata and document structure
 */
export interface ModuleSpec {
  /** Module number (e.g., "1", "5", "6") */
  module: string;

  /** Full module name */
  moduleName: string;

  /** Module description */
  description: string;

  /** Module scope */
  scope: string;

  /** Array of all submodules in this module */
  submodules: SubmoduleReference[];

  /** Deterministic 15-section document structure template */
  documentStructureTemplate: {
    sections: SectionTemplate[];
  };

  /** Compliance keywords for each submodule (for matching) */
  complianceKeywords: Record<string, string[]>;
}

// ============================================================================
// MICRO-RULES TYPES
// ============================================================================

/**
 * Micro-rules for a specific category
 * Contains reusable compliance requirements
 */
export interface MicroRules {
  /** Category name (e.g., "pest", "chemical", "fsms") */
  category: string;

  /** Map of rule ID to rule text */
  rules: Record<string, string>;

  /** Optional: Description of when to apply these rules */
  applicability?: string;

  /** Optional: Priority level */
  priority?: "critical" | "high" | "medium" | "low";
}

/**
 * Micro-rule category identifier
 */
export type MicroRuleCategory =
  | "fsms"
  | "document_control"
  | "pest"
  | "chemical"
  | "glass_brittle_plastic"
  | "haccp"
  | "traceability"
  | "allergen"
  | "sanitation";

// ============================================================================
// DOCUMENT GENERATION TYPES
// ============================================================================

/**
 * Document generation options
 */
export interface DocumentGenerationOptions {
  /** Module number (e.g., "1") */
  moduleNumber: string;

  /** Optional: Specific submodule name or code */
  subModuleName?: string;

  /** Optional: Document name for spec matching */
  documentName?: string;

  /** Answers to questions */
  answers: Record<string, string | boolean | number | Date>;

  /** Optional: Force specific micro-rule categories */
  forceMicroCategories?: MicroRuleCategory[];

  /** Optional: Enable two-pass generation (slower but more thorough) */
  twoPass?: boolean;

  /** Optional: Enable auto-linting and correction */
  autoCorrect?: boolean;
}

/**
 * Generated document result
 */
export interface GeneratedDocument {
  /** The generated document text */
  content: string;

  /** Module number used */
  moduleNumber: string;

  /** Submodule code used (if any) */
  submoduleCode?: string;

  /** Submodule title used (if any) */
  submoduleTitle?: string;

  /** Requirements count from spec */
  requirementsCount: number;

  /** Validation status */
  validation: {
    valid: boolean;
    errorCount: number;
    warningCount: number;
    missingRequirements?: string[];
  };

  /** Compliance score (0-100) */
  complianceScore?: number;

  /** Generation metadata */
  metadata: {
    generatedAt: string;
    templateUsed: string | null;
    microCategoriesApplied: string[];
    wordCount: number;
  };
}

// ============================================================================
// QUESTION GENERATION TYPES
// ============================================================================

/**
 * Question item for data collection
 */
export interface QuestionItem {
  /** Stable machine ID (snake_case) */
  id: string;

  /** Auditor-facing question text */
  question: string;

  /** Question type */
  type: "text" | "boolean" | "date" | "number";

  /** Optional hint or guidance */
  hint?: string;

  /** Primus GFS requirement codes this question addresses */
  checklistRefs?: string[];

  /** Optional: Whether this is a core document control question */
  isCore?: boolean;

  /** Optional: Requirement ID this question maps to */
  requirementId?: string;

  /** Optional: Validation rules */
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

/**
 * Question generation result
 */
export interface QuestionGenerationResult {
  /** Array of questions */
  questions: QuestionItem[];

  /** Source of questions (spec or template) */
  source: "specification" | "template" | "fallback";

  /** Module number */
  moduleNumber: string;

  /** Submodule code (if using spec) */
  submoduleCode?: string;

  /** Requirements count (if using spec) */
  requirementsCount?: number;
}

// ============================================================================
// COMPLIANCE VALIDATION TYPES
// ============================================================================

/**
 * Crosswalk entry
 */
export interface CrosswalkEntry {
  /** Requirement code (e.g., "1.01.01") */
  requirementCode: string;

  /** Requirement description */
  requirementDescription: string;

  /** Whether this is mandatory */
  mandatory: boolean;

  /** Document section where this is addressed (null if GAP) */
  documentSection: string | null;

  /** Evidence text or GAP statement */
  evidence: string;

  /** Status */
  status: "FULFILLED" | "GAP";

  /** Optional: Keywords that were matched */
  matchedKeywords?: string[];
}

/**
 * Crosswalk report
 */
export interface CrosswalkReport {
  /** Module number */
  moduleNumber: string;

  /** Module name */
  moduleName: string;

  /** Generation timestamp */
  generatedDate: string;

  /** Total requirements checked */
  totalRequirements: number;

  /** Count of fulfilled requirements */
  fulfilledCount: number;

  /** Count of gaps */
  gapCount: number;

  /** All crosswalk entries */
  entries: CrosswalkEntry[];
}

/**
 * Compliance lint issue
 */
export interface ComplianceLintIssue {
  /** Rule ID */
  ruleId: string;

  /** Rule text */
  ruleText: string;

  /** Category */
  category: string;

  /** Whether rule was found */
  found: boolean;

  /** Suggested insertion text */
  suggestedInsertion?: string;

  /** Section to insert after */
  insertAfterSection?: string;
}

/**
 * Compliance lint report
 */
export interface ComplianceLintReport {
  /** Total rules checked */
  totalRulesChecked: number;

  /** Count of missing rules */
  missingRulesCount: number;

  /** All issues */
  issues: ComplianceLintIssue[];

  /** Auto-corrected document (if enabled) */
  correctedDocument?: string;
}

/**
 * Comprehensive compliance summary
 */
export interface ComplianceSummary {
  /** Crosswalk report */
  crosswalk: CrosswalkReport;

  /** Lint report */
  lint: ComplianceLintReport;

  /** Structure validation */
  structure: {
    valid: boolean;
    missingSections: string[];
  };

  /** Placeholder count */
  placeholders: number;

  /** Overall score (0-100) */
  overallScore: number;

  /** Recommendations */
  recommendations?: string[];
}

// ============================================================================
// LEGACY COMPATIBILITY TYPES
// ============================================================================

/**
 * Legacy checklist requirement (for backward compatibility)
 */
export interface ChecklistRequirement {
  code: string;
  description: string;
  mandatory: boolean;
  keywords: string[];
}

/**
 * Legacy checklist section
 */
export interface ChecklistSection {
  code: string;
  name: string;
  requirements: ChecklistRequirement[];
}

/**
 * Legacy module checklist
 */
export interface ModuleChecklist {
  module: string;
  moduleName: string;
  sections: ChecklistSection[];
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  module: string;
  subModule?: string;
  filePath: string;
  keywords: string[];
}
