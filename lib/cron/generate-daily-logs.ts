import { checkDailyLogExists, createDailyLog } from '@/db/queries/daily-logs';
import {
  getActiveLogSchedules,
  getAllActiveLogSchedules,
} from '@/db/queries/log-schedules';
import { getLogTemplateById } from '@/db/queries/log-templates';

/**
 * Check if today matches any of the scheduled days
 */
function shouldCreateLogToday(daysOfWeek: number[] | null): boolean {
  if (!daysOfWeek || daysOfWeek.length === 0) {
    return false;
  }
  const today = new Date().getDay(); // 0=Sunday, 6=Saturday
  return daysOfWeek.includes(today);
}

/**
 * Convert task list array to tasks object with all tasks set to false
 */
function initializeTasks(taskList: string[]): Record<string, boolean> {
  const tasks: Record<string, boolean> = {};
  for (const task of taskList) {
    tasks[task] = false;
  }
  return tasks;
}

/**
 * Generate daily logs for all active schedules
 *
 * @param targetDate - The date to generate logs for (defaults to today)
 * @param orgId - Optional: Filter by organization ID (for testing or manual runs)
 * @returns Array of results indicating success/failure for each schedule
 */
export async function generateDailyLogsFromSchedules(
  targetDate: Date = new Date(),
  orgId?: string
): Promise<{
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Get all active schedules - either for specific org or all orgs
    const schedules = orgId
      ? await getActiveLogSchedules(orgId)
      : await getAllActiveLogSchedules();

    console.log(`Found ${schedules.length} active schedules to process`);

    for (const schedule of schedules) {
      try {
        // Check if log should be created today based on days_of_week
        if (!shouldCreateLogToday(schedule.days_of_week)) {
          console.log(
            `Skipping schedule ${schedule.id} - not scheduled for today`
          );
          results.skipped++;
          continue;
        }

        // Check if schedule is within date range
        const scheduleStartDate = new Date(schedule.start_date);
        if (targetDate < scheduleStartDate) {
          console.log(`Skipping schedule ${schedule.id} - before start date`);
          results.skipped++;
          continue;
        }

        if (schedule.end_date) {
          const scheduleEndDate = new Date(schedule.end_date);
          if (targetDate > scheduleEndDate) {
            console.log(`Skipping schedule ${schedule.id} - after end date`);
            results.skipped++;
            continue;
          }
        }

        // Check if log already exists for this schedule and date
        const exists = await checkDailyLogExists(schedule.id, targetDate);

        if (exists) {
          console.log(
            `Log already exists for schedule ${schedule.id} on ${
              targetDate.toISOString().split('T')[0]
            }`
          );
          results.skipped++;
          continue;
        }

        // Get the template to retrieve task list
        const template = await getLogTemplateById(
          schedule.template_id,
          schedule.org_id
        );

        if (!template) {
          const error = `Template ${schedule.template_id} not found for schedule ${schedule.id}`;
          console.error(error);
          results.errors.push(error);
          results.failed++;
          continue;
        }

        if (!template.task_list || template.task_list.length === 0) {
          const error = `Template ${template.id} has no tasks defined`;
          console.error(error);
          results.errors.push(error);
          results.failed++;
          continue;
        }

        // Check if assignee is set
        if (!schedule.assignee_id) {
          const error = `Schedule ${schedule.id} has no assignee defined`;
          console.error(error);
          results.errors.push(error);
          results.failed++;
          continue;
        }

        // Create the daily log
        const dailyLog = await createDailyLog({
          org_id: schedule.org_id,
          template_id: schedule.template_id,
          schedule_id: schedule.id,
          assignee_id: schedule.assignee_id,
          reviewer_id: schedule.reviewer_id,
          tasks: initializeTasks(template.task_list),
          log_date: targetDate,
          created_by: 'SYSTEM', // System-generated
        });

        if (dailyLog) {
          console.log(
            `Successfully created daily log ${dailyLog.id} for schedule ${schedule.id}`
          );
          results.success++;
        } else {
          const error = `Failed to create log for schedule ${schedule.id}`;
          console.error(error);
          results.errors.push(error);
          results.failed++;
        }
      } catch (error) {
        const errorMessage = `Error processing schedule ${schedule.id}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        console.error(errorMessage);
        results.errors.push(errorMessage);
        results.failed++;
      }
    }

    console.log('Daily log generation completed:', results);
    return results;
  } catch (error) {
    console.error('Fatal error in generateDailyLogsFromSchedules:', error);
    throw error;
  }
}

/**
 * Generate logs for a specific date (useful for backfilling or manual runs)
 */
export async function generateLogsForDate(
  date: Date,
  orgId?: string
): Promise<ReturnType<typeof generateDailyLogsFromSchedules>> {
  console.log(`Generating logs for date: ${date.toISOString().split('T')[0]}`);
  return generateDailyLogsFromSchedules(date, orgId);
}

/**
 * Generate logs for a date range (useful for backfilling)
 */
export async function generateLogsForDateRange(
  startDate: Date,
  endDate: Date,
  orgId?: string
): Promise<{
  totalSuccess: number;
  totalFailed: number;
  totalSkipped: number;
  allErrors: string[];
}> {
  const totalResults = {
    totalSuccess: 0,
    totalFailed: 0,
    totalSkipped: 0,
    allErrors: [] as string[],
  };

  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    console.log(`Processing date: ${currentDate.toISOString().split('T')[0]}`);

    const results = await generateDailyLogsFromSchedules(
      new Date(currentDate),
      orgId
    );

    totalResults.totalSuccess += results.success;
    totalResults.totalFailed += results.failed;
    totalResults.totalSkipped += results.skipped;
    totalResults.allErrors.push(...results.errors);

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log('Date range generation completed:', totalResults);
  return totalResults;
}
