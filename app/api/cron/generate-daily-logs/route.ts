import { type NextRequest, NextResponse } from 'next/server';
import { generateDailyLogsFromSchedules } from '@/lib/cron/generate-daily-logs';

export async function GET(request: NextRequest) {
  try {
    // Verify authorization token (use environment variable for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron job attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get optional date parameter (for testing/backfilling)
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    console.log(
      `Running daily log generation cron for date: ${targetDate.toISOString()}`
    );

    // Generate logs
    const results = await generateDailyLogsFromSchedules(targetDate);

    console.log('Cron job completed:', results);

    return NextResponse.json({
      message: 'Daily log generation completed',
      date: targetDate.toISOString().split('T')[0],
      results,
    });
  } catch (error) {
    console.error('Error in daily log cron job:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual triggering or backfilling
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, orgId } = body;

    const targetDate = date ? new Date(date) : new Date();

    console.log(
      `Manual daily log generation for date: ${targetDate.toISOString()}, orgId: ${
        orgId || 'all'
      }`
    );

    const results = await generateDailyLogsFromSchedules(targetDate, orgId);

    return NextResponse.json({
      message: 'Daily log generation completed',
      date: targetDate.toISOString().split('T')[0],
      orgId: orgId || 'all',
      results,
    });
  } catch (error) {
    console.error('Error in manual daily log generation:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
