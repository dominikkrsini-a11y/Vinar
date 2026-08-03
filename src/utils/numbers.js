// Croatian keyboards produce a decimal comma, so "3,45" is what a winemaker
// actually types. Values are stored as strings, and the server's toNumber
// (server/services/wineMath.js) only swaps a single comma — normalise here so
// what lands in Firestore is already parseable by every reader, including the
// client chart, which uses parseFloat and would silently read "3,45" as 3.

export function normalizeDecimal(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, '').replace(',', '.');
}

export function toNumber(value) {
  const cleaned = normalizeDecimal(value);
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Density is labelled and stored as g/L (1080), but plenty of people read SG off
// the hydrometer and type 1.080. Both are accepted on input and normalised here,
// matching densityAsGL in server/services/wineMath.js.
export function densityAsGL(value) {
  const n = toNumber(value);
  if (n === null) return null;
  return n < 2 ? n * 1000 : n;
}
