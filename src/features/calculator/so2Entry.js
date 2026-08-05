// Maps an SO₂ calculator result onto the sulfur logbook entry schema.
// The schema holds amount (g/hL), product, free SO₂ before the addition and pH;
// everything else the calculator worked out (target, ppm to add, total grams,
// tablet count) goes into the note, so no schema change is needed.

import { t } from '../../i18n/translations';

export function buildSulfurPrefill({ so2Result, productLabel, ph, volume, language = 'en' }) {
  if (!so2Result || so2Result.sufficient) return null;

  const values = {};
  if (productLabel) values.product = String(productLabel);
  if (ph !== undefined && ph !== null && String(ph).trim() !== '') values.ph = String(ph).trim();
  if (so2Result.current !== undefined && so2Result.current !== null) {
    values.freeSo2 = String(so2Result.current);
  }

  const noteParts = [];
  noteParts.push(`${t(language, 'calcNoteTarget')} ${so2Result.target} mg/L`);

  if (so2Result.tablets !== undefined) {
    // Campden: the dose is a tablet count, which has no g/hL field on the entry.
    noteParts.push(`${t(language, 'calcNoteAdd')} ${so2Result.so2Needed} mg/L`);
    noteParts.push(`${so2Result.tablets} ${t(language, 'calcNoteTablets')} × ${so2Result.mgPerTablet} mg`);
  } else {
    values.amount = String(so2Result.gPerHl);
    noteParts.push(`${t(language, 'calcNoteAdd')} ${so2Result.needed} mg/L`);
    const totals = [`${so2Result.totalGrams} g`];
    const vol = String(volume ?? '').trim();
    if (vol) totals.push(`${vol} L`);
    noteParts.push(totals.join(' / '));
  }

  return {
    type: 'sulfur',
    values,
    notes: `${t(language, 'so2Title')}: ${noteParts.join(', ')}`,
  };
}
