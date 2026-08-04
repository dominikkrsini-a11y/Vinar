// Reports translation keys referenced by t(language, 'key') that are missing from
// either language block. A missing key renders as the raw key on screen, which is
// easy to ship without noticing.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { translations } from '../src/i18n/translations.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith('.js') ? [full] : [];
  });
}

const referenced = new Map();
for (const file of walk(SRC)) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\bt\(\s*language\s*,\s*'([^']+)'\s*\)/g)) {
    if (!referenced.has(match[1])) referenced.set(match[1], relative(ROOT, file));
  }
}

// The literal scan above cannot see keys looked up through a variable, and the
// entry schema and status helper are built entirely that way — exactly where a
// typo would be invisible until a winemaker saw a raw key on a form.
const { ENTRY_TYPES, FIELDS_BY_TYPE, CHIP_GROUPS_BY_TYPE } = await import(
  '../src/logbook/entrySchema.js'
);

for (const type of ENTRY_TYPES) referenced.set(type.labelKey, 'entrySchema ENTRY_TYPES');
for (const fields of Object.values(FIELDS_BY_TYPE)) {
  for (const field of fields) {
    if (field.labelKey) referenced.set(field.labelKey, 'entrySchema FIELDS_BY_TYPE');
    referenced.set(field.placeholderKey, 'entrySchema FIELDS_BY_TYPE');
  }
}
for (const groups of Object.values(CHIP_GROUPS_BY_TYPE)) {
  for (const group of groups) {
    referenced.set(group.labelKey, 'entrySchema CHIP_GROUPS_BY_TYPE');
    for (const option of group.options) {
      referenced.set(option.labelKey, 'entrySchema CHIP_GROUPS_BY_TYPE');
    }
  }
}

const STATUS_KEYS = [
  'statusNoEntries', 'statusNotStarted', 'statusFermenting', 'statusSlow',
  'statusStuck', 'statusAging', 'statusUnderprotected', 'statusSo2Due',
  'statusTooWarm',
];
for (const key of STATUS_KEYS) referenced.set(key, 'wineStatus');

for (const key of ['suggestion1', 'suggestion2', 'suggestion3', 'suggestion4',
  'wineSuggestion1', 'wineSuggestion2', 'wineSuggestion3', 'wineSuggestion4']) {
  referenced.set(key, 'AssistantMessageList');
}

const problems = [];
for (const [key, file] of referenced) {
  for (const lang of ['en', 'hr']) {
    if (translations[lang][key] === undefined) {
      problems.push(`missing translations.${lang}.${key}  (used in ${file})`);
    }
  }
}

// The other direction: keys defined in one language but not the other.
for (const lang of ['en', 'hr']) {
  const other = lang === 'en' ? 'hr' : 'en';
  for (const key of Object.keys(translations[lang])) {
    if (translations[other][key] === undefined) {
      problems.push(`translations.${lang}.${key} has no ${other} counterpart`);
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`OK — ${referenced.size} referenced keys resolve in both languages.`);
