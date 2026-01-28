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

const pad = (value) => String(value).padStart(2, "0");

const toDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const getLastMondayOfAugust = (year) => {
  const date = new Date(year, 7, 31);
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() - 1);
  }
  return toDateKey(date);
};

const buildHolidaySet = (startDate, spanDays) => {
  const endDate = new Date(startDate.getTime());
  endDate.setDate(endDate.getDate() + Math.max(1, Math.ceil(spanDays)) + 366);

  const holidaySet = new Set();
  for (let year = startDate.getFullYear(); year <= endDate.getFullYear(); year += 1) {
    FIXED_PH_HOLIDAYS_MMDD.forEach((entry) => {
      holidaySet.add(`${year}-${entry}`);
    });
    holidaySet.add(getLastMondayOfAugust(year));
  }
  return holidaySet;
};

const calculateCourseTotals = (topics) => {
  const totalHours = topics.reduce((sum, topic) => {
    const time = Number(topic.time_allocated) || 0;
    if (topic.time_unit === "days") {
      return sum + time * 8;
    }
    return sum + time;
  }, 0);
  const totalDays = totalHours > 0 ? Math.ceil(totalHours / 8) : 0;
  return { totalHours, totalDays };
};

const calculateCourseEndDate = (startDate, totalDays) => {
  if (!totalDays || totalDays <= 0) {
    return new Date(startDate.getTime());
  }
  const holidaySet = buildHolidaySet(startDate, totalDays);
  const cursor = new Date(startDate.getTime());
  let remaining = Math.ceil(totalDays);

  while (remaining > 0) {
    if (!isWeekend(cursor) && !holidaySet.has(toDateKey(cursor))) {
      remaining -= 1;
    }
    if (remaining === 0) break;
    cursor.setDate(cursor.getDate() + 1);
  }

  return cursor;
};

const COURSE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateCourseCode = (prefix = "CRS") => {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += COURSE_CODE_ALPHABET[Math.floor(Math.random() * COURSE_CODE_ALPHABET.length)];
  }
  return `${prefix}-${code}`;
};

module.exports = {
  calculateCourseTotals,
  calculateCourseEndDate,
  generateCourseCode,
};
