import { densityAsGL, normalizeDecimal, toNumber } from '../numbers';

describe('normalizeDecimal', () => {
  test('turns a Croatian decimal comma into a dot', () => {
    expect(normalizeDecimal('3,45')).toBe('3.45');
    expect(normalizeDecimal(' 1 042 ')).toBe('1042');
    expect(normalizeDecimal(1042)).toBe('1042');
  });

  test('returns an empty string for nothing', () => {
    expect(normalizeDecimal(null)).toBe('');
    expect(normalizeDecimal(undefined)).toBe('');
    expect(normalizeDecimal('   ')).toBe('');
  });
});

describe('toNumber', () => {
  test('parses both decimal separators', () => {
    expect(toNumber('3,45')).toBe(3.45);
    expect(toNumber('3.45')).toBe(3.45);
  });

  test('returns null rather than NaN for unusable input', () => {
    expect(toNumber('')).toBeNull();
    expect(toNumber('abc')).toBeNull();
    expect(toNumber(null)).toBeNull();
  });
});

describe('densityAsGL', () => {
  test('accepts a hydrometer SG reading and a g/L reading alike', () => {
    expect(densityAsGL('1.080')).toBe(1080);
    expect(densityAsGL('1,080')).toBe(1080);
    expect(densityAsGL('1080')).toBe(1080);
    expect(densityAsGL('995')).toBe(995);
  });

  test('returns null when there is no reading', () => {
    expect(densityAsGL('')).toBeNull();
  });
});
