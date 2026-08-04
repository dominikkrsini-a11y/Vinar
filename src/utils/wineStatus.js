// The single client-side read of "how is this wine doing", shown on the dashboard
// cards and in the wine detail header.
//
// Fermentation stuck/slow uses a recent-window rate (last two dated density
// readings), matching server/services/wineMath.js computeFermentationStatus.
// Other thresholds (pH 3.6, free SO₂ 20 ppm, 30-day SO₂ check) stay aligned
// with computeRiskFlags in server/services/promptBuilder.js.

import { densityAsGL, toNumber } from './numbers';
import { daysSince } from './dates';

const PH_HIGH = 3.6;
const FREE_SO2_LOW = 20;
const SO2_CHECK_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

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

function datedDensityReadings(fermEntries) {
  return (fermEntries || [])
    .map((e) => {
      const density = densityAsGL(e.density);
      const ms = Date.parse(e.createdAt);
      if (density === null || !Number.isFinite(ms)) return null;
      return {
        density,
        sugar: toNumber(e.sugar),
        temperature: toNumber(e.temperature),
        createdAt: e.createdAt,
        ms,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.ms - b.ms);
}

/**
 * Recent-window fermentation assessment.
 * recentRate = density drop between the last two dated readings / days between them
 * overallDrop = oldest density − newest density
 */
export function assessFermentation(fermEntries) {
  const readings = datedDensityReadings(fermEntries);
  if (readings.length === 0) {
    return { status: null, recentRate: null, overallDrop: null, latest: null };
  }

  const latest = readings[readings.length - 1];
  const oldest = readings[0];
  const overallDrop = oldest.density - latest.density;
  const stillSweet =
    (latest.sugar !== null && latest.sugar > 5) || latest.density > 1000;
  const finished =
    latest.density <= 995 || (latest.sugar !== null && latest.sugar <= 2);

  if (finished && !stillSweet) {
    return { status: 'finished', recentRate: null, overallDrop, latest };
  }
  if (!stillSweet) {
    return { status: null, recentRate: null, overallDrop, latest };
  }

  let recentRate = null;
  if (readings.length >= 2) {
    const prev = readings[readings.length - 2];
    const days = Math.max((latest.ms - prev.ms) / DAY_MS, 1 / 24);
    recentRate = (prev.density - latest.density) / days;
  }

  if (recentRate !== null && recentRate < 1) {
    if (overallDrop < 5 && latest.density > 1070) {
      return { status: 'not_started', recentRate, overallDrop, latest };
    }
    return { status: 'stuck', recentRate, overallDrop, latest };
  }
  if (recentRate !== null && recentRate < 5) {
    return { status: 'slow', recentRate, overallDrop, latest };
  }
  if (readings.length >= 2) {
    return { status: 'fermenting', recentRate, overallDrop, latest };
  }
  return { status: 'fermenting', recentRate: null, overallDrop, latest };
}

function so2CheckRelevant(entry) {
  return (
    entry?.type === 'sulfur' ||
    (entry?.type === 'measurement' && toNumber(entry.freeSo2) !== null)
  );
}

// `entries` must be newest-first, as Firestore returns them.
export function getWineStatus(wine, entries) {
  const list = entries || [];
  if (list.length === 0) {
    return { key: 'statusNoEntries', tone: 'idle', daysSinceEntry: null };
  }

  const daysSinceEntry = daysSince(list[0].createdAt);
  const ferm = list.filter((e) => e.type === 'fermentation');
  const ferment = assessFermentation(ferm);

  // Fermentation problems outrank everything else — they are time critical.
  if (ferment.status === 'stuck') {
    return { key: 'statusStuck', tone: 'alert', daysSinceEntry };
  }
  if (ferment.status === 'not_started') {
    return { key: 'statusNotStarted', tone: 'alert', daysSinceEntry };
  }
  if (ferment.status === 'slow') {
    return { key: 'statusSlow', tone: 'warn', daysSinceEntry };
  }

  const latest = ferment.latest;
  const stillSweet =
    latest &&
    ((latest.sugar !== null && latest.sugar > 5) || latest.density > 1000);

  if (latest && stillSweet) {
    const temp = latest.temperature;
    const white = isWhiteLike(wine?.type);
    if (temp !== null && ((white && temp > 20) || (!white && temp > 30))) {
      return { key: 'statusTooWarm', tone: 'alert', daysSinceEntry };
    }
  }

  const ph = latestPh(list);
  const freeSo2 = latestFreeSo2(list);
  if (ph !== null && ph >= PH_HIGH && freeSo2 !== null && freeSo2 < FREE_SO2_LOW) {
    return { key: 'statusUnderprotected', tone: 'alert', daysSinceEntry };
  }

  if (ferment.status === 'fermenting' || (stillSweet && latest)) {
    return { key: 'statusFermenting', tone: 'active', daysSinceEntry };
  }

  // Past fermentation: the recurring job is keeping SO₂ topped up.
  // Only measurements that actually record free SO₂ count as a check (match AI).
  const lastSo2Check = list.find(so2CheckRelevant);
  const sulfurAge = lastSo2Check ? daysSince(lastSo2Check.createdAt) : null;
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
