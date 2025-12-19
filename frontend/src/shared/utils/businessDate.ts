import { SystemPreferences } from '@/features/user-management/types';
import { loadSettings } from './settingsStorage';

/**
 * Parse business day start time from settings
 * @param businessDayStartTime - Time string in format "HH:mm" (e.g., "06:00")
 * @returns Object with hours and minutes, or default (6:00 AM)
 */
export function parseBusinessDayStartTime(businessDayStartTime?: string): { hours: number; minutes: number } {
  if (!businessDayStartTime) {
    return { hours: 6, minutes: 0 }; // Default: 6:00 AM
  }

  const match = businessDayStartTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return { hours: 6, minutes: 0 }; // Default on invalid format
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { hours: 6, minutes: 0 }; // Default on invalid values
  }

  return { hours, minutes };
}

/**
 * Get business day start time from settings
 * @param storeId - Optional store ID
 * @returns Object with hours and minutes
 */
export function getBusinessDayStartTime(storeId?: string | null): { hours: number; minutes: number } {
  const settings = loadSettings(storeId);
  return parseBusinessDayStartTime(settings?.businessDayStartTime);
}

/**
 * Calculate the business date for a given calendar date/time
 * A business day runs from businessDayStartTime (e.g., 06:00) until 05:59:59 AM of the next calendar day
 * 
 * Example:
 * - Business Day Start: 06:00 AM
 * - Sale on Dec 20 at 11:59 PM → Business Date: Dec 20
 * - Sale on Dec 21 at 06:00 AM → Business Date: Dec 21
 * - Sale on Dec 21 at 05:59 AM → Business Date: Dec 20 (still part of previous business day)
 * 
 * @param date - The calendar date/time to convert
 * @param businessDayStartTime - Optional business day start time (defaults to 06:00)
 * @returns The business date (as a Date object set to midnight of the business day)
 */
export function getBusinessDate(date: Date, businessDayStartTime?: string): Date {
  const { hours, minutes } = parseBusinessDayStartTime(businessDayStartTime);
  const calendarDate = new Date(date);
  
  // Get the time components
  const saleHour = calendarDate.getHours();
  const saleMinute = calendarDate.getMinutes();
  const saleSecond = calendarDate.getSeconds();
  
  // Create a date at the start of the business day for comparison
  const businessDayStart = new Date(calendarDate);
  businessDayStart.setHours(hours, minutes, 0, 0);
  
  // If the sale time is before the business day start time, it belongs to the previous business day
  if (saleHour < hours || (saleHour === hours && saleMinute < minutes)) {
    // This sale belongs to the previous calendar day's business day
    const previousDay = new Date(calendarDate);
    previousDay.setDate(previousDay.getDate() - 1);
    previousDay.setHours(0, 0, 0, 0);
    return previousDay;
  }
  
  // Otherwise, it belongs to the current calendar day's business day
  const businessDate = new Date(calendarDate);
  businessDate.setHours(0, 0, 0, 0);
  return businessDate;
}

/**
 * Get the start and end datetime range for a business date
 * @param businessDate - The business date (as a Date object at midnight)
 * @param businessDayStartTime - Optional business day start time (defaults to 06:00)
 * @returns Object with start and end Date objects
 */
export function getBusinessDateRange(businessDate: Date, businessDayStartTime?: string): { start: Date; end: Date } {
  const { hours, minutes } = parseBusinessDayStartTime(businessDayStartTime);
  
  // Business day starts at businessDayStartTime on the calendar date
  const start = new Date(businessDate);
  start.setHours(hours, minutes, 0, 0);
  
  // Business day ends at (businessDayStartTime - 1ms) of the next calendar day
  // For example, if start is 06:00, end is 05:59:59.999 of next day
  const end = new Date(businessDate);
  end.setDate(end.getDate() + 1);
  end.setHours(hours, minutes, 0, 0);
  end.setMilliseconds(end.getMilliseconds() - 1); // Subtract 1ms to get 05:59:59.999
  
  return { start, end };
}

/**
 * Check if a date falls within a business date range
 * @param date - The date to check
 * @param businessDate - The business date to check against
 * @param businessDayStartTime - Optional business day start time (defaults to 06:00)
 * @returns True if the date falls within the business date range
 */
export function isDateInBusinessDate(date: Date, businessDate: Date, businessDayStartTime?: string): boolean {
  const range = getBusinessDateRange(businessDate, businessDayStartTime);
  return date >= range.start && date <= range.end;
}

/**
 * Convert a calendar date range to business date range for filtering
 * This is useful when filtering sales by calendar dates but needing to include
 * sales from the business day that spans across calendar days
 * 
 * @param startDate - Start calendar date
 * @param endDate - End calendar date
 * @param businessDayStartTime - Optional business day start time (defaults to 06:00)
 * @returns Object with actual start and end Date objects for querying
 */
export function getBusinessDateFilterRange(
  startDate: Date | string | null,
  endDate: Date | string | null,
  businessDayStartTime?: string
): { start: Date | null; end: Date | null } {
  if (!startDate && !endDate) {
    return { start: null, end: null };
  }

  const { hours, minutes } = parseBusinessDayStartTime(businessDayStartTime);

  let start: Date | null = null;
  let end: Date | null = null;

  if (startDate) {
    const startCal = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
    startCal.setHours(0, 0, 0, 0);
    
    // The business day for this calendar date starts at businessDayStartTime on the calendar date
    // For example, if businessDayStartTime is 02:00 and startDate is March 19,
    // the business day starts at March 19 02:00:00
    const businessDayStart = new Date(startCal);
    businessDayStart.setHours(hours, minutes, 0, 0);
    start = businessDayStart;
  }

  if (endDate) {
    const endCal = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);
    endCal.setHours(23, 59, 59, 999);
    
    // The business day for this calendar date ends at (businessDayStartTime - 1ms) of the next calendar day
    // For example, if businessDayStartTime is 02:00, the business day ends at 01:59:59.999 of the next day
    // So we set the next day to businessDayStartTime and subtract 1ms
    const nextDay = new Date(endCal);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(hours, minutes, 0, 0);
    nextDay.setMilliseconds(nextDay.getMilliseconds() - 1);
    end = nextDay;
  }

  return { start, end };
}

/**
 * Format business day start time for display
 * @param businessDayStartTime - Time string in format "HH:mm"
 * @returns Formatted string (e.g., "06:00 صباحاً")
 */
export function formatBusinessDayStartTime(businessDayStartTime?: string): string {
  const { hours, minutes } = parseBusinessDayStartTime(businessDayStartTime);
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours < 12 ? 'صباحاً' : 'مساءً';
  return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

