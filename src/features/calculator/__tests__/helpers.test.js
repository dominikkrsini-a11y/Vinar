import {
  calculateABV,
  calculateSO2Addition,
  correctSG,
  getTargetFreeSO2,
} from '../helpers';

describe('calculator helpers', () => {
  test('correctSG increases as temperature increases', () => {
    const sg = 1100;
    expect(correctSG(sg, 10)).toBeLessThan(correctSG(sg, 20));
    expect(correctSG(sg, 20)).toBeLessThan(correctSG(sg, 30));
  });

  test('calculateABV returns ~14.9 for typical fermentation', () => {
    // 1.100 -> 0.990 at 20°C roughly 14.4; with the app's correction formula yields close.
    const abv = calculateABV(1100, 20, 990, 20);
    expect(abv).toBeGreaterThan(13);
    expect(abv).toBeLessThan(16);
  });

  test('getTargetFreeSO2 returns higher targets for whites than reds', () => {
    const pH = 3.4;
    const red = getTargetFreeSO2('red', pH);
    const white = getTargetFreeSO2('white', pH);
    expect(white).toBeGreaterThan(red);
  });

  test('getTargetFreeSO2 returns integers within a reasonable range', () => {
    const t1 = getTargetFreeSO2('white', 3.2);
    const t2 = getTargetFreeSO2('red', 3.8);
    expect(Number.isInteger(t1)).toBe(true);
    expect(Number.isInteger(t2)).toBe(true);
    expect(t1).toBeGreaterThan(0);
    expect(t1).toBeLessThan(200);
    expect(t2).toBeGreaterThan(0);
    expect(t2).toBeLessThan(200);
  });

  test('calculateSO2Addition returns zeros when no addition is needed', () => {
    expect(calculateSO2Addition(30, 35, 500, 57)).toEqual({
      needed: 0,
      gPerHl: 0,
      totalGrams: 0,
    });
  });

  test('calculateSO2Addition scales with volume', () => {
    const a = calculateSO2Addition(30, 10, 100, 57);
    const b = calculateSO2Addition(30, 10, 200, 57);
    expect(b.totalGrams).toBeCloseTo(a.totalGrams * 2, 1);
  });

  test('calculateSO2Addition returns positive values when needed', () => {
    const res = calculateSO2Addition(30, 10, 500, 57);
    expect(res.needed).toBe(20);
    expect(res.gPerHl).toBeGreaterThan(0);
    expect(res.totalGrams).toBeGreaterThan(0);
  });
});

