import { auth } from "@clerk/nextjs/server";
import {
  createEmptyOverview,
  mergeFrameworkWithOrgState,
} from "@/lib/primus/data-merger";
import { getEnabledModules, getOrgDocuments } from "@/lib/primus/db-helper";
import { loadPrimusFramework } from "@/lib/primus/framework-loader";
import { query } from "@/lib/db/postgres";
import type { DashboardData } from "./types";

const FRAMEWORK_ID = "primus_gfs";

export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    // Get auth context from Clerk
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      console.warn("Dashboard: No authenticated user or org found");
      return { overview: null, documents: [] };
    }

    console.log(`Fetching dashboard data for org: ${orgId}`);

    // Fetch data directly from database functions (no HTTP calls)
    const [enabledModuleIds, documentsResult] = await Promise.all([
      getEnabledModules(orgId, FRAMEWORK_ID),
      query(
        `SELECT * FROM document 
         WHERE org_id = $1 AND deleted_at IS NULL
         ORDER BY updated_at DESC`,
        [orgId],
      ),
    ]);

    const documents = documentsResult.rows;

    console.log(`Org ${orgId} has ${enabledModuleIds.length} modules enabled`);
    console.log(`Loaded ${documents.length} documents for org ${orgId}`);

    // If no modules selected, return not-onboarded response
    if (enabledModuleIds.length === 0) {
      console.log(`Org ${orgId} is not onboarded - no modules selected`);
      return { overview: createEmptyOverview(FRAMEWORK_ID), documents };
    }

    // Load framework and merge with org state
    const framework = await loadPrimusFramework();
    const overview = mergeFrameworkWithOrgState(
      framework,
      enabledModuleIds,
      documents,
    );

    console.log(
      `Returning overview with ${overview.modules.length} modules for org ${orgId}`,
    );

    return { overview, documents };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return { overview: null, documents: [] };
  }
}
