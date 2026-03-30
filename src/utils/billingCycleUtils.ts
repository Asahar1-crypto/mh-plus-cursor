const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

/**
 * Clamps billingDay to the last day of the given month.
 * Month is 1-based (1 = January, 12 = December).
 */
export function getEffectiveBillingDay(billingDay: number, month: number, year: number): number {
  const lastDay = new Date(year, month, 0).getDate();
  return Math.min(billingDay, lastDay);
}

/**
 * Returns the date range for the billing cycle labeled by the given month.
 * Month is 1-based. End date is set to 23:59:59.999.
 */
export function getCycleRange(
  billingDay: number,
  month: number,
  year: number,
): { start: Date; end: Date } {
  if (billingDay === 1) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // billingDay > 1
  const effectiveStart = getEffectiveBillingDay(billingDay, month, year);
  const start = new Date(year, month - 1, effectiveStart);

  // Next month
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear = year + 1;
  }

  const effectiveNextBillingDay = getEffectiveBillingDay(billingDay, nextMonth, nextYear);
  const end = new Date(nextYear, nextMonth - 1, effectiveNextBillingDay - 1);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Returns true if the given date falls within the billing cycle.
 */
export function isDateInCycle(
  date: Date | string,
  billingDay: number,
  month: number,
  year: number,
): boolean {
  const { start, end } = getCycleRange(billingDay, month, year);
  const d = new Date(date);
  return d >= start && d <= end;
}

/**
 * Returns YYYY-MM-DD strings for the start and end of the billing cycle.
 */
export function getCycleRangeISO(
  billingDay: number,
  month: number,
  year: number,
): { startISO: string; endISO: string } {
  const { start, end } = getCycleRange(billingDay, month, year);

  const pad = (n: number) => String(n).padStart(2, '0');
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return { startISO: toISO(start), endISO: toISO(end) };
}

/**
 * Returns a Hebrew label for the billing cycle.
 * billingDay=1 → "מרץ 2026"
 * billingDay=15 → "מרץ (15-14)"
 */
export function getCycleLabelHebrew(
  billingDay: number,
  month: number,
  year: number,
): string {
  const monthName = HEBREW_MONTHS[month - 1];

  if (billingDay === 1) {
    return `${monthName} ${year}`;
  }

  const { start, end } = getCycleRange(billingDay, month, year);
  return `${monthName} (${start.getDate()}-${end.getDate()})`;
}

/**
 * Given today's date, returns which cycle label month we are currently in.
 */
export function getCurrentCycle(billingDay: number): { month: number; year: number } {
  const today = new Date();
  let month = today.getMonth() + 1; // 1-based
  let year = today.getFullYear();

  if (billingDay === 1) {
    return { month, year };
  }

  // If today's day is before the billing day, we're in the previous month's cycle
  if (today.getDate() < billingDay) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }

  return { month, year };
}

/**
 * Returns the total days in the cycle and how many have passed as of today.
 */
export function getCycleDayInfo(
  billingDay: number,
  month: number,
  year: number,
): { totalDays: number; daysPassed: number } {
  const { start, end } = getCycleRange(billingDay, month, year);

  // Total days inclusive
  const msPerDay = 86_400_000;
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const totalDays = Math.round((endDay.getTime() - startDay.getTime()) / msPerDay) + 1;

  const today = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const rawPassed = Math.round((todayDay.getTime() - startDay.getTime()) / msPerDay) + 1;
  const daysPassed = Math.max(0, Math.min(rawPassed, totalDays));

  return { totalDays, daysPassed };
}
