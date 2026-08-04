import { computeFermentationStatus } from '../wineMath.js';

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

describe('computeFermentationStatus recent-window rate', () => {
  test('flags started-then-stalled (1080 → 1030 → 1028) as stuck', () => {
    const result = computeFermentationStatus({
      wineType: 'Red',
      readings: [
        { date: daysAgo(8), density: 1080, sugar: 190 },
        { date: daysAgo(4), density: 1030, sugar: 65 },
        { date: daysAgo(0), density: 1028, sugar: 60 },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.status).toBe('stuck');
    expect(result.ratePerDay).toBeLessThan(1);
  });

  test('keeps never-started when overall drop is tiny and density is still high', () => {
    const result = computeFermentationStatus({
      wineType: 'White',
      readings: [
        { date: daysAgo(3), density: 1086, sugar: 205 },
        { date: daysAgo(1), density: 1085, sugar: 200 },
      ],
    });
    expect(result.status).toBe('not_started');
  });

  test('reports healthy when recent rate is solid', () => {
    const result = computeFermentationStatus({
      wineType: 'White',
      readings: [
        { date: daysAgo(5), density: 1080, sugar: 190 },
        { date: daysAgo(1), density: 1040, sugar: 90 },
      ],
    });
    expect(result.status).toBe('healthy');
  });

  test('reports slow when recent rate is between 1 and 5', () => {
    const result = computeFermentationStatus({
      wineType: 'White',
      readings: [
        { date: daysAgo(5), density: 1052, sugar: 110 },
        { date: daysAgo(1), density: 1040, sugar: 90 },
      ],
    });
    expect(result.status).toBe('slow');
  });
});
