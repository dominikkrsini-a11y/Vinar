import { getWineStatus } from '../wineStatus';

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

// Firestore returns entries newest-first and getWineStatus relies on that.
const newestFirst = (...entries) =>
  [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const white = { type: 'White' };
const red = { type: 'Red' };

describe('getWineStatus', () => {
  test('reports no entries for an empty logbook', () => {
    expect(getWineStatus(white, []).key).toBe('statusNoEntries');
    expect(getWineStatus(white, []).daysSinceEntry).toBeNull();
  });

  test('reports fermenting while density is falling and sugar remains', () => {
    const status = getWineStatus(
      white,
      newestFirst(
        { type: 'fermentation', density: '1040', sugar: '90', createdAt: daysAgo(1) },
        { type: 'fermentation', density: '1080', sugar: '190', createdAt: daysAgo(5) }
      )
    );
    expect(status.key).toBe('statusFermenting');
    expect(status.daysSinceEntry).toBe(1);
  });

  test('flags a stuck fermentation when density stops moving with sugar left', () => {
    const status = getWineStatus(
      red,
      newestFirst(
        { type: 'fermentation', density: '1030', sugar: '70', createdAt: daysAgo(1) },
        { type: 'fermentation', density: '1032', sugar: '75', createdAt: daysAgo(6) }
      )
    );
    expect(status.key).toBe('statusStuck');
    expect(status.tone).toBe('alert');
  });

  test('separates a fermentation that never started from one that stalled', () => {
    const status = getWineStatus(
      white,
      newestFirst(
        { type: 'fermentation', density: '1085', sugar: '200', createdAt: daysAgo(1) },
        { type: 'fermentation', density: '1086', sugar: '205', createdAt: daysAgo(3) }
      )
    );
    expect(status.key).toBe('statusNotStarted');
  });

  test('reads SG the same as g/L', () => {
    const status = getWineStatus(
      white,
      newestFirst(
        { type: 'fermentation', density: '1.030', sugar: '70', createdAt: daysAgo(1) },
        { type: 'fermentation', density: '1.032', sugar: '75', createdAt: daysAgo(6) }
      )
    );
    expect(status.key).toBe('statusStuck');
  });

  test('warns when a white ferments too warm', () => {
    const status = getWineStatus(
      white,
      newestFirst(
        { type: 'fermentation', density: '1040', sugar: '90', temperature: '24', createdAt: daysAgo(1) },
        { type: 'fermentation', density: '1080', sugar: '190', temperature: '18', createdAt: daysAgo(4) }
      )
    );
    expect(status.key).toBe('statusTooWarm');
  });

  test('accepts for a red the temperature it warns about for a white', () => {
    const status = getWineStatus(
      red,
      newestFirst(
        { type: 'fermentation', density: '1040', sugar: '90', temperature: '24', createdAt: daysAgo(1) },
        { type: 'fermentation', density: '1080', sugar: '190', temperature: '18', createdAt: daysAgo(4) }
      )
    );
    expect(status.key).toBe('statusFermenting');
  });

  test('flags high pH with low measured free SO2', () => {
    const status = getWineStatus(
      red,
      newestFirst(
        { type: 'measurement', ph: '3.7', freeSo2: '12', createdAt: daysAgo(2) },
        { type: 'fermentation', density: '995', sugar: '1', createdAt: daysAgo(30) }
      )
    );
    expect(status.key).toBe('statusUnderprotected');
  });

  test('does not call a wine underprotected on the reading that preceded its own sulfiting', () => {
    // freeSo2 on a sulfur entry is the level *before* the addition. A later
    // measurement is the truth, and it must win.
    const status = getWineStatus(
      red,
      newestFirst(
        { type: 'measurement', ph: '3.7', freeSo2: '32', createdAt: daysAgo(1) },
        { type: 'sulfur', amount: '5', freeSo2: '10', ph: '3.7', createdAt: daysAgo(3) },
        { type: 'fermentation', density: '995', sugar: '1', createdAt: daysAgo(30) }
      )
    );
    expect(status.key).not.toBe('statusUnderprotected');
  });

  test('asks for an SO2 check once the last one is over a month old', () => {
    const status = getWineStatus(
      red,
      newestFirst(
        { type: 'racking', volumeRacked: '200', createdAt: daysAgo(3) },
        { type: 'sulfur', amount: '5', createdAt: daysAgo(45) },
        { type: 'fermentation', density: '995', sugar: '1', createdAt: daysAgo(80) }
      )
    );
    expect(status.key).toBe('statusSo2Due');
    expect(status.daysSinceEntry).toBe(3);
  });

  test('counts a recent measurement as having checked SO2', () => {
    const status = getWineStatus(
      red,
      newestFirst(
        { type: 'measurement', ph: '3.4', freeSo2: '30', createdAt: daysAgo(5) },
        { type: 'fermentation', density: '995', sugar: '1', createdAt: daysAgo(80) }
      )
    );
    expect(status.key).toBe('statusAging');
  });
});
