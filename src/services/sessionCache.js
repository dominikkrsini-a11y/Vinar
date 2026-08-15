import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'vinar.sessionPrefs';

export function isValidLanguage(value) {
  return value === 'en' || value === 'hr';
}

// After every profile attempt (success or failure), pick a language from the
// profile first, then from a trustworthy cache. Anything else needs the picker.
export function resolveLanguageGate({ profileLanguage, cachedLanguage } = {}) {
  if (isValidLanguage(profileLanguage)) {
    return { language: profileLanguage, needsLang: false, source: 'profile' };
  }
  if (isValidLanguage(cachedLanguage)) {
    return { language: cachedLanguage, needsLang: false, source: 'cache' };
  }
  return { language: null, needsLang: true, source: null };
}

function normalizePrefs(parsed) {
  if (!parsed || typeof parsed !== 'object') return {};
  const language = isValidLanguage(parsed.language) ? parsed.language : undefined;
  const hasOnboarded = typeof parsed.hasOnboarded === 'boolean'
    ? parsed.hasOnboarded
    : undefined;
  return { language, hasOnboarded };
}

export async function getSessionPrefs() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    return normalizePrefs(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function setSessionPrefs(partial = {}) {
  try {
    const current = await getSessionPrefs();
    const next = normalizePrefs({ ...current, ...partial });
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return normalizePrefs(partial);
  }
}
