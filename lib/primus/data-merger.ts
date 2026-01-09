/**
 * Data Merger for Primus Framework
 *
 * Merges static framework structure (from JSON) with dynamic org state (from DB).
 * This creates the complete view of modules, sub-modules, and document status
 * for a specific organization.
 */

import type { Document } from "./db-helper";
import type {
  PrimusFramework,
  PrimusModule,
  SubModule,
  SubSubModule,
} from "./framework-loader";

/**
 * Module with org-specific state
 */
export interface ModuleWithState
  extends Omit<
    PrimusModule,
    "submodules" | "complianceKeywords" | "documentStructureTemplate"
  > {
  enabled: boolean;
  totalSubModules: number;
  documentsCreated: number;
  documentsReady: number;
  submodules: SubModuleWithState[];
}

/**
 * Sub-module with org-specific state
 */
export interface SubModuleWithState extends SubModule {
  hasSubSubModules: boolean;
  document?: {
    id: string;
    status: "draft" | "published" | "archived";
    title: string;
    contentKey: string;
    version: number;
    analysisScore?: any | null;
    updatedBy?: string | null;
    updatedAt?: string;
    publishedAt?: string | null;
    renewal?: string | null;
    docType?: string | null;
  };
  subSubModules?: SubSubModuleWithState[];
}

/**
 * Sub-sub-module with org-specific state
 */
export interface SubSubModuleWithState extends SubSubModule {
  document?: {
    id: string;
    status: "draft" | "published" | "archived";
    title: string;
    contentKey: string;
    version: number;
    analysisScore?: any | null;
    updatedBy?: string | null;
    updatedAt?: string;
    publishedAt?: string | null;
    renewal?: string | null;
    docType?: string | null;
  };
}

/**
 * Framework overview response
 */
export interface FrameworkOverview {
  isOnboarded: boolean;
  frameworkId: string;
  frameworkName: string;
  frameworkVersion: string;
  modules: ModuleWithState[];
}

/**
 * Merge framework structure with org state
 *
 * Takes static framework definition and enriches it with:
 * - Which modules the org has enabled
 * - Document status for each sub-module
 * - Progress statistics (total docs, docs created, docs ready)
 *
 * This is the main function for building the overview API response.
 */
export function mergeFrameworkWithOrgState(
  framework: PrimusFramework,
  enabledModuleIds: string[],
  documents: Document[],
): FrameworkOverview {
  // Build a map of documents by sub-module for quick lookup
  // Only include compliance documents (exclude company/supporting documents)
  const docMap = new Map<string, Document>();

  for (const doc of documents) {
    // Filter to only include compliance documents
    if (doc.doc_type !== 'compliance') {
      continue;
    }
    
    // Key format: "moduleId:subModuleId" or "moduleId:subModuleId:subSubModuleId"
    const key = doc.sub_sub_module_id
      ? `${doc.module_id}:${doc.sub_module_id}:${doc.sub_sub_module_id}`
      : `${doc.module_id}:${doc.sub_module_id}`;
    docMap.set(key, doc);
  }

  // Process each module
  const modulesWithState: ModuleWithState[] = framework.modules
    .filter((module) => enabledModuleIds.includes(module.module))
    .map((module) => {
      // Process sub-modules
      const submodulesWithState = module.submodules.map((submodule) =>
        processSubModule(module.module, submodule, docMap),
      );

      // Calculate module-level stats
      const stats = calculateModuleStats(submodulesWithState);

      // Count total sub-modules including nested sub-sub-modules
      const totalSubModulesCount = submodulesWithState.reduce((count, sub) => {
        if (sub.hasSubSubModules && sub.subSubModules) {
          return count + sub.subSubModules.length;
        }
        return count + 1;
      }, 0);

      // Exclude unnecessary fields that are only needed for doc generation
      const {
        complianceKeywords,
        documentStructureTemplate,
        submodules,
        ...moduleData
      } = module as PrimusModule & {
        complianceKeywords?: unknown;
        documentStructureTemplate?: unknown;
      };

      return {
        ...moduleData,
        enabled: true,
        totalSubModules: totalSubModulesCount,
        documentsCreated: stats.documentsCreated,
        documentsReady: stats.documentsReady,
        submodules: submodulesWithState,
      };
    });

  return {
    isOnboarded: enabledModuleIds.length > 0,
    frameworkId: framework.frameworkId,
    frameworkName: framework.name,
    frameworkVersion: framework.version,
    modules: modulesWithState,
  };
}

