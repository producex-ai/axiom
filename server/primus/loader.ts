/**
 * Primus GFS v4.0 Data Loader
 * Strongly-typed loaders for checklists, micro-rules, and templates
 * with caching for performance
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

// Import comprehensive type definitions
import type {
  ChecklistRequirement,
  ChecklistSection,
  MicroRuleCategory,
  MicroRules,
  ModuleChecklist,
  ModuleSpec,
  SectionTemplate,
  SubmoduleReference,
  SubmoduleRequirement,
  SubmoduleSpec,
  SubSubmoduleSpec,
  TemplateMetadata,
} from "./types";

// Re-export types for backward compatibility
export type {
  ChecklistRequirement,
  ChecklistSection,
  ModuleChecklist,
  MicroRules,
  TemplateMetadata,
  SubmoduleRequirement,
  SubmoduleSpec,
  SubSubmoduleSpec,
  ModuleSpec,
  SubmoduleReference,
  SectionTemplate,
  MicroRuleCategory,
};

// ============================================================================
// CACHING LAYER
// ============================================================================

const checklistCache: Map<string, ModuleChecklist> = new Map();
const microRulesCache: Map<string, MicroRules> = new Map();
const templateCache: Map<string, string> = new Map();
const submoduleSpecCache: Map<string, SubmoduleSpec> = new Map();
const subSubmoduleSpecCache: Map<string, SubSubmoduleSpec> = new Map();
const moduleSpecCache: Map<string, ModuleSpec> = new Map();

// ============================================================================
// PATH HELPERS
// ============================================================================

const PRIMUS_BASE = join(process.cwd(), "server", "primus");
const CHECKLIST_PATH = join(PRIMUS_BASE, "checklists");
const MICRO_RULES_PATH = join(PRIMUS_BASE, "micro_rules");
const TEMPLATES_PATH = join(PRIMUS_BASE, "templates");
const SPEC_MODULES_PATH = join(PRIMUS_BASE, "spec", "modules");
const SPEC_SUBMODULES_PATH = join(PRIMUS_BASE, "spec", "submodules");

// ============================================================================
// CHECKLIST LOADERS
// ============================================================================

/**
 * Load a specific module checklist by module number
 */
export function loadModuleChecklist(moduleNumber: string): ModuleChecklist {
  const cacheKey = `module_${moduleNumber}`;

  if (checklistCache.has(cacheKey)) {
    return checklistCache.get(cacheKey)!;
  }

  try {
    const filePath = join(CHECKLIST_PATH, `module_${moduleNumber}.json`);
    const content = readFileSync(filePath, "utf-8");
    const checklist = JSON.parse(content) as ModuleChecklist;

    // Validate structure
    if (!checklist.module || !checklist.sections) {
      throw new Error(
        `Invalid checklist structure in module_${moduleNumber}.json`,
      );
    }

    checklistCache.set(cacheKey, checklist);
    return checklist;
  } catch (error) {
    console.error(`Failed to load module ${moduleNumber} checklist:`, error);
    throw new Error(
      `Checklist for module ${moduleNumber} not found or invalid`,
    );
  }
}

/**
 * Load all module checklists (1-6)
 */
export function loadAllChecklists(): Map<string, ModuleChecklist> {
  const modules = ["1", "2", "3", "4", "5", "6"];
  const allChecklists = new Map<string, ModuleChecklist>();

  for (const moduleNumber of modules) {
    try {
      const checklist = loadModuleChecklist(moduleNumber);
      allChecklists.set(moduleNumber, checklist);
    } catch (error) {
      console.warn(`Skipping module ${moduleNumber}:`, error);
    }
  }

  return allChecklists;
}

/**
 * Get all requirements for a module as flat array
 */
export function getAllRequirements(
  moduleNumber: string,
): ChecklistRequirement[] {
  const checklist = loadModuleChecklist(moduleNumber);
  return checklist.sections.flatMap((section) => section.requirements);
}

/**
 * Get only mandatory requirements for a module
 */
export function getMandatoryRequirements(
  moduleNumber: string,
): ChecklistRequirement[] {
  return getAllRequirements(moduleNumber).filter((req) => req.mandatory);
}

