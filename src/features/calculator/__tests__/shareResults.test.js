import { buildAbvShareMessage, buildSo2ShareMessage } from '../shareResults';

describe('buildAbvShareMessage', () => {
  const abvResult = { abv: '12.4', correctedOG: '1108.0', correctedFG: '994.2' };

  test('returns null without a result', () => {
    expect(buildAbvShareMessage({ abvResult: null, language: 'en' })).toBeNull();
  });

  test('formats the English message with the Vinar signature', () => {
    const msg = buildAbvShareMessage({ abvResult, language: 'en' });
    expect(msg).toContain('Estimated ABV: 12.4%');
    expect(msg).toContain('Corrected OG: 1108.0');
    expect(msg).toContain('Corrected FG: 994.2');
    expect(msg).toContain('vinar.app');
  });

  test('formats the Croatian message', () => {
    const msg = buildAbvShareMessage({ abvResult, language: 'hr' });
    expect(msg).toContain('Procijenjeni ABV: 12.4%');
    expect(msg).toContain('Izračunato u aplikaciji Vinar');
  });
});

describe('buildSo2ShareMessage', () => {
  test('returns null without a result', () => {
    expect(buildSo2ShareMessage({ so2Result: null, language: 'en' })).toBeNull();
  });

  test('formats a dosing result with product label and signature', () => {
    const so2Result = {
      sufficient: false,
      target: 32,
      current: 12,
      needed: 20,
      gPerHl: '3.5',
      totalGrams: '17.5',
      pct: 57,
    };
    const msg = buildSo2ShareMessage({ so2Result, productLabel: 'K₂S₂O₅', language: 'en' });
    expect(msg).toContain('Product to add: 3.5 g/hL (K₂S₂O₅)');
    expect(msg).toContain('17.5 g total');
    expect(msg).toContain('SO₂ to add: 20 mg/L');
    expect(msg).toContain('Current free SO₂: 12 mg/L');
    expect(msg).toContain('Target free SO₂: 32 mg/L');
    expect(msg).toContain('vinar.app');
  });

  test('formats a Campden tablet result', () => {
    const so2Result = {
      sufficient: false,
      target: 32,
      current: 12,
      tablets: 23,
      mgPerTablet: 440,
      so2Needed: '20.0',
    };
    const msg = buildSo2ShareMessage({ so2Result, productLabel: 'Campden tablets', language: 'en' });
    expect(msg).toContain('Product to add: 23 tablets (Campden tablets)');
    expect(msg).toContain('SO₂ to add: 20.0 mg/L');
  });

  test('formats a no-addition-needed result in Croatian', () => {
    const so2Result = { sufficient: true, target: 26, current: 30 };
    const msg = buildSo2ShareMessage({ so2Result, language: 'hr' });
    expect(msg).toContain('Nije potrebno dodavanje');
    expect(msg).toContain('Trenutni slobodni SO₂: 30 mg/L');
    expect(msg).toContain('Ciljni slobodni SO₂: 26 mg/L');
    expect(msg).toContain('vinar.app');
  });
});
