import {
  daysSince,
  formatDayCount,
  formatDaysAgo,
  isoForDaysAgo,
  parseTypedDate,
} from '../dates';

const isoAtHour = (daysAgo, hour) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

describe('daysSince', () => {
  test('counts calendar days, not elapsed hours', () => {
    // A reading taken late yesterday is "1 day ago" even though it is only a few
    // hours old, which is how a winemaker reads a logbook.
    expect(daysSince(isoAtHour(1, 23))).toBe(1);
    expect(daysSince(isoAtHour(0, 1))).toBe(0);
    expect(daysSince(isoAtHour(40, 12))).toBe(40);
  });

  test('returns null for missing or unparseable dates', () => {
    expect(daysSince(null)).toBeNull();
    expect(daysSince('not a date')).toBeNull();
  });
});

describe('formatDayCount', () => {
  test('uses Croatian day plurals', () => {
    expect(formatDayCount('hr', 1)).toBe('1 dan');
    expect(formatDayCount('hr', 2)).toBe('2 dana');
    expect(formatDayCount('hr', 7)).toBe('7 dana');
    expect(formatDayCount('hr', 11)).toBe('11 dana');
    expect(formatDayCount('hr', 21)).toBe('21 dan');
    expect(formatDayCount('hr', 28)).toBe('28 dana');
  });

  test('uses English plurals', () => {
    expect(formatDayCount('en', 1)).toBe('1 day');
    expect(formatDayCount('en', 14)).toBe('14 days');
  });
});

describe('formatDaysAgo', () => {
  test('prefers words over numbers for recent days', () => {
    expect(formatDaysAgo('hr', 0)).toBe('danas');
    expect(formatDaysAgo('hr', 1)).toBe('jučer');
    expect(formatDaysAgo('hr', 21)).toBe('prije 21 dan');
    expect(formatDaysAgo('en', 0)).toBe('today');
    expect(formatDaysAgo('en', 3)).toBe('3 days ago');
  });
});

describe('isoForDaysAgo', () => {
  test('backdates by whole days', () => {
    expect(daysSince(isoForDaysAgo(0))).toBe(0);
    expect(daysSince(isoForDaysAgo(1))).toBe(1);
    expect(daysSince(isoForDaysAgo(2))).toBe(2);
  });
});

describe('parseTypedDate', () => {
  test('accepts the separators a numeric keypad offers', () => {
    const year = new Date().getFullYear();
    for (const input of ['14.9', '14.9.', '14,9', '14/9', '14-9']) {
      const parsed = new Date(parseTypedDate(input));
      expect(parsed.getDate()).toBe(14);
      expect(parsed.getMonth()).toBe(8);
      expect([year, year - 1]).toContain(parsed.getFullYear());
    }
  });

  test('accepts an explicit year, two or four digits', () => {
    expect(new Date(parseTypedDate('05.03.2024')).getFullYear()).toBe(2024);
    expect(new Date(parseTypedDate('05.03.24')).getFullYear()).toBe(2024);
  });

  test('assumes last year when this year would be in the future', () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 5);
    const typed = `${tomorrow.getDate()}.${tomorrow.getMonth() + 1}`;
    expect(new Date(parseTypedDate(typed)).getFullYear()).toBe(now.getFullYear() - 1);
  });

  test('rejects nonsense rather than inventing a date', () => {
    expect(parseTypedDate('')).toBeNull();
    expect(parseTypedDate('14')).toBeNull();
    expect(parseTypedDate('32.1')).toBeNull();
    expect(parseTypedDate('14.13')).toBeNull();
    expect(parseTypedDate('31.2')).toBeNull();
    expect(parseTypedDate('abc')).toBeNull();
  });
});