/**
 * Find requirements by keyword
 */
export function findRequirementsByKeyword(
  moduleNumber: string,
  keyword: string,
): ChecklistRequirement[] {
  const requirements = getAllRequirements(moduleNumber);
  const lowerKeyword = keyword.toLowerCase();

  return requirements.filter(
    (req) =>
      req.keywords.some((kw) => kw.toLowerCase().includes(lowerKeyword)) ||
      req.description.toLowerCase().includes(lowerKeyword),
  );
}

// ============================================================================
// MICRO-RULES LOADERS (LEGACY - DEPRECATED)
// ============================================================================
// NOTE: Micro-rules system is deprecated in favor of comprehensive submodule specs.
// All requirements are now defined in spec files via:
//   - mandatoryStatements: Core compliance requirements
//   - verificationExpectations: Verification procedures
//   - monitoringExpectations: Monitoring requirements
//
// Micro-rules are kept optional for backward compatibility with older specs.
// New module implementations (Module 4+) should omit micro_inject entirely.
// ============================================================================

/**
 * Load micro-rules for a specific category
 * @deprecated Use comprehensive submodule specs instead (mandatoryStatements, etc.)
 */
export function loadMicroRules(category: string): MicroRules {
  const cacheKey = category;

  if (microRulesCache.has(cacheKey)) {
    return microRulesCache.get(cacheKey)!;
  }

  try {
    const filePath = join(MICRO_RULES_PATH, `${category}.json`);
    const content = readFileSync(filePath, "utf-8");
    const microRules = JSON.parse(content) as MicroRules;

    if (!microRules.category || !microRules.rules) {
      throw new Error(`Invalid micro-rules structure in ${category}.json`);
    }

    microRulesCache.set(cacheKey, microRules);
    return microRules;
  } catch {
    // Micro-rules are now optional - specs contain all requirements via mandatoryStatements
    console.warn(
      `[LOADER] Micro-rules for ${category} not found (optional, using spec requirements instead)`,
    );

    // Return empty micro-rules structure to avoid breaking downstream code
    const emptyRules: MicroRules = {
      category,
      rules: {},
    };
    microRulesCache.set(cacheKey, emptyRules);
    return emptyRules;
  }
}

/**
 * Load all available micro-rules
 */
export function loadAllMicroRules(): Map<string, MicroRules> {
  const categories = [
    "pest",
    "chemical",
    "document_control",
    "glass_brittle_plastic",
    "haccp",
    "traceability",
    "allergen",
  ];

  const allRules = new Map<string, MicroRules>();

  for (const category of categories) {
    try {
      const rules = loadMicroRules(category);
      allRules.set(category, rules);
    } catch (error) {
      console.warn(`Skipping micro-rules category ${category}:`, error);
    }
  }

  return allRules;
}

/**
 * Get relevant micro-rules based on specific category list
 * Use detectRelevantMicroRuleGroups() from utils to determine which categories to load
 */
export function getRelevantMicroRules(
  categories: string[],
): Map<string, MicroRules> {
  const relevantRules = new Map<string, MicroRules>();

  for (const category of categories) {
    try {
      const rules = loadMicroRules(category);
      // Skip empty micro-rules (legacy files that don't exist)
      if (Object.keys(rules.rules).length > 0) {
        relevantRules.set(category, rules);
      }
    } catch (error) {
      console.warn(`Failed to load micro-rules for ${category}:`, error);
    }
  }

  return relevantRules;
}

/**
 * @deprecated Use detectRelevantMicroRuleGroups + getRelevantMicroRules(categories) instead
 * Legacy function kept for backward compatibility
 */
