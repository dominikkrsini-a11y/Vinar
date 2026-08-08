import { t } from '../../i18n/translations';

// Plain-text messages for the native share sheet. Winemakers pass doses and
// readings to each other constantly — every shared result carries a one-line
// Vinar signature, which is the app's cheapest acquisition channel.

export function buildAbvShareMessage({ abvResult, language }) {
  if (!abvResult) return null;
  return [
    `🍷 ${t(language, 'abvTitle')}`,
    `${t(language, 'estimatedABV')}: ${abvResult.abv}%`,
    `${t(language, 'correctedOG')}: ${abvResult.correctedOG}`,
    `${t(language, 'correctedFG')}: ${abvResult.correctedFG}`,
    '',
    t(language, 'shareFooter'),
  ].join('\n');
}

export function buildSo2ShareMessage({ so2Result, productLabel, language }) {
  if (!so2Result) return null;

  const lines = [`🧪 ${t(language, 'so2Title')}`];

  if (so2Result.sufficient) {
    lines.push(t(language, 'noAdditionNeeded'));
  } else if (so2Result.tablets !== undefined) {
    lines.push(
      `${t(language, 'productToAdd')}: ${so2Result.tablets} ${t(language, 'calcNoteTablets')}` +
        (productLabel ? ` (${productLabel})` : '')
    );
    lines.push(`${t(language, 'so2ToAdd')}: ${so2Result.so2Needed} mg/L`);
  } else {
    lines.push(
      `${t(language, 'productToAdd')}: ${so2Result.gPerHl} g/hL` +
        (productLabel ? ` (${productLabel})` : '')
    );
    lines.push(`${so2Result.totalGrams} ${t(language, 'totalGrams')}`);
    lines.push(`${t(language, 'so2ToAdd')}: ${so2Result.needed} mg/L`);
  }

  lines.push(`${t(language, 'currentFreeSO2Label')}: ${so2Result.current} mg/L`);
  lines.push(`${t(language, 'targetFreeSO2')}: ${so2Result.target} mg/L`);
  lines.push('');
  lines.push(t(language, 'shareFooter'));

  return lines.join('\n');
}
