/**
 * Framework Loader
 *
 * Loads static Primus GFS framework structure from JSON files.
 * This module reads the module and submodule definitions to build
 * the framework structure used for document management.
 */

import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Module structure from JSON
 */
export interface PrimusModule {
  module: string;
  moduleName: string;
  description: string;
  scope: string;
  totalSubmodules: number;
  totalQuestions: number;
  totalPoints: number;
  officialSource: string;
  submodules: SubModule[];
  complianceKeywords?: Record<string, string[]>;
  documentStructureTemplate?: unknown;
}

/**
 * Sub-module structure
 */
export interface SubModule {
  code: string;
  name: string;
  alias: string;
  specFile: string;
  questionsCount: number;
  totalPoints: number;
  micro_inject: string[];
  subSubModules?: SubSubModule[];
}

/**
 * Sub-sub-module structure (optional, only for modules like 4)
 */
export interface SubSubModule {
  code: string;
  name: string;
  alias: string;
  specFile: string;
  questionsCount: number;
  totalPoints: number;
}

/**
 * Complete framework structure
 */
export interface PrimusFramework {
  frameworkId: string;
  name: string;
  version: string;
  modules: PrimusModule[];
}

/**
 * Load all Primus modules from static JSON files
 *
 * Reads module files (module_1.json through module_7.json) and returns
 * the complete framework structure. This is a synchronous read of static
 * data that defines the framework's compliance structure.
 */
export async function loadPrimusFramework(): Promise<PrimusFramework> {
  const specPath = join(process.cwd(), "server", "primus", "spec", "modules");

  // Load all module files (1-7)
  const modulePromises = [1, 2, 3, 4, 5, 6, 7].map(async (num) => {
    const filePath = join(specPath, `module_${num}.json`);
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as PrimusModule;
  });

  const modules = await Promise.all(modulePromises);

  // For modules with sub-sub-modules (like module 4), load them
  for (const module of modules) {
    if (module.module === "4") {
      // Module 4 has nested structure: 4.04.01, 4.04.02, etc.
      await loadSubSubModules(module);
    }
  }

  return {
    frameworkId: "primus_gfs",
    name: "PrimusGFS v4.0",
    version: "4.0",
    modules,
  };
}

/**
 * Load sub-sub-modules for modules that have them
 *
 * Some modules (like Module 4) have a three-level hierarchy:
 * Module > Sub-module > Sub-sub-module
 * This function loads those nested structures.
 */
async function loadSubSubModules(module: PrimusModule): Promise<void> {
  const submodulesPath = join(
    process.cwd(),
    "server",
    "primus",
    "spec",
    "submodules",
    `module_${module.module}`,
  );

  for (const submodule of module.submodules) {
    // Check if this submodule has nested structure (e.g., 4.04, 4.05)
    const submoduleDir = join(submodulesPath, submodule.code);

    try {
      // Try to read directory - if it exists, it has sub-sub-modules
      const { readdir } = await import("fs/promises");
      const files = await readdir(submoduleDir);

      // Load sub-sub-module files
      const subSubModules: SubSubModule[] = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = join(submoduleDir, file);
          const content = await readFile(filePath, "utf-8");
          const data = JSON.parse(content);

          subSubModules.push({
            code: data.code,
            name: data.title,
            alias: data.code.replace(/\./g, "_"),
            specFile: file,
            questionsCount: data.requirements?.length || 0,
            totalPoints:
              data.requirements?.reduce(
                (sum: number, req: { points: number }) => sum + req.points,
                0,
              ) || 0,
          });
        }
      }

      submodule.subSubModules = subSubModules.sort((a, b) =>
        a.code.localeCompare(b.code),
      );
    } catch {}
  }
}

/**
 * Get a specific module by ID
 */
export async function getModuleById(
  moduleId: string,
): Promise<PrimusModule | null> {
  const framework = await loadPrimusFramework();
  return framework.modules.find((m) => m.module === moduleId) || null;
}

/**
 * Get all module IDs
 */
export async function getAllModuleIds(): Promise<string[]> {
  const framework = await loadPrimusFramework();
  return framework.modules.map((m) => m.module);
}
