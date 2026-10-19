/** Use local calendar dates so selecting a day never shifts it through UTC. */
export function calendarDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setFullYear(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function sameCalendarDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function moveCalendarDay(date: Date, days: number): Date {
  return calendarDate(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function moveCalendarMonth(date: Date, months: number): Date {
  const first = calendarDate(date.getFullYear(), date.getMonth() + months, 1);
  const last = calendarDate(first.getFullYear(), first.getMonth() + 1, 0);
  return calendarDate(
    first.getFullYear(),
    first.getMonth(),
    Math.min(date.getDate(), last.getDate()),
  );
}

/** Six complete weeks, starting on Monday, keep the popover height stable. */
export function calendarDays(month: Date): Date[] {
  const first = calendarDate(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => moveCalendarDay(first, index - offset));
}
