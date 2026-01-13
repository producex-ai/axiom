/**
 * Utility functions for generating cron expressions based on schedule frequency
 */

export type ScheduleFrequency =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "yearly";

export const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half Yearly",
  yearly: "Yearly",
};

export const FREQUENCY_DESCRIPTIONS: Record<ScheduleFrequency, string> = {
  weekly: "Runs on selected days of the week",
  monthly: "Runs on the same day each month",
  quarterly: "Runs every quarter (Jan, Apr, Jul, Oct)",
  half_yearly: "Runs twice a year (Jan, Jul)",
  yearly: "Runs once a year",
};

interface CronConfig {
  frequency: ScheduleFrequency;
  daysOfWeek?: number[]; // For weekly: 0=Sun, 6=Sat
  dayOfMonth?: number; // For monthly+: 1-31
  monthOfYear?: number; // For yearly: 1-12
  timesPerDay?: number; // 1-4
}

/**
 * Get the schedule months for quarterly and half-yearly frequencies
 */
export function getScheduleMonths(frequency: ScheduleFrequency): number[] {
  switch (frequency) {
    case "quarterly":
      return [1, 4, 7, 10]; // January, April, July, October
    case "half_yearly":
      return [1, 7]; // January, July
    default:
      return [];
  }
}

/**
 * Get month names for display
 */
export function getMonthNames(months: number[]): string[] {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months.map((m) => monthNames[m - 1]);
}

/**
 * Get formatted schedule info for display
 */
export function getScheduleInfo(config: CronConfig): string {
  const { frequency, daysOfWeek, dayOfMonth, monthOfYear } = config;

  switch (frequency) {
    case "weekly": {
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const selectedDayNames =
        daysOfWeek?.map((d) => dayNames[d]).join(", ") || "No days selected";
      return `Every ${selectedDayNames}`;
    }

    case "monthly":
      return `On day ${dayOfMonth || 1} of every month`;

    case "quarterly": {
      const months = getScheduleMonths("quarterly");
      const monthNames = getMonthNames(months);
      return `On day ${dayOfMonth || 1} in ${monthNames.join(", ")}`;
    }

    case "half_yearly": {
      const months = getScheduleMonths("half_yearly");
      const monthNames = getMonthNames(months);
      return `On day ${dayOfMonth || 1} in ${monthNames.join(" and ")}`;
    }

    case "yearly": {
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const month = monthNames[(monthOfYear || 1) - 1];
      return `On ${month} ${dayOfMonth || 1} every year`;
    }

    default:
      return "No schedule configured";
  }
}

/**
 * Generate time schedule based on times per day
 */
function getTimeSchedule(timesPerDay: number): string {
  switch (timesPerDay) {
    case 1:
      return "9"; // 9 AM
    case 2:
      return "9,15"; // 9 AM, 3 PM
    case 3:
      return "9,13,17"; // 9 AM, 1 PM, 5 PM
    case 4:
      return "9,12,15,18"; // 9 AM, 12 PM, 3 PM, 6 PM
    default:
      return "9";
  }
}

/**
 * Generate cron expression from schedule configuration
 * Cron format: minute hour day-of-month month day-of-week
 */
export function generateCronExpression(config: CronConfig): string {
  const {
    frequency,
    daysOfWeek,
    dayOfMonth,
    monthOfYear,
    timesPerDay = 1,
  } = config;

  const timeSchedule = getTimeSchedule(timesPerDay);

  switch (frequency) {
    case "weekly":
      // "0 9 * * 1,3,5" - 9 AM on Mon, Wed, Fri
      return `0 ${timeSchedule} * * ${daysOfWeek?.join(",") || "*"}`;

    case "monthly":
      // "0 9 15 * *" - 9 AM on 15th of every month
      return `0 ${timeSchedule} ${dayOfMonth || 1} * *`;

    case "quarterly":
      // "0 9 1 1,4,7,10 *" - 9 AM on 1st of Jan, Apr, Jul, Oct
      return `0 ${timeSchedule} ${dayOfMonth || 1} 1,4,7,10 *`;

    case "half_yearly":
      // "0 9 1 1,7 *" - 9 AM on 1st of Jan, Jul
      return `0 ${timeSchedule} ${dayOfMonth || 1} 1,7 *`;

    case "yearly":
      // "0 9 1 1 *" - 9 AM on Jan 1st
      return `0 ${timeSchedule} ${dayOfMonth || 1} ${monthOfYear || 1} *`;

    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
}
