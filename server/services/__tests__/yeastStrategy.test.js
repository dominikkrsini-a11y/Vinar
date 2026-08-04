import { computeYeastAdvice } from '../yeastStrategy.js';

describe('computeYeastAdvice', () => {
  test('Grk premium / structural does not default to QA23', () => {
    const result = computeYeastAdvice({
      grape: 'Grk',
      wineType: 'White',
      premium: true,
      styleGoal: 'neutral_structural',
    });
    expect(result.ok).toBe(true);
    expect(result.strategy).toBe('neutral_structural');
    expect(result.ask).toBeNull();
    expect(result.avoid.join(' ')).toMatch(/QA23/i);
    expect(result.examples.join(' ')).not.toMatch(/QA23/i);
    expect(result.summary).toMatch(/do not default to.*QA23/i);
  });

  test('Grk without style still uses neutral strategy from playbook', () => {
    const result = computeYeastAdvice({ grape: 'Grk', wineType: 'White' });
    expect(result.strategy).toBe('neutral_structural');
    expect(result.avoid).toEqual(expect.arrayContaining(['QA23']));
  });

  test('Graševina gets a practical aromatic strategy', () => {
    const result = computeYeastAdvice({ grape: 'Graševina', wineType: 'White' });
    expect(result.ok).toBe(true);
    expect(result.strategy).toBe('aromatic');
    expect(result.examples.length).toBeGreaterThan(0);
    expect(result.ask).toBeNull();
  });

  test('Malvazija gets aromatic / cool-ferment practical options', () => {
    const result = computeYeastAdvice({ grape: 'Malvazija', wineType: 'White' });
    expect(result.strategy).toBe('aromatic');
    expect(result.summary).toMatch(/Malvazija/i);
  });

  test('Plavac prefers alcohol-tolerant red when sugar is high', () => {
    const result = computeYeastAdvice({
      grape: 'Plavac Mali',
      wineType: 'Red',
      brix: 26,
    });
    expect(result.strategy).toBe('alcohol_tolerant_red');
    expect(result.summary).toMatch(/Plavac|alcohol/i);
  });

  test('missing style on unknown grape asks one clarifying question', () => {
    const result = computeYeastAdvice({ grape: 'Other', wineType: 'White' });
    expect(result.strategy).toBeNull();
    expect(result.ask).toBeTruthy();
    expect(result.examples).toEqual([]);
    expect(result.summary).toMatch(/Need|detail|style/i);
  });

  test('stuck restart path is not a normal ferment yeast pick', () => {
    const result = computeYeastAdvice({
      grape: 'Grk',
      wineType: 'White',
      situation: 'stuck_restart',
    });
    expect(result.strategy).toBe('high_alcohol_restart');
    expect(result.summary).toMatch(/restart/i);
    expect(result.summary).not.toMatch(/neutral \/ structural\./i);
    expect(result.examples.join(' ')).toMatch(/EC-1118|Uvaferm/i);
  });

  test('low YAN adds nutrition note without brand fetish', () => {
    const result = computeYeastAdvice({
      grape: 'Malvazija',
      wineType: 'White',
      yan: 90,
    });
    expect(result.summary).toMatch(/YAN/i);
    expect(result.summary).toMatch(/nutrient|feed/i);
  });
});
