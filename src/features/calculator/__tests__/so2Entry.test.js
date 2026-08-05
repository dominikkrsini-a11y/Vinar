import { buildSulfurPrefill } from '../so2Entry';

describe('buildSulfurPrefill', () => {
  test('maps a powder result onto the sulfur entry fields', () => {
    const prefill = buildSulfurPrefill({
      so2Result: {
        sufficient: false,
        target: 32,
        current: 12,
        needed: 20,
        gPerHl: 3.51,
        totalGrams: 17.5,
        pct: 57,
      },
      productLabel: 'K₂S₂O₅',
      ph: '3.4',
      volume: '500',
      language: 'en',
    });

    expect(prefill.type).toBe('sulfur');
    expect(prefill.values).toEqual({
      product: 'K₂S₂O₅',
      ph: '3.4',
      freeSo2: '12',
      amount: '3.51',
    });
    expect(prefill.notes).toContain('target 32 mg/L');
    expect(prefill.notes).toContain('add 20 mg/L');
    expect(prefill.notes).toContain('17.5 g / 500 L');
  });

  test('leaves amount empty for campden tablets and records them in the note', () => {
    const prefill = buildSulfurPrefill({
      so2Result: {
        sufficient: false,
        target: 30,
        current: 10,
        tablets: 10,
        mgPerTablet: 440,
        so2Needed: '20.0',
      },
      productLabel: 'Campden',
      ph: '3.5',
      volume: '200',
      language: 'en',
    });

    expect(prefill.values.amount).toBeUndefined();
    expect(prefill.values.freeSo2).toBe('10');
    expect(prefill.notes).toContain('10 tablets × 440 mg');
  });

  test('returns null when no addition is needed', () => {
    expect(
      buildSulfurPrefill({
        so2Result: { sufficient: true, target: 30, current: 35 },
        productLabel: 'K₂S₂O₅',
        ph: '3.3',
        volume: '300',
      })
    ).toBeNull();
  });

  test('uses Croatian wording when the app is in Croatian', () => {
    const prefill = buildSulfurPrefill({
      so2Result: {
        sufficient: false,
        target: 32,
        current: 12,
        needed: 20,
        gPerHl: 3.51,
        totalGrams: 17.5,
      },
      productLabel: 'K₂S₂O₅',
      ph: '3.4',
      volume: '500',
      language: 'hr',
    });
    expect(prefill.notes).toContain('cilj 32 mg/L');
    expect(prefill.notes).toContain('dodati 20 mg/L');
  });
});
