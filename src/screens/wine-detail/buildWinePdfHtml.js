const formatDateHr = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export function buildWinePdfHtml({ wine, entries, language }) {
  const hr = language === 'hr';

  const fermEntries = (entries || []).filter((e) => e.type === 'fermentation');
  const sulfurEntries = (entries || []).filter((e) => e.type === 'sulfur');
  const noteEntries = (entries || []).filter((e) => e.type === 'note');

  const fermRows = fermEntries
    .map(
      (e) => `
      <tr>
        <td>${formatDateHr(e.createdAt)}</td>
        <td>${e.temperature ? e.temperature + ' °C' : '—'}</td>
        <td>${e.density ? e.density : '—'}</td>
        <td>${e.sugar ? e.sugar + ' g/L' : '—'}</td>
        <td>${e.ph ? e.ph : '—'}</td>
        <td>${e.yeast ? e.yeast : '—'}</td>
        <td>${e.notes ? e.notes : '—'}</td>
      </tr>`
    )
    .join('');

  const sulfurRows = sulfurEntries
    .map(
      (e) => `
      <tr>
        <td>${formatDateHr(e.createdAt)}</td>
        <td>${e.amount ? e.amount + ' g/hL' : '—'}</td>
        <td>${e.product ? e.product : '—'}</td>
        <td>${e.freeSo2 ? e.freeSo2 + ' ppm' : '—'}</td>
        <td>${e.ph ? e.ph : '—'}</td>
        <td>${e.notes ? e.notes : '—'}</td>
      </tr>`
    )
    .join('');

  const noteRows = noteEntries
    .map(
      (e) => `
      <tr>
        <td>${formatDateHr(e.createdAt)}</td>
        <td>${e.notes || '—'}</td>
      </tr>`
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Georgia, serif; color: #1a0a00; padding: 32px; font-size: 13px; }
        h1   { font-size: 26px; color: #8B6914; margin-bottom: 4px; }
        h2   { font-size: 13px; color: #8B6914; text-transform: uppercase;
               letter-spacing: 1px; margin: 28px 0 10px; border-bottom: 1px solid #c9a84c; padding-bottom: 4px; }
        .meta      { font-size: 13px; color: #666; margin-bottom: 6px; }
        .generated { font-size: 11px; color: #999; margin-top: 4px; }
        table  { width: 100%; border-collapse: collapse; margin-top: 4px; }
        th     { background: #f5ead0; color: #8B6914; font-size: 11px;
                 text-transform: uppercase; letter-spacing: 0.5px;
                 padding: 8px 10px; text-align: left; border-bottom: 2px solid #c9a84c; }
        td     { padding: 8px 10px; border-bottom: 1px solid #e8dcc8;
                 font-size: 12px; vertical-align: top; }
        tr:last-child td { border-bottom: none; }
        tr:nth-child(even) td { background: #fdf8f0; }
        .empty { color: #999; font-style: italic; font-size: 12px; margin-top: 6px; }
        .footer { margin-top: 40px; font-size: 11px; color: #999;
                  text-align: center; border-top: 1px solid #e8dcc8; padding-top: 12px; }
      </style>
    </head>
    <body>

      <h1>${wine.name}</h1>
      <p class="meta">
        ${[wine.type, wine.grape, wine.vintage].filter(Boolean).join(' · ')}
        ${wine.volume ? ' · ' + wine.volume + ' L' : ''}
      </p>
      <p class="generated">
        ${hr ? 'Izvezeno' : 'Exported'}: ${new Date().toLocaleDateString('hr-HR')}
      </p>

      <!-- Fermentation -->
      <h2>${hr ? 'Fermentacija' : 'Fermentation'}</h2>
      ${
        fermEntries.length === 0
          ? `<p class="empty">${hr ? 'Nema unosa fermentacije.' : 'No fermentation entries.'}</p>`
          : `<table>
            <thead><tr>
              <th>${hr ? 'Datum' : 'Date'}</th>
              <th>${hr ? 'Temp.' : 'Temp.'}</th>
              <th>${hr ? 'Gustoća' : 'Density'}</th>
              <th>${hr ? 'Šećer' : 'Sugar'}</th>
              <th>pH</th>
              <th>${hr ? 'Kvasac' : 'Yeast'}</th>
              <th>${hr ? 'Bilješka' : 'Note'}</th>
            </tr></thead>
            <tbody>${fermRows}</tbody>
          </table>`
      }

      <!-- Sulfur -->
      <h2>${hr ? 'Sumpor (SO₂)' : 'Sulfur (SO₂)'}</h2>
      ${
        sulfurEntries.length === 0
          ? `<p class="empty">${hr ? 'Nema unosa sumpora.' : 'No sulfur entries.'}</p>`
          : `<table>
            <thead><tr>
              <th>${hr ? 'Datum' : 'Date'}</th>
              <th>${hr ? 'Količina' : 'Amount'}</th>
              <th>${hr ? 'Proizvod' : 'Product'}</th>
              <th>${hr ? 'Slobodni SO₂' : 'Free SO₂'}</th>
              <th>pH</th>
              <th>${hr ? 'Bilješka' : 'Note'}</th>
            </tr></thead>
            <tbody>${sulfurRows}</tbody>
          </table>`
      }

      <!-- Notes -->
      ${
        noteEntries.length > 0
          ? `
      <h2>${hr ? 'Bilješke' : 'Notes'}</h2>
      <table>
        <thead><tr>
          <th>${hr ? 'Datum' : 'Date'}</th>
          <th>${hr ? 'Bilješka' : 'Note'}</th>
        </tr></thead>
        <tbody>${noteRows}</tbody>
      </table>`
          : ''
      }

      <div class="footer">Vinar App · ${wine.name} · ${new Date().getFullYear()}</div>

    </body>
    </html>`;
}

