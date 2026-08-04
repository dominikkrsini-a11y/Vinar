import { formatTypedDate, parseTypedDate } from './dates';

/** Optional harvest/must fields stored on the wine document. */
export const MUST_FIELD_KEYS = ['harvestDate', 'brix', 'babo', 'mustPh', 'ta', 'yan'];

/**
 * Resolve typed harvest date (DD.MM.YYYY) to ISO, or '' if blank.
 * Returns { ok: false } when the typed value is non-empty but invalid.
 */
export function resolveHarvestDate(typed) {
  const raw = String(typed || '').trim();
  if (!raw) return { ok: true, value: '' };
  const iso = parseTypedDate(raw);
  if (!iso) return { ok: false };
  return { ok: true, value: iso };
}

export function mustFieldsFromForm({ harvestDate, brix, babo, mustPh, ta, yan }) {
  const harvest = resolveHarvestDate(harvestDate);
  if (!harvest.ok) return { ok: false };
  return {
    ok: true,
    fields: {
      harvestDate: harvest.value,
      brix: String(brix || '').trim(),
      babo: String(babo || '').trim(),
      mustPh: String(mustPh || '').trim(),
      ta: String(ta || '').trim(),
      yan: String(yan || '').trim(),
    },
  };
}

/** Short display fragments for detail / PDF (skips empty). */
export function formatMustParts(wine, { language = 'en' } = {}) {
  if (!wine) return [];
  const parts = [];
  if (wine.harvestDate) {
    const shown = formatTypedDate(wine.harvestDate) || wine.harvestDate;
    parts.push(language === 'hr' ? `Berba ${shown}` : `Harvest ${shown}`);
  }
  if (wine.brix) parts.push(`Brix ${wine.brix}`);
  if (wine.babo) parts.push(`Babo ${wine.babo}`);
  if (wine.mustPh) parts.push(`pH ${wine.mustPh}`);
  if (wine.ta) parts.push(`TA ${wine.ta}`);
  if (wine.yan) parts.push(`YAN ${wine.yan}`);
  return parts;
}

export function formatMustLine(wine, opts) {
  return formatMustParts(wine, opts).join(' · ');
}
