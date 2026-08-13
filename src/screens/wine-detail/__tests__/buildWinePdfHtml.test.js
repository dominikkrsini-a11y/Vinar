import { buildWinePdfHtml } from '../buildWinePdfHtml';

const wine = { name: 'Plavac Mali', type: 'Red', grape: 'Plavac Mali', vintage: '2023' };

describe('buildWinePdfHtml branding footer', () => {
  test('English export carries the Vinar tagline and link', () => {
    const html = buildWinePdfHtml({ wine, entries: [], language: 'en' });
    expect(html).toContain('Made with Vinar');
    expect(html).toContain('vinar.app');
    expect(html).toContain('<span class="brand">Vinar</span>');
  });

  test('Croatian export carries the Croatian tagline and link', () => {
    const html = buildWinePdfHtml({ wine, entries: [], language: 'hr' });
    expect(html).toContain('Izrađeno u aplikaciji Vinar');
    expect(html).toContain('vinar.app');
  });

  test('escapes the wine name in the footer', () => {
    const html = buildWinePdfHtml({
      wine: { ...wine, name: 'Cuvée <script>' },
      entries: [],
      language: 'en',
    });
    expect(html).toContain('Cuvée &lt;script&gt;');
    expect(html).not.toContain('Cuvée <script>');
  });

  test('still renders entry tables around the footer', () => {
    const entries = [
      { type: 'fermentation', createdAt: '2026-09-01T10:00:00.000Z', temperature: 18, density: 1080 },
    ];
    const html = buildWinePdfHtml({ wine, entries, language: 'en' });
    expect(html).toContain('Fermentation');
    expect(html).toContain('1080');
    expect(html).toContain('Made with Vinar');
  });
});
