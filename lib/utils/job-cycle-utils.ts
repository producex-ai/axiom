/**
 * Job Cycle Window Utilities
 * 
 * Pure, testable functions for cycle-window based job execution control.
 * Implements logic for:
 * - Exactly one execution per cycle window
 * - Fixed anchor date scheduling (no drift)
 * - Early execution support
 * - Missed cycle catch-up
 * 
 * STATUS DEFINITIONS:
 * - UPCOMING: Execution window hasn't opened yet (today < cycleStart)
 *             User cannot execute the job yet. Shows in "Upcoming" tab.
 * 
 * - OPEN:     Execution window is open (cycleStart <= today < cycleEnd, not executed)
 *             User can execute the job now. Shows in "Open" tab.
 *             This is the actionable state - job is ready to be worked on.
 * 
 * - OVERDUE:  Past the deadline (today >= cycleEnd, not executed)
 *             User missed the deadline. Shows in "Overdue" tab.
 * 
 * - COMPLETED: Executed within current cycle window
 *              Job is done for this cycle. Shows in "Completed" tab.
 */

import type { ScheduleFrequency } from "@/lib/cron/cron-utils";

export interface CycleWindow {
  cycleStart: Date;
  cycleEnd: Date;
}

export interface JobFrequency {
  frequency: ScheduleFrequency;
}

/**
 * Calculate the cycle window boundaries based on next_execution_date.
 * 
 * The cycle window is the period during which a job should be executed exactly once.
 * - cycle_end = next_execution_date (the boundary/anchor of the current cycle)
 * - cycle_start = next_execution_date - frequency
 * 
 * @param nextExecutionDate - The end boundary of the current cycle (UTC)
 * @param frequency - The job's execution frequency
 * @returns The cycle window with start and end dates (UTC)
 * 
 * @example
 * // For a monthly job with next_execution_date = Feb 20, 2026
 * getCycleWindow(new Date('2026-02-20'), 'monthly')
 * // Returns: { cycleStart: Jan 20, 2026, cycleEnd: Feb 20, 2026 }
 */
export function getCycleWindow(
  nextExecutionDate: Date,
  frequency: ScheduleFrequency
): CycleWindow {
  const cycleEnd = new Date(nextExecutionDate);
  const cycleStart = new Date(nextExecutionDate);

  switch (frequency) {
    case "weekly":
      cycleStart.setDate(cycleStart.getDate() - 7);
      break;
    case "monthly":
      cycleStart.setMonth(cycleStart.getMonth() - 1);
      break;
    case "quarterly":
      cycleStart.setMonth(cycleStart.getMonth() - 3);
      break;
    case "half_yearly":
      cycleStart.setMonth(cycleStart.getMonth() - 6);
      break;
    case "yearly":
      cycleStart.setFullYear(cycleStart.getFullYear() - 1);
      break;
  }

  return { cycleStart, cycleEnd };
}

/**
 * Check if a job has already been executed within the current cycle window.
 * 
 * @param lastExecutionDate - The timestamp of the last execution (UTC), or null if never executed
 * @param cycleStart - The start of the current cycle window (UTC)
 * @param cycleEnd - The end of the current cycle window (UTC)
 * @returns true if the job was executed within the cycle window
 * 
 * @example
 * // Cycle: Jan 20 - Feb 20
 * hasExecutedThisCycle(new Date('2026-02-05'), cycleStart, cycleEnd) // true
 * hasExecutedThisCycle(new Date('2026-01-15'), cycleStart, cycleEnd) // false (before cycle)
 * hasExecutedThisCycle(null, cycleStart, cycleEnd) // false (never executed)
 */
export function hasExecutedThisCycle(
  lastExecutionDate: Date | null,
  cycleStart: Date,
  cycleEnd: Date
): boolean {
  if (!lastExecutionDate) {
    return false;
  }

  const execTime = lastExecutionDate.getTime();
  const startTime = cycleStart.getTime();
  const endTime = cycleEnd.getTime();

  // Execution is in cycle if: cycleStart <= lastExecutionDate < cycleEnd
  return execTime >= startTime && execTime < endTime;
}

/**
 * Determine if a job can be executed based on cycle-window logic.
 * 
 * Execution is allowed if:
 * 1. Current date is within or past the cycle start (cycle_start <= today)
 * 2. The job has NOT already executed within the current cycle window
 * 
 * @param lastExecutionDate - The timestamp of the last execution (UTC), or null if never executed
 * @param nextExecutionDate - The end boundary of the current cycle (UTC)
 * @param frequency - The job's execution frequency
 * @param now - Current date (defaults to now, can be overridden for testing)
 * @returns true if the job can be executed
 * 
 * @example
 * // Job never executed and within window
 * canExecuteJob(null, new Date('2026-02-20'), 'monthly', new Date('2026-02-15')) // true
 * 
 * // Job executed inside current cycle
 * canExecuteJob(new Date('2026-02-05'), new Date('2026-02-20'), 'monthly', new Date('2026-02-15')) // false
 * 
 * // Before cycle start
 * canExecuteJob(null, new Date('2026-02-20'), 'monthly', new Date('2026-01-10')) // false
 */
