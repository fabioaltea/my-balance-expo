const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { load } = require('./load-ts.cjs');
const { calendarDate, calendarDays, moveCalendarDay, moveCalendarMonth, sameCalendarDay } = load(
  path.join(__dirname, '../src/utils/datePickerCalendar.ts'),
);

const parts = (date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

test('month and year navigation clamps the day at leap and non-leap month ends', () => {
  assert.deepEqual(parts(moveCalendarMonth(calendarDate(2024, 0, 31), 1)), [2024, 2, 29]);
  assert.deepEqual(parts(moveCalendarMonth(calendarDate(2025, 0, 31), 1)), [2025, 2, 28]);
  assert.deepEqual(parts(moveCalendarMonth(calendarDate(2024, 1, 29), 12)), [2025, 2, 28]);
  assert.deepEqual(parts(moveCalendarMonth(calendarDate(2026, 0, 31), -1)), [2025, 12, 31]);
});

test('calendar has six Monday-first weeks including adjacent months', () => {
  const days = calendarDays(calendarDate(2026, 1, 15));
  assert.equal(days.length, 42);
  assert.equal(days[0].getDay(), 1);
  assert.deepEqual(parts(days[0]), [2026, 1, 26]);
  assert.deepEqual(parts(days[41]), [2026, 3, 8]);
  assert.equal(days.filter((day) => day.getMonth() === 1).length, 28);
});

test('day navigation preserves local dates across daylight saving and year boundaries', () => {
  for (const [start, expected] of [
    [
      [2026, 2, 29],
      [2026, 3, 30],
    ],
    [
      [2026, 9, 25],
      [2026, 10, 26],
    ],
    [
      [2026, 11, 31],
      [2027, 1, 1],
    ],
  ]) {
    const next = moveCalendarDay(calendarDate(...start), 1);
    assert.deepEqual(parts(next), expected);
    assert.equal(next.getHours(), 0);
  }
});

test('selection compares calendar days regardless of time, without mutating values', () => {
  const date = calendarDate(2026, 9, 19);
  date.setHours(17, 45);
  const originalTime = date.getTime();
  assert.equal(sameCalendarDay(date, calendarDate(2026, 9, 19)), true);
  assert.equal(sameCalendarDay(date, calendarDate(2025, 9, 19)), false);
  moveCalendarMonth(date, 1);
  calendarDays(date);
  assert.equal(date.getTime(), originalTime);
});
