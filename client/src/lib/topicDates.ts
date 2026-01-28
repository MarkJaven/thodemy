const FIXED_PH_HOLIDAYS_MMDD = [
  "01-01",
  "04-09",
  "05-01",
  "06-12",
  "08-21",
  "11-30",
  "12-25",
  "12-30",
];

const pad = (value: number) => String(value).padStart(2, "0");

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const isWeekend = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const getLastMondayOfAugust = (year: number) => {
  const date = new Date(year, 7, 31);
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() - 1);
  }
  return toDateKey(date);
};

const buildHolidaySet = (startDate: Date, spanDays: number) => {
  const endDate = new Date(startDate.getTime());
  endDate.setDate(endDate.getDate() + Math.max(1, Math.ceil(spanDays)) + 366);

  const holidaySet = new Set<string>();
  for (let year = startDate.getFullYear(); year <= endDate.getFullYear(); year += 1) {
    FIXED_PH_HOLIDAYS_MMDD.forEach((entry) => {
      holidaySet.add(`${year}-${entry}`);
    });
    holidaySet.add(getLastMondayOfAugust(year));
  }
  return holidaySet;
};

const toWorkingDays = (timeAllocated: number, unit?: "hours" | "days" | null) => {
  if (!Number.isFinite(timeAllocated) || timeAllocated <= 0) {
    return 0;
  }
  if (unit === "hours") {
    return Math.max(1, Math.ceil(timeAllocated / 8));
  }
  return Math.max(1, Math.ceil(timeAllocated));
};

export const calculateTopicEndDate = (
  startDate: Date,
  timeAllocated: number,
  timeUnit?: "hours" | "days" | null
) => {
  const daysToAllocate = toWorkingDays(timeAllocated, timeUnit);
  if (daysToAllocate === 0) {
    return new Date(startDate.getTime());
  }
  const holidaySet = buildHolidaySet(startDate, daysToAllocate);

  const cursor = new Date(startDate.getTime());
  let remaining = daysToAllocate;

  while (remaining > 0) {
    if (!isWeekend(cursor) && !holidaySet.has(toDateKey(cursor))) {
      remaining -= 1;
    }
    if (remaining === 0) break;
    cursor.setDate(cursor.getDate() + 1);
  }

  return cursor;
};

export const calculateCourseEndDate = (startDate: Date, totalDays: number) => {
  if (!Number.isFinite(totalDays) || totalDays <= 0) {
    return new Date(startDate.getTime());
  }
  return calculateTopicEndDate(startDate, totalDays, "days");
};
