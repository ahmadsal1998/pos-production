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
    
    // The business day for this calendar date starts at businessDayStartTime
    // But we need to include sales from the previous calendar day that belong to this business day
    // So we go back one day and start from businessDayStartTime
    const prevDay = new Date(startCal);
    prevDay.setDate(prevDay.getDate() - 1);
    prevDay.setHours(hours, minutes, 0, 0);
    start = prevDay;
  }

  if (endDate) {
    const endCal = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);
    endCal.setHours(23, 59, 59, 999);
    
    // The business day for this calendar date ends at 05:59:59.999 AM of the next calendar day
    // So we extend to the next day's business day start time minus 1ms
    const nextDay = new Date(endCal);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(hours, minutes, 59, 999);
    end = nextDay;
  }

  return { start, end };
}

