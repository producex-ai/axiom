/**
 * POST /api/db/reset-pool
 * Force reset the database connection pool when connections are stuck
 * Development/Admin only endpoint
 */

import { NextResponse } from 'next/server';
import { resetPool } from '@/lib/db/postgres';

export async function POST() {
  try {
    console.log('[API] Resetting database connection pool...');
    await resetPool();
    
    return NextResponse.json({
      success: true,
      message: 'Database connection pool reset successfully. Next query will create fresh connections.',
    });
  } catch (error) {
    console.error('[API] Error resetting pool:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset connection pool',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
