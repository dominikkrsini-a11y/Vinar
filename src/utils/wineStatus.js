// The single client-side read of "how is this wine doing", shown on the dashboard
// cards and in the wine detail header.
//
// The thresholds deliberately mirror computeRiskFlags in
// server/services/promptBuilder.js — pH 3.6, free SO₂ 20 ppm, 30 days since the
// last sulfur entry, flat density with residual sugar. If the badge and the
// assistant disagree about a wine, the winemaker stops trusting both, so these
// numbers must be changed in both places or neither.

import { densityAsGL, toNumber } from './numbers';
import { daysSince } from './dates';

const PH_HIGH = 3.6;
const FREE_SO2_LOW = 20;
const SO2_CHECK_DAYS = 30;
const FLAT_DENSITY_DROP = 5;

function isWhiteLike(type) {
  const t = String(type || '').toLowerCase();
  return (
    t.includes('white') || t.includes('bijel') ||
    t.includes('rosé') || t.includes('rose') ||
    t.includes('orange') || t.includes('naranč') ||
    t.includes('sparkling') || t.includes('pjenuš')
  );
}

// Free SO₂ read from a measurement is the wine's current level. The same field on
// a sulfur entry is the level *before* that addition, so it is only a fallback —
// otherwise a wine reads as underprotected right after being sulfited.
function latestFreeSo2(entries) {
  const measured = entries.find(
    (e) => e.type === 'measurement' && toNumber(e.freeSo2) !== null
  );
  if (measured) return toNumber(measured.freeSo2);

  const beforeAddition = entries.find(
    (e) => e.type === 'sulfur' && toNumber(e.freeSo2) !== null
  );
  return beforeAddition ? toNumber(beforeAddition.freeSo2) : null;
}

function latestPh(entries) {
  const entry = entries.find((e) => toNumber(e.ph) !== null);
  return entry ? toNumber(entry.ph) : null;
}

// `entries` must be newest-first, as Firestore returns them.
export function getWineStatus(wine, entries) {
  const list = entries || [];
  if (list.length === 0) {
    return { key: 'statusNoEntries', tone: 'idle', daysSinceEntry: null };
  }

  const daysSinceEntry = daysSince(list[0].createdAt);
  const ferm = list.filter((e) => e.type === 'fermentation');
  const withDensity = ferm.filter((e) => densityAsGL(e.density) !== null);

  const latest = withDensity[0];
  const latestDensity = latest ? densityAsGL(latest.density) : null;
  const latestSugar = latest ? toNumber(latest.sugar) : null;
  const stillSweet =
    (latestSugar !== null && latestSugar > 5) ||
    (latestDensity !== null && latestDensity > 1000);

  // Fermentation problems outrank everything else — they are time critical.
  if (withDensity.length >= 2 && stillSweet) {
    const oldest = densityAsGL(withDensity[withDensity.length - 1].density);
    const drop = Math.abs(oldest - latestDensity);
    if (drop < FLAT_DENSITY_DROP) {
      return {
        key: latestDensity > 1070 ? 'statusNotStarted' : 'statusStuck',
        tone: 'alert',
        daysSinceEntry,
      };
    }
  }

  if (latest) {
    const temp = toNumber(latest.temperature);
    const white = isWhiteLike(wine?.type);
    if (temp !== null && stillSweet && ((white && temp > 20) || (!white && temp > 30))) {
      return { key: 'statusTooWarm', tone: 'alert', daysSinceEntry };
    }
  }

  const ph = latestPh(list);
  const freeSo2 = latestFreeSo2(list);
  if (ph !== null && ph >= PH_HIGH && freeSo2 !== null && freeSo2 < FREE_SO2_LOW) {
    return { key: 'statusUnderprotected', tone: 'alert', daysSinceEntry };
  }

  if (stillSweet && withDensity.length > 0) {
    return { key: 'statusFermenting', tone: 'active', daysSinceEntry };
  }

  // Past fermentation: the recurring job is keeping SO₂ topped up.
  const lastSulfur = list.find((e) => e.type === 'sulfur' || e.type === 'measurement');
  const sulfurAge = lastSulfur ? daysSince(lastSulfur.createdAt) : null;
  if (ferm.length > 0 && (sulfurAge === null || sulfurAge > SO2_CHECK_DAYS)) {
    return { key: 'statusSo2Due', tone: 'warn', daysSinceEntry };
  }

  return { key: 'statusAging', tone: 'idle', daysSinceEntry };
}

export const STATUS_TONES = {
  alert: '#e07070',
  warn: '#d9a13b',
  active: '#7cb87c',
  idle: null,
};