/**
 * Process a sub-module and attach document state
 */
function processSubModule(
  moduleId: string,
  submodule: SubModule,
  docMap: Map<string, Document>,
): SubModuleWithState {
  const hasSubSubModules =
    !!submodule.subSubModules && submodule.subSubModules.length > 0;

  // If has sub-sub-modules, process them
  if (hasSubSubModules && submodule.subSubModules) {
    const subSubModulesWithState = submodule.subSubModules.map((subSub) =>
      processSubSubModule(moduleId, submodule.code, subSub, docMap),
    );

    return {
      ...submodule,
      hasSubSubModules: true,
      subSubModules: subSubModulesWithState,
    };
  }

  // No sub-sub-modules, check for direct document
  const docKey = `${moduleId}:${submodule.code}`;
  const doc = docMap.get(docKey);

  return {
    ...submodule,
    hasSubSubModules: false,
    document: doc
      ? {
          id: doc.id,
          status: doc.status,
          title: doc.title,
          contentKey: doc.content_key,
          version: doc.current_version,
          analysisScore: doc.analysis_score,
          updatedBy: doc.updated_by || doc.created_by,
          updatedAt: doc.updated_at,
          publishedAt: doc.published_at,
          renewal: doc.renewal,
          docType: doc.doc_type,
        }
      : undefined,
  };
}

/**
 * Process a sub-sub-module and attach document state
 */
function processSubSubModule(
  moduleId: string,
  subModuleId: string,
  subSubModule: SubSubModule,
  docMap: Map<string, Document>,
): SubSubModuleWithState {
  const docKey = `${moduleId}:${subModuleId}:${subSubModule.code}`;
  const doc = docMap.get(docKey);

  return {
    ...subSubModule,
    document: doc
      ? {
          id: doc.id,
          status: doc.status,
          title: doc.title,
          contentKey: doc.content_key,
          version: doc.current_version,
          analysisScore: doc.analysis_score,
          updatedBy: doc.updated_by || doc.created_by,
          updatedAt: doc.updated_at,
          publishedAt: doc.published_at,
          renewal: doc.renewal,
          docType: doc.doc_type,
        }
      : undefined,
  };
}

/**
 * Calculate stats for a module based on its sub-modules
 */
function calculateModuleStats(submodules: SubModuleWithState[]): {
  documentsCreated: number;
  documentsReady: number;
} {
  let documentsCreated = 0;
  let documentsReady = 0;

  for (const submodule of submodules) {
    if (submodule.hasSubSubModules && submodule.subSubModules) {
      // Count documents in sub-sub-modules
      for (const subSub of submodule.subSubModules) {
        if (subSub.document) {
          documentsCreated++;
          if (subSub.document.status === "published") {
            documentsReady++;
          }
        }
      }
    } else if (submodule.document) {
      // Count direct document
      documentsCreated++;
      if (submodule.document.status === "published") {
        documentsReady++;
      }
    }
  }

  return { documentsCreated, documentsReady };
}

/**
 * Create empty overview (for non-onboarded orgs)
 */
export function createEmptyOverview(frameworkId: string): FrameworkOverview {
  return {
    isOnboarded: false,
    frameworkId,
    frameworkName: "PrimusGFS v4.0",
    frameworkVersion: "4.0",
    modules: [],
  };
}
