/**
 * POST /api/frameworks/primus/modules
 *
 * Save selected modules during Primus GFS onboarding.
 *
 * Purpose:
 * - Save user's module selection during onboarding
 * - Enable framework for the org if not already enabled
 * - Replace any existing module selections
 *
 * Input:
 * {
 *   "moduleIds": ["1", "2", "5"]
 * }
 *
 * Behavior:
 * 1. Validate input (moduleIds must be valid)
 * 2. Get orgId from JWT (never trust client)
 * 3. Ensure org_framework has entry for this org + framework
 * 4. Delete existing org_module rows for this org + framework
 * 5. Insert new rows (one per moduleId)
 * 6. Return success
 *
 * Response:
 * {
 *   "success": true,
 *   "modulesEnabled": 3,
 *   "frameworkId": "primus_gfs"
 * }
 */

import type { NextRequest } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  createUnauthorizedResponse,
  getAuthContext,
} from "@/lib/primus/auth-helper";
import { saveEnabledModules } from "@/lib/primus/db-helper";
import { getAllModuleIds } from "@/lib/primus/framework-loader";

const FRAMEWORK_ID = "primus_gfs";

/**
 * Request body schema
 */
interface ModuleSelectionRequest {
  moduleIds: string[];
}

/**
 * Validate request body
 */
function validateRequest(body: unknown): {
  valid: boolean;
  error?: string;
  data?: ModuleSelectionRequest;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const { moduleIds } = body as Partial<ModuleSelectionRequest>;

  if (!Array.isArray(moduleIds)) {
    return { valid: false, error: "moduleIds must be an array" };
  }

  if (moduleIds.length === 0) {
    return {
      valid: false,
      error: "At least one module must be selected",
    };
  }

  // Validate each moduleId is a string
  for (const id of moduleIds) {
    if (typeof id !== "string" || id.trim() === "") {
      return {
        valid: false,
        error: "All moduleIds must be non-empty strings",
      };
    }
  }

  // Remove duplicates
  const uniqueModuleIds = [...new Set(moduleIds.map((id) => id.trim()))];

  return {
    valid: true,
    data: { moduleIds: uniqueModuleIds },
  };
}

/**
 * Validate module IDs against framework structure
 */
async function validateModuleIds(moduleIds: string[]): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Load valid module IDs from framework
  const validModuleIds = await getAllModuleIds();

  // Check each provided ID is valid
  for (const id of moduleIds) {
    if (!validModuleIds.includes(id)) {
      return {
        valid: false,
        error: `Invalid module ID: ${id}. Valid IDs are: ${validModuleIds.join(", ")}`,
      };
    }
  }

  return { valid: true };
}

export async function POST(req: NextRequest) {
  try {
    // Step 1: Extract orgId from JWT token
    // CRITICAL: Always get orgId from auth context, never from client input
    const authContext = await getAuthContext(req);

    if (!authContext) {
      console.warn("Unauthorized access attempt to module selection");
      return createUnauthorizedResponse();
    }

    const { orgId } = authContext;

    console.log(`Processing module selection for org: ${orgId}`);

    // Step 2: Parse and validate request body
    const body = await req.json();
    const validation = validateRequest(body);

    if (!validation.valid || !validation.data) {
      console.warn(
        `Invalid request body from org ${orgId}: ${validation.error}`,
      );
      return createErrorResponse(validation.error || "Invalid request", 400);
    }

    const { moduleIds } = validation.data;

    console.log(`Org ${orgId} selected modules: ${moduleIds.join(", ")}`);

    // Step 3: Validate module IDs against framework
    const moduleValidation = await validateModuleIds(moduleIds);

    if (!moduleValidation.valid) {
      console.warn(
        `Invalid module IDs from org ${orgId}: ${moduleValidation.error}`,
      );
      return createErrorResponse(
        moduleValidation.error || "Invalid module IDs",
        400,
      );
    }

    // Step 4: Save module selections
    // This function will:
    // - Enable the framework if not already enabled
    // - Delete existing module selections
    // - Insert new module selections
    await saveEnabledModules(orgId, FRAMEWORK_ID, moduleIds);

    console.log(
      `Successfully saved ${moduleIds.length} modules for org ${orgId}`,
    );

    // Step 5: Return success response
    return createSuccessResponse({
      success: true,
      modulesEnabled: moduleIds.length,
      frameworkId: FRAMEWORK_ID,
      message: "Modules saved successfully",
    });
  } catch (error) {
    console.error("Error saving module selection:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Internal server error",
    );
  }
}