export function getRelevantMicroRulesLegacy(
  moduleNumber: string,
  subModuleName?: string,
): Map<string, MicroRules> {
  const relevantRules = new Map<string, MicroRules>();

  // Module 1: Document Control, Traceability
  if (moduleNumber === "1") {
    try {
      relevantRules.set("document_control", loadMicroRules("document_control"));
      relevantRules.set("traceability", loadMicroRules("traceability"));
    } catch {
      console.warn("Some Module 1 micro-rules not available");
    }
  }

  // Module 5: Pest, Chemical, Glass
  if (moduleNumber === "5") {
    try {
      if (!subModuleName || subModuleName.toLowerCase().includes("pest")) {
        relevantRules.set("pest", loadMicroRules("pest"));
      }
      if (!subModuleName || subModuleName.toLowerCase().includes("chemical")) {
        relevantRules.set("chemical", loadMicroRules("chemical"));
      }
      if (
        !subModuleName ||
        subModuleName.toLowerCase().includes("glass") ||
        subModuleName.toLowerCase().includes("brittle")
      ) {
        relevantRules.set(
          "glass_brittle_plastic",
          loadMicroRules("glass_brittle_plastic"),
        );
      }
    } catch {
      console.warn("Some Module 5 micro-rules not available");
    }
  }

  // Module 6: HACCP
  if (moduleNumber === "6") {
    try {
      relevantRules.set("haccp", loadMicroRules("haccp"));
      relevantRules.set("traceability", loadMicroRules("traceability"));
    } catch {
      console.warn("Some Module 6 micro-rules not available");
    }
  }

  // Module 2, 3, 4: May include pest, allergen depending on context
  if (["2", "3", "4"].includes(moduleNumber)) {
    try {
      relevantRules.set("traceability", loadMicroRules("traceability"));
    } catch {
      console.warn("Traceability micro-rules not available");
    }
  }

  return relevantRules;
}

// ============================================================================
// TEMPLATE LOADERS
// ============================================================================

/**
 * Load a specific template by filename
 */
export function loadTemplate(filename: string): string {
  const cacheKey = filename;

  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey)!;
  }

  try {
    const filePath = join(TEMPLATES_PATH, filename);
    const content = readFileSync(filePath, "utf-8");

    templateCache.set(cacheKey, content);
    return content;
  } catch (error) {
    console.error(`Failed to load template ${filename}:`, error);
    throw new Error(`Template ${filename} not found`);
  }
}

/**
 * Available template metadata for selection
 */
const AVAILABLE_TEMPLATES: TemplateMetadata[] = [
  {
    module: "1",
    subModule: "Document Control",
    filePath: "module_1_document_control.txt",
    keywords: [
      "document control",
      "document management",
      "records",
      "obsolete",
      "external documents",
    ],
  },
  {
    module: "5",
    subModule: "Pest Control",
    filePath: "module_5_pest.txt",
    keywords: ["pest", "rodent", "insect", "bait", "pest management", "IPM"],
  },
  {
    module: "5",
    subModule: "Chemical Control",
    filePath: "module_5_chemical.txt",
    keywords: [
      "chemical",
      "sanitizer",
      "cleaning",
      "SDS",
      "MSDS",
      "storage",
      "labeling",
    ],
  },
];

/**
 * Auto-select template based on module context and document name
 * IMPROVED: More precise matching to prevent wrong template selection
 */
