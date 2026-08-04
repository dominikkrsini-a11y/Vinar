const DAY_MS = 24 * 60 * 60 * 1000;

// Entries are dated by day, not by moment — compare calendar days so a reading
// taken at 22:00 yesterday reads as "yesterday" and not "0 days ago".
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function daysSince(iso) {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return null;
  return Math.round((startOfDay(Date.now()) - startOfDay(then)) / DAY_MS);
}

// Croatian counts days as 1 dan / 2 dana / 5 dana, and again 21 dan / 22 dana.
export function formatDayCount(language, days) {
  if (language !== 'hr') return `${days} ${days === 1 ? 'day' : 'days'}`;
  const unit = days % 10 === 1 && days % 100 !== 11 ? 'dan' : 'dana';
  return `${days} ${unit}`;
}

export function formatDaysAgo(language, days) {
  if (days === null || days === undefined) return '';
  if (language === 'hr') {
    if (days <= 0) return 'danas';
    if (days === 1) return 'jučer';
    return `prije ${formatDayCount('hr', days)}`;
  }
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

// Builds the ISO timestamp stored as createdAt. Keeps the current time of day so
// several entries backdated to the same day still sort in the order they were
// typed.
export function isoForDaysAgo(offset) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString();
}

// Formats an ISO timestamp for the manual date field (DD.MM.YYYY).
export function formatTypedDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}

// Accepts what a winemaker actually types: "14.9", "14.9.", "14.09.2025", and
// also "14,9" or "14/9", because the numeric keypad offers a comma in Croatian
// locales and a slash on some keyboards.
// Without a year, assumes this year, or last year if that would be in the
// future — which is what happens when December work is logged in January.
export function parseTypedDate(input) {
  const parts = String(input || '')
    .split(/[.,/\-\s]+/)
    .map((p) => p.trim())
    .filter((p) => p !== '');

  if (parts.length < 2 || parts.length > 3) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  if (!Number.isInteger(day) || !Number.isInteger(month)) return null;
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  const now = new Date();
  let year = now.getFullYear();
  if (parts.length === 3) {
    year = Number(parts[2]);
    if (!Number.isInteger(year)) return null;
    if (year < 100) year += 2000;
    if (year < 1900 || year > now.getFullYear() + 1) return null;
  }

  // Midday avoids the entry sliding to the previous day in negative UTC offsets.
  let d = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (d.getDate() !== day || d.getMonth() !== month - 1) return null;

  if (parts.length === 2 && d.getTime() > now.getTime()) {
    d = new Date(year - 1, month - 1, day, 12, 0, 0, 0);
  }

  return d.toISOString();
}
