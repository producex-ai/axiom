/**
 * Date utility functions for handling dates in local timezone
 * Prevents timezone-related date shifting issues with HTML5 date inputs
 */

/**
 * Parse a date string (YYYY-MM-DD) as a local date, not UTC
 * This prevents date shifting when the date comes from the database or date picker
 * 
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Date object in local timezone
 * 
 * @example
 * // Bad: new Date("2026-02-28") → 2026-02-28T00:00:00Z (UTC midnight)
 * // Good: parseLocalDate("2026-02-28") → 2026-02-28T00:00:00 (local midnight)
 */
export function parseLocalDate(dateString: string | Date): Date {
  if (!dateString) {
    return new Date();
  }
  
  if (dateString instanceof Date) {
    return dateString;
  }
  
  // Take only the date part if it's an ISO string
  const datePart = dateString.split('T')[0];
  const parts = datePart.split('-');
  
  if (parts.length !== 3) {
    console.warn('Invalid date format:', dateString);
    return new Date(dateString); // Fallback to native parsing
  }
  
  const [year, month, day] = parts.map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date string for display in local timezone
 * 
 * @param dateString - Date in YYYY-MM-DD format or ISO string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatLocalDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  const date = parseLocalDate(dateString.split('T')[0]); // Take only date part if ISO string
  return date.toLocaleDateString('en-US', options);
}

/**
 * Convert a Date object to YYYY-MM-DD string for date inputs
 * 
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function toDateInputValue(date: Date | string): string {
  if (typeof date === 'string') {
    return date.split('T')[0]; // Already in correct format or ISO string
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