export function selectTemplate(
  moduleNumber: string,
  subModuleName?: string,
  documentName?: string,
): string | null {
  // CRITICAL: Check document name first for specific matches
  if (documentName) {
    const docNameLower = documentName.toLowerCase();

    // Skip template selection for policies (they don't need specific templates)
    if (
      docNameLower.includes("policy") &&
      (docNameLower.includes("food safety") ||
        docNameLower.includes("traceability") ||
        docNameLower.includes("allergen"))
    ) {
      console.log(
        "[TEMPLATE] Policy document detected - using generic SOP structure",
      );
      return null; // Let LLM use generic structure with proper guidance
    }

    // Match specific document types to templates
    if (docNameLower.includes("chemical") && docNameLower.includes("control")) {
      const chemicalTemplate = AVAILABLE_TEMPLATES.find((t) =>
        t.filePath.includes("chemical"),
      );
      if (chemicalTemplate) {
        console.log("[TEMPLATE] Selected: Chemical Control template");
        return loadTemplate(chemicalTemplate.filePath);
      }
    }

    if (docNameLower.includes("pest") && docNameLower.includes("control")) {
      const pestTemplate = AVAILABLE_TEMPLATES.find((t) =>
        t.filePath.includes("pest"),
      );
      if (pestTemplate) {
        console.log("[TEMPLATE] Selected: Pest Control template");
        return loadTemplate(pestTemplate.filePath);
      }
    }

    if (
      docNameLower.includes("document control") ||
      (docNameLower.includes("document") && docNameLower.includes("procedure"))
    ) {
      const docControlTemplate = AVAILABLE_TEMPLATES.find((t) =>
        t.filePath.includes("document_control"),
      );
      if (docControlTemplate) {
        console.log("[TEMPLATE] Selected: Document Control template");
        return loadTemplate(docControlTemplate.filePath);
      }
    }
  }

  // Exact match by module and submodule
  if (subModuleName) {
    const subLower = subModuleName.toLowerCase();

    const exactMatch = AVAILABLE_TEMPLATES.find(
      (t) =>
        t.module === moduleNumber &&
        t.subModule?.toLowerCase().includes(subLower),
    );
    if (exactMatch) {
      console.log(`[TEMPLATE] Exact match: ${exactMatch.filePath}`);
      return loadTemplate(exactMatch.filePath);
    }

    // Keyword-based match (more restrictive - require at least 2 keyword matches)
    const keywordMatch = AVAILABLE_TEMPLATES.find(
      (t) =>
        t.module === moduleNumber &&
        t.keywords.filter((kw) => subLower.includes(kw.toLowerCase())).length >=
          2,
    );
    if (keywordMatch) {
      console.log(`[TEMPLATE] Keyword match: ${keywordMatch.filePath}`);
      return loadTemplate(keywordMatch.filePath);
    }
  }

  // NO DEFAULT - return null to force generic structure
  // This prevents wrong template from being selected
  console.log(
    `[TEMPLATE] No specific template found for Module ${moduleNumber}. Using generic structure.`,
  );
  return null;
}

/**
 * Get all available templates for a module
 */
