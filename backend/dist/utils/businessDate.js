"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBusinessDayStartTime = parseBusinessDayStartTime;
exports.getBusinessDate = getBusinessDate;
exports.getBusinessDateRange = getBusinessDateRange;
exports.getBusinessDateFilterRange = getBusinessDateFilterRange;
const luxon_1 = require("luxon");
/**
 * Parse business day start time from settings
 * @param businessDayStartTime - Time string in format "HH:mm" (e.g., "06:00")
 * @returns Object with hours and minutes, or default (6:00 AM)
 */
function parseBusinessDayStartTime(businessDayStartTime) {
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
function getBusinessDate(date, businessDayStartTime) {
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
function getBusinessDateRange(businessDate, businessDayStartTime) {
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
 * Uses timezone-aware calculations to properly handle business days across timezones.
 * The business day start time is interpreted in the store's timezone, then converted to UTC for database queries.
 *
 * @param startDate - Start calendar date
 * @param endDate - End calendar date
 * @param businessDayStartTime - Optional business day start time (defaults to 06:00) in format "HH:mm"
 * @param timezone - Optional timezone (e.g., "Asia/Gaza"). Defaults to UTC if not provided
 * @returns Object with actual start and end Date objects in UTC for querying
 */
function getBusinessDateFilterRange(startDate, endDate, businessDayStartTime, timezone) {
    if (!startDate && !endDate) {
        return { start: null, end: null };
    }
    const { hours, minutes } = parseBusinessDayStartTime(businessDayStartTime);
    const tz = timezone || 'UTC'; // Default to UTC if no timezone provided
    // Log warning if timezone is not provided (this can cause incorrect date filtering)
    if (!timezone) {
        console.warn('[BusinessDate] ⚠️ No timezone provided for date filtering, defaulting to UTC. This may cause incorrect business day calculations.', {
            startDate,
            endDate,
            businessDayStartTime,
        });
    }
    let start = null;
    let end = null;
    if (startDate) {
        // Parse the start date in the store's timezone
        const startDateStr = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
        // Create a DateTime in the store's timezone at the business day start time
        // Example: If startDate is "2024-03-19" and businessDayStartTime is "01:00" in "Asia/Gaza",
        // this creates "2024-03-19 01:00:00" in Asia/Gaza timezone
        const businessDayStart = luxon_1.DateTime.fromISO(startDateStr, { zone: tz })
            .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
        // Convert to UTC for database querying
        start = businessDayStart.toUTC().toJSDate();
        // Log detailed calculation for debugging
        if (start) {
            console.log('[BusinessDate] Start date calculation:', {
                inputDate: startDateStr,
                timezone: tz,
                businessDayStartTime: `${hours}:${minutes.toString().padStart(2, '0')}`,
                businessDayStartLocal: businessDayStart.toISO(),
                businessDayStartUTC: start.toISOString(),
                businessDayStartUTCString: start.toUTCString(),
            });
        }
    }
    if (endDate) {
        // Parse the end date in the store's timezone
        const endDateStr = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
        // The business day for the end date ends at (businessDayStartTime - 1 minute) of the next calendar day
        // Example: If endDate is "2024-03-20" and businessDayStartTime is "01:00" in "Asia/Gaza",
        // the business day ends at "2024-03-21 00:59:59" in Asia/Gaza timezone
        const nextDay = luxon_1.DateTime.fromISO(endDateStr, { zone: tz })
            .plus({ days: 1 })
            .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 })
            .minus({ minutes: 1 }); // Subtract 1 minute to get the end of the business day
        // Convert to UTC for database querying
        end = nextDay.toUTC().toJSDate();
        // Log detailed calculation for debugging
        if (end) {
            console.log('[BusinessDate] End date calculation:', {
                inputDate: endDateStr,
                timezone: tz,
                businessDayStartTime: `${hours}:${minutes.toString().padStart(2, '0')}`,
                businessDayEndLocal: nextDay.toISO(),
                businessDayEndUTC: end.toISOString(),
                businessDayEndUTCString: end.toUTCString(),
            });
        }
    }
    return { start, end };
}
