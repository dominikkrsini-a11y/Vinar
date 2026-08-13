import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'vinar.sessionPrefs';

function normalizePrefs(parsed) {
  if (!parsed || typeof parsed !== 'object') return {};
  const language = parsed.language === 'en' || parsed.language === 'hr'
    ? parsed.language
    : undefined;
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
