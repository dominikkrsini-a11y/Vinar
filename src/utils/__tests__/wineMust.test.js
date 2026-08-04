import { formatMustLine, mustFieldsFromForm, resolveHarvestDate } from '../wineMust';

describe('wineMust', () => {
  test('resolves typed harvest dates to ISO', () => {
    const result = resolveHarvestDate('12.09.2025');
    expect(result.ok).toBe(true);
    expect(result.value.slice(0, 10)).toBe('2025-09-12');
  });

  test('rejects invalid harvest dates', () => {
    expect(resolveHarvestDate('99.99.2025').ok).toBe(false);
  });

  test('builds must fields from the form', () => {
    const result = mustFieldsFromForm({
      harvestDate: '12.09.2025',
      brix: '22',
      babo: '',
      mustPh: '3.3',
      ta: '6.5',
      yan: '140',
    });
    expect(result.ok).toBe(true);
    expect(result.fields.brix).toBe('22');
    expect(result.fields.mustPh).toBe('3.3');
    expect(result.fields.harvestDate.slice(0, 10)).toBe('2025-09-12');
  });

  test('formats a must line only from set values', () => {
    const line = formatMustLine(
      { brix: '22', mustPh: '3.3', yan: '140' },
      { language: 'en' }
    );
    expect(line).toBe('Brix 22 · pH 3.3 · YAN 140');
  });
});
