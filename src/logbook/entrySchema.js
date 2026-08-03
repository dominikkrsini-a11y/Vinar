// One description of what a logbook entry holds, used by the add form, the wine
// detail cards and the PDF export. Adding a field in one place makes it appear
// in all three, so they cannot drift apart.
//
// `name` is the Firestore field name and must not change once data exists.
// `ranges` are sanity bounds only — a value outside them asks for confirmation
// rather than blocking, because the cellar always has an exception.

const num = (name, label, placeholderKey, ranges, extra = {}) => ({
  name,
  numeric: true,
  placeholderKey,
  ranges,
  ...label,
  ...extra,
});

const text = (name, label, placeholderKey, extra = {}) => ({
  name,
  placeholderKey,
  ...label,
  ...extra,
});

// Either a translation key or a literal that is the same in both languages.
const key = (labelKey) => ({ labelKey });
const lit = (label) => ({ label });

// Density is stored as g/L (1080) but plenty of people read SG off the hydrometer
// (1.080), and the server accepts both, so both count as plausible here.
const DENSITY_RANGES = [
  [0.98, 1.2],
  [980, 1200],
];

const F = {
  temperature: num('temperature', key('temperature'), 'tempPlaceholder', [[-5, 45]], { unit: '°C', icon: '🌡' }),
  density: num('density', key('density'), 'densityPlaceholder', DENSITY_RANGES, { unit: 'g/L', icon: '⚖️' }),
  sugar: num('sugar', key('sugar'), 'sugarPlaceholder', [[0, 400]], { unit: 'g/L', icon: '🍬' }),
  ph: num('ph', lit('pH'), 'phPlaceholder', [[2.5, 4.5]], { icon: '🔬' }),
  so2Amount: num('amount', key('so2Amount'), 'amountPlaceholder', [[0, 200]], { unit: 'g/hL', icon: '💊' }),
  freeSo2Before: num('freeSo2', key('freeSo2Before'), 'freeSo2Placeholder', [[0, 100]], { unit: 'ppm', icon: '📊' }),
  freeSo2: num('freeSo2', key('freeSo2Field'), 'freeSo2Placeholder', [[0, 100]], { unit: 'ppm', icon: '📊' }),
  totalSo2: num('totalSo2', key('totalSo2Field'), 'totalSo2Placeholder', [[0, 400]], { unit: 'ppm', icon: '📈' }),
  ta: num('ta', key('taField'), 'taPlaceholder', [[2, 20]], { unit: 'g/L', icon: '🍋' }),
  volumeRacked: num('volumeRacked', key('volumeRacked'), 'volumePlaceholder', [[1, 100000]], { unit: 'L', icon: '🪣' }),
  yeast: text('yeast', key('yeastStrain'), 'yeastPlaceholder', { remember: true, icon: '🦠' }),
  product: text('product', key('productUsed'), 'productPlaceholder', { remember: true, icon: '📦' }),
  vesselTo: text('vesselTo', key('vesselTo'), 'vesselPlaceholder', { icon: '🛢' }),
};

export const ENTRY_TYPES = [
  { key: 'fermentation', labelKey: 'fermentation', icon: '🌡️' },
  { key: 'sulfur', labelKey: 'sulfur', icon: '🧪' },
  { key: 'racking', labelKey: 'racking', icon: '🪣' },
  { key: 'measurement', labelKey: 'measurement', icon: '🔬' },
  { key: 'note', labelKey: 'note', icon: '📝' },
];

export const ENTRY_ICONS = ENTRY_TYPES.reduce((acc, t) => {
  acc[t.key] = t.icon;
  return acc;
}, {});

export const FIELDS_BY_TYPE = {
  fermentation: [F.temperature, F.density, F.sugar, F.ph, F.yeast],
  sulfur: [F.so2Amount, F.product, F.freeSo2Before, F.ph],
  racking: [F.volumeRacked, F.vesselTo],
  measurement: [F.ph, F.freeSo2, F.totalSo2, F.ta, F.temperature],
  note: [],
};

// Tap-only choices — no typing needed for the things that are always one of two.
export const CHIP_GROUPS_BY_TYPE = {
  racking: [
    {
      name: 'lees',
      labelKey: 'leesType',
      options: [
        { value: 'gross', labelKey: 'leesGross' },
        { value: 'fine', labelKey: 'leesFine' },
      ],
    },
    {
      name: 'method',
      labelKey: 'rackingMethod',
      options: [
        { value: 'gravity', labelKey: 'methodGravity' },
        { value: 'pump', labelKey: 'methodPump' },
      ],
    },
  ],
};

export function fieldsForType(type) {
  return FIELDS_BY_TYPE[type] || [];
}

export function chipGroupsForType(type) {
  return CHIP_GROUPS_BY_TYPE[type] || [];
}

export function entryTypeLabelKey(type) {
  return ENTRY_TYPES.find((t) => t.key === type)?.labelKey || 'note';
}

export function fieldLabel(field, t, language) {
  return field.label || t(language, field.labelKey);
}

// Reads a chip value back for display. Kept here so the detail card and the PDF
// use the same wording as the form.
export function chipValueLabel(type, groupName, value, t, language) {
  const group = chipGroupsForType(type).find((g) => g.name === groupName);
  const option = group?.options.find((o) => o.value === value);
  return option ? t(language, option.labelKey) : value;
}

export function isWithinRanges(value, ranges) {
  if (!ranges || ranges.length === 0) return true;
  return ranges.some(([min, max]) => value >= min && value <= max);
}
