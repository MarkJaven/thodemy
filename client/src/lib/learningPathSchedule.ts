const HOLIDAY_API_BASE = "https://date.nager.at/api/v3/PublicHolidays";

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

const holidayCache = new Map<number, Set<string>>();

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

const buildFallbackHolidaySet = (year: number) => {
  const set = new Set<string>();
  FIXED_PH_HOLIDAYS_MMDD.forEach((entry) => {
    set.add(`${year}-${entry}`);
  });
  set.add(getLastMondayOfAugust(year));
  return set;
};

const loadPhilippineHolidays = async (year: number): Promise<Set<string>> => {
  if (holidayCache.has(year)) {
    return holidayCache.get(year) as Set<string>;
  }
  try {
    const response = await fetch(`${HOLIDAY_API_BASE}/${year}/PH`);
    if (!response.ok) {
      throw new Error(`Holiday API error (${response.status})`);
    }
    const data = (await response.json()) as Array<{ date: string }>;
    const set = new Set<string>(data.map((entry) => entry.date));
    holidayCache.set(year, set);
    return set;
  } catch {
    const fallback = buildFallbackHolidaySet(year);
    holidayCache.set(year, fallback);
    return fallback;
  }
};

export const calculateLearningPathEndDate = async (
  startDate: Date,
  totalDays: number
) => {
  if (!Number.isFinite(totalDays) || totalDays <= 0) {
    return new Date(startDate.getTime());
  }

  const holidaySet = new Set<string>();
  const cursor = new Date(startDate.getTime());
  let remaining = Math.ceil(totalDays);

  while (remaining > 0) {
    const year = cursor.getFullYear();
    const yearHolidays = await loadPhilippineHolidays(year);
    yearHolidays.forEach((entry) => holidaySet.add(entry));

    if (!isWeekend(cursor) && !holidaySet.has(toDateKey(cursor))) {
      remaining -= 1;
    }
    if (remaining === 0) break;
    cursor.setDate(cursor.getDate() + 1);
  }

  return cursor;
};