export function canExecuteJob(
  lastExecutionDate: Date | null,
  nextExecutionDate: Date,
  frequency: ScheduleFrequency,
  now: Date = new Date()
): boolean {
  const { cycleStart, cycleEnd } = getCycleWindow(nextExecutionDate, frequency);
  
  // Normalize to start of day for comparison
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const cycleStartDay = new Date(cycleStart);
  cycleStartDay.setUTCHours(0, 0, 0, 0);
  
  // Must be within or past the cycle start date
  if (today < cycleStartDay) {
    return false;
  }
  
  // Must not have already executed in this cycle
  return !hasExecutedThisCycle(lastExecutionDate, cycleStart, cycleEnd);
}

/**
 * Advance the next_execution_date by one frequency period using the previous anchor.
 * 
 * This preserves schedule alignment and prevents drift caused by late executions.
 * The new date is calculated from the PREVIOUS next_execution_date, NOT from current time.
 * 
 * @param currentNextExecutionDate - The current next_execution_date (anchor)
 * @param frequency - The job's execution frequency
 * @returns The new next_execution_date (one period forward from the anchor)
 * 
 * @example
 * // Monthly job with anchor Feb 20
 * advanceNextExecutionDate(new Date('2026-02-20'), 'monthly')
 * // Returns: Mar 20, 2026 (NOT based on execution time)
 */
export function advanceNextExecutionDate(
  currentNextExecutionDate: Date,
  frequency: ScheduleFrequency
): Date {
  const newDate = new Date(currentNextExecutionDate);

  switch (frequency) {
    case "weekly":
      newDate.setDate(newDate.getDate() + 7);
      break;
    case "monthly":
      newDate.setMonth(newDate.getMonth() + 1);
      break;
    case "quarterly":
      newDate.setMonth(newDate.getMonth() + 3);
      break;
    case "half_yearly":
      newDate.setMonth(newDate.getMonth() + 6);
      break;
    case "yearly":
      newDate.setFullYear(newDate.getFullYear() + 1);
      break;
  }

  return newDate;
}

/**
 * Fast-forward next_execution_date to handle missed cycles.
 * 
 * If multiple cycles were missed (e.g., due to downtime), advance the anchor
 * until it's in the future. This does NOT modify last_execution_date.
 * 
 * @param currentNextExecutionDate - The current next_execution_date (may be in the past)
 * @param frequency - The job's execution frequency
 * @param now - The current timestamp (defaults to now, but can be overridden for testing)
 * @returns The new next_execution_date (in the future)
 * 
 * @example
 * // Job missed 3 months (next_execution was Nov 20, now is Feb 21)
 * catchUpMissedCycles(new Date('2025-11-20'), 'monthly', new Date('2026-02-21'))
 * // Returns: Mar 20, 2026 (first future date after catch-up)
 */
export function catchUpMissedCycles(
  currentNextExecutionDate: Date,
  frequency: ScheduleFrequency,
  now: Date = new Date()
): Date {
  let nextDate = new Date(currentNextExecutionDate);

  // Advance until the schedule is in the future
  while (nextDate <= now) {
    nextDate = advanceNextExecutionDate(nextDate, frequency);
  }

  return nextDate;
}

/**
 * Calculate the derived status of a job based on cycle-window logic.
 * 
 * Status determination:
 * - COMPLETED: Executed within current cycle window
 * - OVERDUE: Current cycle has passed (today >= cycleEnd) and not executed
 * - OPEN: Execution window is open (today >= cycleStart) and not executed
 * - UPCOMING: Before execution window (today < cycleStart)
 * 
 * @param lastExecutionDate - The timestamp of the last execution, or null
 * @param nextExecutionDate - The end boundary of the current cycle
 * @param frequency - The job's execution frequency
 * @param now - The current date (defaults to now, but can be overridden for testing)
 * @returns The derived job status
 */
export function deriveJobStatus(
  lastExecutionDate: Date | null,
  nextExecutionDate: Date,
  frequency: ScheduleFrequency,
  now: Date = new Date()
): "UPCOMING" | "OPEN" | "COMPLETED" | "OVERDUE" {
  const { cycleStart, cycleEnd } = getCycleWindow(nextExecutionDate, frequency);
  
  // Normalize dates to start of day for comparison (UTC)
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  
  const cycleStartDay = new Date(cycleStart);
  cycleStartDay.setUTCHours(0, 0, 0, 0);
  
  const cycleEndDay = new Date(cycleEnd);
  cycleEndDay.setUTCHours(0, 0, 0, 0);

  // Check if executed this cycle
  if (hasExecutedThisCycle(lastExecutionDate, cycleStart, cycleEnd)) {
    return "COMPLETED";
  }

  // Not executed in current cycle - determine status based on date
  if (today >= cycleEndDay) {
    return "OVERDUE";
  } else if (today >= cycleStartDay) {
    return "OPEN";
  } else {
    return "UPCOMING";
  }
}
