/**
 * GET /api/frameworks/primus/overview
 *
 * Returns the Primus GFS framework overview for the authenticated org.
 *
 * Purpose:
 * - Check if org has completed onboarding (selected modules)
 * - If onboarded: return complete module structure with document status
 * - If not onboarded: return flag indicating modules need to be selected
 *
 * Response when NOT onboarded:
 * {
 *   "isOnboarded": false,
 *   "frameworkId": "primus_gfs",
 *   "modules": []
 * }
 *
 * Response when onboarded:
 * {
 *   "isOnboarded": true,
 *   "frameworkId": "primus_gfs",
 *   "frameworkName": "PrimusGFS v4.0",
 *   "frameworkVersion": "4.0",
 *   "modules": [
 *     {
 *       "module": "1",
 *       "moduleName": "Food Safety Management System",
 *       "enabled": true,
 *       "totalSubModules": 8,
 *       "documentsCreated": 5,
 *       "documentsReady": 2,
 *       "submodules": [...]
 *     }
 *   ]
 * }
 */

import type { NextRequest } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  createUnauthorizedResponse,
  getAuthContext,
} from "@/lib/primus/auth-helper";
import {
  createEmptyOverview,
  mergeFrameworkWithOrgState,
} from "@/lib/primus/data-merger";
import { getEnabledModules, getOrgDocuments } from "@/lib/primus/db-helper";
import { loadPrimusFramework } from "@/lib/primus/framework-loader";

const FRAMEWORK_ID = "primus_gfs";

export async function GET(req: NextRequest) {
  try {
    // Step 1: Extract orgId from JWT token
    // CRITICAL: Always get orgId from auth context, never from client input
    const authContext = await getAuthContext(req);

    if (!authContext) {
      console.warn("Unauthorized access attempt to Primus overview");
      return createUnauthorizedResponse();
    }

    const { orgId } = authContext;

    console.log(`Fetching Primus overview for org: ${orgId}`);

    // Step 2: Check if org has selected any modules
    // Query org_module table for this org + framework_id
    const enabledModuleIds = await getEnabledModules(orgId, FRAMEWORK_ID);

    console.log(`Org ${orgId} has ${enabledModuleIds.length} modules enabled`);

    // Step 3: If no modules selected, return not-onboarded response
    if (enabledModuleIds.length === 0) {
      console.log(`Org ${orgId} is not onboarded - no modules selected`);
      return createSuccessResponse(createEmptyOverview(FRAMEWORK_ID));
    }

    // Step 4: Org is onboarded - load framework structure and merge with org state
    console.log(
      `Org ${orgId} is onboarded - loading framework and document state`,
    );

    // Load static framework structure from JSON files
    const framework = await loadPrimusFramework();

    // Fetch all documents for this org + framework
    const documents = await getOrgDocuments(orgId, FRAMEWORK_ID);

    console.log(`Loaded ${documents.length} documents for org ${orgId}`);

    // Merge static structure with dynamic org state
    const overview = mergeFrameworkWithOrgState(
      framework,
      enabledModuleIds,
      documents,
    );

    console.log(
      `Returning overview with ${overview.modules.length} modules for org ${orgId}`,
    );

    // Step 5: Return merged overview
    return createSuccessResponse(overview);
  } catch (error) {
    console.error("Error fetching Primus overview:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Internal server error",
    );
  }
}
