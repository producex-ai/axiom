/**
 * GET /api/health/db
 *
 * Database health check endpoint.
 * Tests PostgreSQL connection and returns status.
 */

import { NextResponse } from "next/server";
import { query } from "@/lib/db/postgres";

export async function GET() {
  try {
    // Test basic connection
    const result = await query("SELECT NOW() as now, version() as version");

    const now = result.rows[0]?.now;
    const version = result.rows[0]?.version;

    // Test if Primus tables exist
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('org_framework', 'org_module', 'document')
      ORDER BY table_name
    `);

    const existingTables = tableCheck.rows.map((row: any) => row.table_name);
    const requiredTables = ["org_framework", "org_module", "document"];
    const missingTables = requiredTables.filter(
      (t) => !existingTables.includes(t),
    );

    return NextResponse.json({
      status: "connected",
      timestamp: now,
      version,
      tables: {
        existing: existingTables,
        missing: missingTables,
        allPresent: missingTables.length === 0,
      },
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        hint: "Check if database is running and credentials are correct",
      },
      { status: 500 },
    );
  }
}
