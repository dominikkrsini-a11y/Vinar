import { getWineStatus } from '../wineStatus';
import {
  buildDashboardSnapshot,
  entriesFromDashboardSnapshot,
  hasDashboardSnapshot,
  statusEntriesForWine,
} from '../wineDashboardSnapshot';

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const newestFirst = (...entries) =>
  [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const white = { type: 'White' };
const red = { type: 'Red' };

function statusViaSnapshot(wine, entries) {
  const snapshot = buildDashboardSnapshot(entries);
  return getWineStatus(wine, entriesFromDashboardSnapshot(snapshot));
}

describe('buildDashboardSnapshot', () => {
  test('empty logbook has no lastEntryAt', () => {
    expect(buildDashboardSnapshot([]).lastEntryAt).toBeNull();
    expect(entriesFromDashboardSnapshot(buildDashboardSnapshot([]))).toEqual([]);
  });

  test('hasDashboardSnapshot is false until the map exists', () => {
    expect(hasDashboardSnapshot({})).toBe(false);
    expect(hasDashboardSnapshot({ dashboard: { lastEntryAt: null } })).toBe(true);
  });
});

describe('dashboard snapshot round-trips getWineStatus', () => {
  test('empty', () => {
    expect(statusViaSnapshot(white, []).key).toBe('statusNoEntries');
  });

  test('stuck fermentation', () => {
    const entries = newestFirst(
      { type: 'fermentation', density: '1030', sugar: '70', createdAt: daysAgo(1) },
      { type: 'fermentation', density: '1032', sugar: '75', createdAt: daysAgo(6) }
    );
    expect(statusViaSnapshot(red, entries).key).toBe('statusStuck');
  });

  test('slow fermentation', () => {
    const entries = newestFirst(
      { type: 'fermentation', density: '1040', sugar: '90', createdAt: daysAgo(1) },
      { type: 'fermentation', density: '1052', sugar: '110', createdAt: daysAgo(5) }
    );
    expect(statusViaSnapshot(white, entries).key).toBe('statusSlow');
  });

  test('SO2 due after 30 days', () => {
    const entries = newestFirst(
      { type: 'racking', volumeRacked: '200', createdAt: daysAgo(3) },
      { type: 'sulfur', amount: '5', createdAt: daysAgo(45) },
      { type: 'fermentation', density: '995', sugar: '1', createdAt: daysAgo(80) }
    );
    const status = statusViaSnapshot(red, entries);
    expect(status.key).toBe('statusSo2Due');
    expect(status.daysSinceEntry).toBe(3);
  });

  test('underprotected prefers later measurement over pre-addition SO2', () => {
    const entries = newestFirst(
      { type: 'measurement', ph: '3.7', freeSo2: '32', createdAt: daysAgo(1) },
      { type: 'sulfur', amount: '5', freeSo2: '10', ph: '3.7', createdAt: daysAgo(3) },
      { type: 'fermentation', density: '995', sugar: '1', createdAt: daysAgo(30) }
    );
    expect(statusViaSnapshot(red, entries).key).not.toBe('statusUnderprotected');
  });

  test('started-then-stalled still flags stuck from the last two densities', () => {
    const entries = newestFirst(
      { type: 'fermentation', density: '1028', sugar: '60', createdAt: daysAgo(0) },
      { type: 'fermentation', density: '1030', sugar: '65', createdAt: daysAgo(4) },
      { type: 'fermentation', density: '1080', sugar: '190', createdAt: daysAgo(8) }
    );
    expect(statusViaSnapshot(red, entries).key).toBe('statusStuck');
  });
});

describe('statusEntriesForWine', () => {
  test('uses the snapshot when present', () => {
    const entries = newestFirst(
      { type: 'fermentation', density: '1040', sugar: '90', createdAt: daysAgo(1) },
      { type: 'fermentation', density: '1080', sugar: '190', createdAt: daysAgo(5) }
    );
    const wine = { type: 'White', dashboard: buildDashboardSnapshot(entries) };
    expect(getWineStatus(wine, statusEntriesForWine(wine, [])).key).toBe('statusFermenting');
  });

  test('falls back to live entries when the snapshot is missing', () => {
    const fallback = newestFirst(
      { type: 'fermentation', density: '995', sugar: '1', createdAt: daysAgo(80) }
    );
    expect(statusEntriesForWine({}, fallback)).toBe(fallback);
  });
});
