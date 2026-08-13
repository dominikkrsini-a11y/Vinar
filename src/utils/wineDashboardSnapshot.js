import { toNumber } from './numbers';

// Compact fields stored on the wine doc so the dashboard can recompute
// time-dependent badges (SO₂ due after 30 days, days-since-entry) without
// loading every logbook. Not a frozen statusKey — getWineStatus still runs
// at read time against a reconstructed newest-first list.

function so2CheckRelevant(entry) {
  return (
    entry?.type === 'sulfur' ||
    (entry?.type === 'measurement' && toNumber(entry.freeSo2) !== null)
  );
}

function pickFerm(entry) {
  return {
    density: entry.density ?? null,
    sugar: entry.sugar ?? null,
    temperature: entry.temperature ?? null,
    createdAt: entry.createdAt,
  };
}

export function hasDashboardSnapshot(wine) {
  return wine?.dashboard != null && typeof wine.dashboard === 'object';
}

// `entries` must be newest-first, same as Firestore / getWineStatus.
export function buildDashboardSnapshot(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const last = list[0] || null;
  const ferm = list.filter((e) => e.type === 'fermentation');
  const newestFerm = ferm[0] || null;
  const prevFerm = ferm[1] || null;

  const measured = list.find(
    (e) => e.type === 'measurement' && toNumber(e.freeSo2) !== null
  );
  const sulfurSo2 = list.find(
    (e) => e.type === 'sulfur' && toNumber(e.freeSo2) !== null
  );
  const so2Source = measured || sulfurSo2;
  const phEntry = list.find((e) => toNumber(e.ph) !== null);
  const so2Check = list.find(so2CheckRelevant);

  return {
    lastEntryAt: last?.createdAt ?? null,
    hasFermentation: ferm.length > 0,
    lastFerm: newestFerm ? pickFerm(newestFerm) : null,
    prevFerm: prevFerm ? pickFerm(prevFerm) : null,
    lastFreeSo2: so2Source ? toNumber(so2Source.freeSo2) : null,
    lastFreeSo2From: measured ? 'measurement' : (sulfurSo2 ? 'sulfur' : null),
    lastFreeSo2At: so2Source?.createdAt ?? null,
    lastPh: phEntry ? toNumber(phEntry.ph) : null,
    lastPhAt: phEntry?.createdAt ?? null,
    lastSo2CheckAt: so2Check?.createdAt ?? null,
  };
}

export function entriesFromDashboardSnapshot(snapshot) {
  if (!snapshot?.lastEntryAt) return [];

  const entries = [];
  const seen = new Set();
  const add = (entry) => {
    if (!entry?.createdAt) return;
    const key = [
      entry.type,
      entry.createdAt,
      entry.density ?? '',
      entry.freeSo2 ?? '',
      entry.ph ?? '',
    ].join(':');
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(entry);
  };

  // Placeholder so daysSinceEntry uses lastEntryAt even when the newest
  // row is a note/racking that is not otherwise denormalized.
  add({ type: 'note', createdAt: snapshot.lastEntryAt });

  if (snapshot.lastFerm) {
    add({ type: 'fermentation', ...snapshot.lastFerm });
  }
  if (snapshot.prevFerm) {
    add({ type: 'fermentation', ...snapshot.prevFerm });
  }
  if (snapshot.lastFreeSo2From && snapshot.lastFreeSo2At) {
    add({
      type: snapshot.lastFreeSo2From,
      freeSo2: snapshot.lastFreeSo2,
      createdAt: snapshot.lastFreeSo2At,
      ...(snapshot.lastPhAt === snapshot.lastFreeSo2At && snapshot.lastPh != null
        ? { ph: snapshot.lastPh }
        : {}),
    });
  }
  if (snapshot.lastPh != null && snapshot.lastPhAt) {
    add({ type: 'measurement', ph: snapshot.lastPh, createdAt: snapshot.lastPhAt });
  }
  if (snapshot.lastSo2CheckAt) {
    add({ type: 'sulfur', createdAt: snapshot.lastSo2CheckAt });
  }
  if (snapshot.hasFermentation && !snapshot.lastFerm) {
    // Keep ferm.length > 0 for the SO₂-due path when densities were not stored.
    add({ type: 'fermentation', createdAt: snapshot.lastEntryAt });
  }

  entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return entries;
}

export function statusEntriesForWine(wine, fallbackEntries) {
  if (hasDashboardSnapshot(wine)) {
    return entriesFromDashboardSnapshot(wine.dashboard);
  }
  return fallbackEntries || [];
}
