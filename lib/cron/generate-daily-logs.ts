import { countDailyLogs, createDailyLog } from '@/db/queries/daily-logs';
import {
  getActiveLogSchedules,
  getAllActiveLogSchedules,
} from '@/db/queries/log-schedules';
import { getLogTemplateById } from '@/db/queries/log-templates';
import type { ScheduleFrequency } from '@/lib/cron/cron-utils';

/**
 * Check if a log should be created today based on schedule frequency
 */
function shouldCreateLogToday(
  frequency: ScheduleFrequency,
  daysOfWeek: number[] | null,
  dayOfMonth: number | null,
  monthOfYear: number | null,
  targetDate: Date = new Date()
): boolean {
  const today = targetDate.getDay(); // 0=Sunday, 6=Saturday
  const currentDayOfMonth = targetDate.getDate(); // 1-31
  const currentMonth = targetDate.getMonth() + 1; // 1=January, 12=December

  switch (frequency) {
    case 'weekly':
      // Check if today is in the selected days of week
      if (!daysOfWeek || daysOfWeek.length === 0) {
        return false;
      }
      return daysOfWeek.includes(today);

    case 'monthly':
      // Check if today matches the day of month
      if (!dayOfMonth) {
        return false;
      }
      return currentDayOfMonth === dayOfMonth;

    case 'quarterly': {
      // Check if today matches the day of month AND current month is Jan, Apr, Jul, or Oct
      if (!dayOfMonth) {
        return false;
      }
      const quarterlyMonths = [1, 4, 7, 10];
      return (
        currentDayOfMonth === dayOfMonth &&
        quarterlyMonths.includes(currentMonth)
      );
    }

    case 'half_yearly': {
      // Check if today matches the day of month AND current month is Jan or Jul
      if (!dayOfMonth) {
        return false;
      }
      const halfYearlyMonths = [1, 7];
      return (
        currentDayOfMonth === dayOfMonth &&
        halfYearlyMonths.includes(currentMonth)
      );
    }

    case 'yearly':
      // Check if today matches both the day of month and month of year
      if (!dayOfMonth || !monthOfYear) {
        return false;
      }
      return currentDayOfMonth === dayOfMonth && currentMonth === monthOfYear;

    default:
      console.warn(`Unknown frequency type: ${frequency}`);
      return false;
  }
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
        // Check if log should be created today based on frequency
        if (
          !shouldCreateLogToday(
            schedule.frequency,
            schedule.days_of_week,
            schedule.day_of_month,
            schedule.month_of_year,
            targetDate
          )
        ) {
          console.log(
            `Skipping schedule ${schedule.id} - not scheduled for ${
              targetDate.toISOString().split('T')[0]
            } (frequency: ${schedule.frequency})`
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
        const timesPerDay = schedule.times_per_day || 1;

        // Check existing logs count
        const existingCount = await countDailyLogs(schedule.id, targetDate);

        if (existingCount >= timesPerDay) {
          console.log(
            `All ${timesPerDay} logs already exist for schedule ${
              schedule.id
            } on ${targetDate.toISOString().split('T')[0]}`
          );
          results.skipped++;
          continue;
        }

        // Calculate how many more logs to create
        const logsToCreate = timesPerDay - existingCount;

        // Create remaining logs based on times_per_day
        let logsCreated = 0;
        for (let i = 0; i < logsToCreate; i++) {
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
            break;
          }

          if (!template.task_list || template.task_list.length === 0) {
            const error = `Template ${template.id} has no tasks defined`;
            console.error(error);
            results.errors.push(error);
            results.failed++;
            break;
          }

          // Check if assignee is set
          if (!schedule.assignee_id) {
            const error = `Schedule ${schedule.id} has no assignee defined`;
            console.error(error);
            results.errors.push(error);
            results.failed++;
            break;
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
              `Successfully created daily log ${dailyLog.id} (${
                existingCount + i + 1
              }/${timesPerDay}) for schedule ${schedule.id}`
            );
            logsCreated++;
          } else {
            const error = `Failed to create log (${
              existingCount + i + 1
            }/${timesPerDay}) for schedule ${schedule.id}`;
            console.error(error);
            results.errors.push(error);
            results.failed++;
            break;
          }
        }

        if (logsCreated > 0) {
          results.success += logsCreated;
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