export function getModuleTemplates(moduleNumber: string): TemplateMetadata[] {
  return AVAILABLE_TEMPLATES.filter((t) => t.module === moduleNumber);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clear all caches (useful for testing or hot reload)
 */
export function clearAllCaches(): void {
  checklistCache.clear();
  microRulesCache.clear();
  templateCache.clear();
}

/**
 * Get cache statistics (useful for monitoring)
 */
export function getCacheStats() {
  return {
    checklists: checklistCache.size,
    microRules: microRulesCache.size,
    templates: templateCache.size,
    submoduleSpecs: submoduleSpecCache.size,
    subSubmoduleSpecs: subSubmoduleSpecCache.size,
    moduleSpecs: moduleSpecCache.size,
  };
}

// ============================================================================
// NEW: SUBMODULE SPECIFICATION LOADERS
// ============================================================================

/**
 * Load a specific sub-submodule specification by module number, submodule code, and sub-submodule code
 * Example: loadSubSubmoduleSpec("4", "4.05", "4.05.01")
 */
export function loadSubSubmoduleSpec(
  moduleNumber: string,
  submoduleCode: string,
  subSubmoduleCode: string,
): SubSubmoduleSpec {
  const cacheKey = `${moduleNumber}_${submoduleCode}_${subSubmoduleCode}`;

  if (subSubmoduleSpecCache.has(cacheKey)) {
    return subSubmoduleSpecCache.get(cacheKey)!;
  }

  try {
    // Check if sub-submodule folder exists
    const folderPath = join(
      SPEC_SUBMODULES_PATH,
      `module_${moduleNumber}`,
      submoduleCode,
    );
    const filePath = join(folderPath, `${subSubmoduleCode}.json`);

    const content = readFileSync(filePath, "utf-8");
    const spec = JSON.parse(content) as SubSubmoduleSpec;

    // Validate structure
    if (!spec.code || !spec.title || !spec.requirements || !spec.parentCode) {
      throw new Error(
        `Invalid sub-submodule spec structure in ${subSubmoduleCode}.json`,
      );
    }

    subSubmoduleSpecCache.set(cacheKey, spec);
    console.log(
      `[SPEC] Loaded sub-submodule spec: ${spec.code} - ${spec.title}`,
    );
    return spec;
  } catch (error) {
    console.error(
      `Failed to load sub-submodule spec ${moduleNumber}/${submoduleCode}/${subSubmoduleCode}:`,
      error,
    );
    throw new Error(
      `Sub-submodule spec for ${moduleNumber}/${submoduleCode}/${subSubmoduleCode} not found or invalid`,
    );
  }
}

/**
 * Load all sub-submodules for a given submodule
 * Returns empty array if no sub-submodules exist
 */
export function loadAllSubSubmodules(
  moduleNumber: string,
  submoduleCode: string,
): SubSubmoduleSpec[] {
  try {
    const folderPath = join(
      SPEC_SUBMODULES_PATH,
      `module_${moduleNumber}`,
      submoduleCode,
    );

    // Check if folder exists
    if (!existsSync(folderPath) || !statSync(folderPath).isDirectory()) {
      return [];
    }

    // Read all JSON files in the folder
    const files = readdirSync(folderPath).filter((f) => f.endsWith(".json"));

    const subSubmodules: SubSubmoduleSpec[] = [];
    for (const file of files) {
      const subSubmoduleCode = file.replace(".json", "");
      try {
        const spec = loadSubSubmoduleSpec(
          moduleNumber,
          submoduleCode,
          subSubmoduleCode,
        );
        subSubmodules.push(spec);
      } catch (error) {
        console.warn(
          `[SPEC] Failed to load sub-submodule ${subSubmoduleCode}:`,
          error,
        );
      }
    }

    // Sort by code for consistent ordering
    subSubmodules.sort((a, b) => a.code.localeCompare(b.code));

    return subSubmodules;
  } catch (error) {
    console.warn(
      `[SPEC] Error loading sub-submodules for ${moduleNumber}/${submoduleCode}:`,
      error,
    );
    return [];
  }
}

/**
 * Load a specific submodule specification by module number and submodule code
 * Example: loadSubmoduleSpec("5", "5.12") or loadSubmoduleSpec("1", "1.02")
 *
 * If the submodule has sub-submodules (nested folder structure), it will:
 * 1. Create a virtual submodule spec that aggregates all sub-submodules
 * 2. Mark it with hasSubSubmodules: true
 * 3. Combine all requirements from sub-submodules
 */
export function loadSubmoduleSpec(
  moduleNumber: string,
  submoduleCode: string,
): SubmoduleSpec {
  const cacheKey = `${moduleNumber}_${submoduleCode}`;

  if (submoduleSpecCache.has(cacheKey)) {
    return submoduleSpecCache.get(cacheKey)!;
  }

  try {
    // First check if this is a folder with sub-submodules
    const folderPath = join(
      SPEC_SUBMODULES_PATH,
      `module_${moduleNumber}`,
      submoduleCode,
    );

    if (existsSync(folderPath) && statSync(folderPath).isDirectory()) {
      // This submodule has sub-submodules - load and aggregate them
      console.log(
        `[SPEC] Detected sub-submodule structure for ${submoduleCode}`,
      );
      const subSubmodules = loadAllSubSubmodules(moduleNumber, submoduleCode);

      if (subSubmodules.length === 0) {
        throw new Error(
          `No sub-submodules found in folder for ${submoduleCode}`,
        );
      }

      // Load module spec to get metadata
      const moduleSpec = loadModuleSpec(moduleNumber);
      const submoduleRef = moduleSpec.submodules.find(
        (s) => s.code === submoduleCode,
      );

      if (!submoduleRef) {
        throw new Error(
          `Submodule ${submoduleCode} not found in module ${moduleNumber} configuration`,
        );
      }

      // Create aggregated submodule spec
      const aggregatedSpec: SubmoduleSpec = {
        code: submoduleCode,
        title: submoduleRef.name,
        moduleName: `Module ${moduleNumber}: ${moduleSpec.moduleName}`,
        appliesTo: ["All harvest crew operations"],
        description: `Aggregated specification for ${submoduleRef.name} with ${subSubmodules.length} sub-sections`,
        requirements: subSubmodules.flatMap((s) => s.requirements),
        micro_inject: submoduleRef.micro_inject || [],
        capaInject: [
          ...new Set(subSubmodules.flatMap((s) => s.capaInject || [])),
        ],
        traceabilityInject: [
          ...new Set(subSubmodules.flatMap((s) => s.traceabilityInject || [])),
        ],
        hasSubSubmodules: true,
      };

      submoduleSpecCache.set(cacheKey, aggregatedSpec);
      console.log(
        `[SPEC] Loaded aggregated submodule spec: ${aggregatedSpec.code} with ${aggregatedSpec.requirements.length} total requirements from ${subSubmodules.length} sub-submodules`,
      );
      return aggregatedSpec;
    }

    // Standard single-file submodule spec
    const filePath = join(
      SPEC_SUBMODULES_PATH,
      `module_${moduleNumber}`,
      `${submoduleCode}.json`,
    );
    const content = readFileSync(filePath, "utf-8");
    const spec = JSON.parse(content) as SubmoduleSpec;

    // Validate structure
    if (!spec.code || !spec.title || !spec.requirements) {
      throw new Error(
        `Invalid submodule spec structure in ${submoduleCode}.json`,
      );
    }

    submoduleSpecCache.set(cacheKey, spec);
    console.log(`[SPEC] Loaded submodule spec: ${spec.code} - ${spec.title}`);
    return spec;
  } catch (error) {
    console.error(
      `Failed to load submodule spec ${moduleNumber}/${submoduleCode}:`,
      error,
    );
    throw new Error(
      `Submodule spec for ${moduleNumber}/${submoduleCode} not found or invalid`,
    );
  }
}

/**
 * Load module-level specification
 * Contains metadata, document structure template, and submodule mappings
 */
export function loadModuleSpec(moduleNumber: string): ModuleSpec {
  const cacheKey = `module_${moduleNumber}`;

  if (moduleSpecCache.has(cacheKey)) {
    return moduleSpecCache.get(cacheKey)!;
  }

  try {
    const filePath = join(SPEC_MODULES_PATH, `module_${moduleNumber}.json`);
    const content = readFileSync(filePath, "utf-8");
    const spec = JSON.parse(content) as ModuleSpec;

    // Validate structure
    if (!spec.module || !spec.moduleName || !spec.documentStructureTemplate) {
      throw new Error(
        `Invalid module spec structure in module_${moduleNumber}.json`,
      );
    }

    moduleSpecCache.set(cacheKey, spec);
    console.log(
      `[SPEC] Loaded module spec: ${spec.module} - ${spec.moduleName}`,
    );
    return spec;
  } catch (error) {
    console.error(`Failed to load module spec ${moduleNumber}:`, error);
    throw new Error(
      `Module spec for module ${moduleNumber} not found or invalid`,
    );
  }
}

/**
 * Find submodule spec by document name or submodule name
 * Uses intelligent matching to find the right spec
 */
export function findSubmoduleSpecByName(
  moduleNumber: string,
  documentName?: string,
  subModuleName?: string,
): SubmoduleSpec | null {
  try {
    console.log(`[LOADER] findSubmoduleSpecByName called:`, {
      moduleNumber,
      documentName,
      subModuleName,
    });

    const moduleSpec = loadModuleSpec(moduleNumber);

    const searchText =
      `${documentName || ""} ${subModuleName || ""}`.toLowerCase();
    console.log(`[LOADER] Search text: "${searchText}"`);

    // Check if this is a sub-submodule code (e.g., "4.05.01")
    // Pattern: digit.digit.digit (with potential letters at the end like "4.05.01a")
    const subSubmoduleMatch = searchText.match(/(\d+\.\d{2}\.\d+[a-z]?)/);
    if (subSubmoduleMatch) {
      const subSubmoduleCode = subSubmoduleMatch[1];
      const parentCode = subSubmoduleCode.split(".").slice(0, 2).join("."); // Extract "4.05" from "4.05.01"

      console.log(
        `[LOADER] Detected sub-submodule code: ${subSubmoduleCode}, parent: ${parentCode}`,
      );

      try {
        // Load the specific sub-submodule as a standalone spec
        const subSubmoduleSpec = loadSubSubmoduleSpec(
          moduleNumber,
          parentCode,
          subSubmoduleCode,
        );

        // Convert SubSubmoduleSpec to SubmoduleSpec format
        const convertedSpec: SubmoduleSpec = {
          code: subSubmoduleSpec.code,
          title: subSubmoduleSpec.title,
          moduleName: subSubmoduleSpec.moduleName || `Module ${moduleNumber}`,
          appliesTo: subSubmoduleSpec.appliesTo || [],
          description: subSubmoduleSpec.description || subSubmoduleSpec.title,
          requirements: subSubmoduleSpec.requirements,
          micro_inject: subSubmoduleSpec.micro_inject || [],
          capaInject: subSubmoduleSpec.capaInject,
          traceabilityInject: subSubmoduleSpec.traceabilityInject,
        };

        console.log(
          `[LOADER] ✅ Loaded sub-submodule spec: ${subSubmoduleCode} with ${convertedSpec.requirements.length} requirements`,
        );
        return convertedSpec;
      } catch (error) {
        console.log(
          `[LOADER] Failed to load sub-submodule ${subSubmoduleCode}:`,
          error,
        );
      }
    }

    // Try exact code match first (e.g., "5.12" in document name)
    for (const submodule of moduleSpec.submodules) {
      if (searchText.includes(submodule.code.toLowerCase())) {
        console.log(`[LOADER] ✅ Found exact code match: ${submodule.code}`);
        try {
          return loadSubmoduleSpec(moduleNumber, submodule.code);
        } catch {
          console.log(`[LOADER] Failed to load spec for ${submodule.code}`);
          continue;
        }
      }
      // Check alias too
      if (
        submodule.alias &&
        searchText.includes(submodule.alias.toLowerCase())
      ) {
        console.log(
          `[LOADER] ✅ Found alias match: ${submodule.alias} -> ${submodule.code}`,
        );
        try {
          return loadSubmoduleSpec(moduleNumber, submodule.code);
        } catch {
          console.log(`[LOADER] Failed to load spec for ${submodule.code}`);
        }
      }
    }

    // Try keyword matching on submodule names
    for (const submodule of moduleSpec.submodules) {
      const nameWords = submodule.name.toLowerCase().split(/\s+/);
      const matchedWords = nameWords.filter(
        (word) => word.length > 3 && searchText.includes(word),
      );

      // If at least 2 significant words match, load this spec
      if (matchedWords.length >= 2) {
        console.log(
          `[LOADER] ✅ Found keyword match: ${submodule.name} (${matchedWords.length} words matched: ${matchedWords.join(", ")})`,
        );
        try {
          return loadSubmoduleSpec(moduleNumber, submodule.code);
        } catch {
          console.log(`[LOADER] Failed to load spec for ${submodule.code}`);
        }
      }
    }

    console.warn(
      `[LOADER] ⚠️ No submodule spec found for module ${moduleNumber} with search: "${searchText}"`,
    );
    console.log(
      `[LOADER] Available submodules:`,
      moduleSpec.submodules.map((s) => `${s.code}: ${s.name}`),
    );
    return null;
  } catch (error) {
    console.error(`[LOADER] ❌ Error finding submodule spec:`, error);
    return null;
  }
}

/**
 * Get all requirements from a submodule spec
 */
export function getSubmoduleRequirements(
  moduleNumber: string,
  submoduleCode: string,
): SubmoduleRequirement[] {
  const spec = loadSubmoduleSpec(moduleNumber, submoduleCode);
  return spec.requirements;
}

/**
 * Get mandatory requirements from a submodule spec
 */
export function getMandatorySubmoduleRequirements(
  moduleNumber: string,
  submoduleCode: string,
): SubmoduleRequirement[] {
  return getSubmoduleRequirements(moduleNumber, submoduleCode).filter(
    (req) => req.required,
  );
}

/**
 * Get document structure template for a module
 */
export function getDocumentStructure(moduleNumber: string) {
  const spec = loadModuleSpec(moduleNumber);
  return spec.documentStructureTemplate;
}

/**
 * Get micro-injection categories for a specific submodule
 */
export function getMicroInjectCategories(
  moduleNumber: string,
  submoduleCode: string,
): string[] {
  try {
    const spec = loadSubmoduleSpec(moduleNumber, submoduleCode);
    return spec.micro_inject || [];
  } catch {
    return [];
  }
}
