"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var businessDate_exports = {};
__export(businessDate_exports, {
  getBusinessDate: () => getBusinessDate,
  getBusinessDateFilterRange: () => getBusinessDateFilterRange,
  getBusinessDateRange: () => getBusinessDateRange,
  parseBusinessDayStartTime: () => parseBusinessDayStartTime
});
module.exports = __toCommonJS(businessDate_exports);
var import_luxon = require("luxon");
var import_logger = require("./logger");
function parseBusinessDayStartTime(businessDayStartTime) {
  if (!businessDayStartTime) {
    return { hours: 6, minutes: 0 };
  }
  const match = businessDayStartTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return { hours: 6, minutes: 0 };
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { hours: 6, minutes: 0 };
  }
  return { hours, minutes };
}
function getBusinessDate(date, businessDayStartTime) {
  const { hours, minutes } = parseBusinessDayStartTime(businessDayStartTime);
  const calendarDate = new Date(date);
  const saleHour = calendarDate.getHours();
  const saleMinute = calendarDate.getMinutes();
  if (saleHour < hours || saleHour === hours && saleMinute < minutes) {
    const previousDay = new Date(calendarDate);
    previousDay.setDate(previousDay.getDate() - 1);
    previousDay.setHours(0, 0, 0, 0);
    return previousDay;
  }
  const businessDate = new Date(calendarDate);
  businessDate.setHours(0, 0, 0, 0);
  return businessDate;
}
function getBusinessDateRange(businessDate, businessDayStartTime) {
  const { hours, minutes } = parseBusinessDayStartTime(businessDayStartTime);
  const start = new Date(businessDate);
  start.setHours(hours, minutes, 0, 0);
  const end = new Date(businessDate);
  end.setDate(end.getDate() + 1);
  end.setHours(hours, minutes, 0, 0);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return { start, end };
}
function getBusinessDateFilterRange(startDate, endDate, businessDayStartTime, timezone) {
  if (!startDate && !endDate) {
    return { start: null, end: null };
  }
  const { hours, minutes } = parseBusinessDayStartTime(businessDayStartTime);
  const tz = timezone || "UTC";
  if (!timezone) {
    import_logger.log.warn("[BusinessDate] No timezone provided for date filtering, defaulting to UTC. This may cause incorrect business day calculations.", {
      startDate,
      endDate,
      businessDayStartTime
    });
  }
  let start = null;
  let end = null;
  if (startDate) {
    const startDateStr = typeof startDate === "string" ? startDate : startDate.toISOString().split("T")[0];
    const businessDayStart = import_luxon.DateTime.fromISO(startDateStr, { zone: tz }).set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
    start = businessDayStart.toUTC().toJSDate();
    if (start) {
      import_logger.log.debug("[BusinessDate] Start date calculation", {
        inputDate: startDateStr,
        timezone: tz,
        businessDayStartTime: `${hours}:${minutes.toString().padStart(2, "0")}`,
        businessDayStartLocal: businessDayStart.toISO(),
        businessDayStartUTC: start.toISOString(),
        businessDayStartUTCString: start.toUTCString()
      });
    }
  }
  if (endDate) {
    const endDateStr = typeof endDate === "string" ? endDate : endDate.toISOString().split("T")[0];
    const nextDay = import_luxon.DateTime.fromISO(endDateStr, { zone: tz }).plus({ days: 1 }).set({ hour: hours, minute: minutes, second: 0, millisecond: 0 }).minus({ minutes: 1 });
    end = nextDay.toUTC().toJSDate();
    if (end) {
      import_logger.log.debug("[BusinessDate] End date calculation", {
        inputDate: endDateStr,
        timezone: tz,
        businessDayStartTime: `${hours}:${minutes.toString().padStart(2, "0")}`,
        businessDayEndLocal: nextDay.toISO(),
        businessDayEndUTC: end.toISOString(),
        businessDayEndUTCString: end.toUTCString()
      });
    }
  }
  return { start, end };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getBusinessDate,
  getBusinessDateFilterRange,
  getBusinessDateRange,
  parseBusinessDayStartTime
});
