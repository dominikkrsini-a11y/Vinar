import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSessionPrefs, isValidLanguage, resolveLanguageGate, setSessionPrefs } from '../sessionCache';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('sessionCache', () => {
  beforeEach(() => {
    AsyncStorage.getItem.mockReset();
    AsyncStorage.setItem.mockReset();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
  });

  test('returns empty prefs when nothing is stored', async () => {
    expect(await getSessionPrefs()).toEqual({});
  });

  test('reads a valid language and onboarding flag', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
      language: 'en',
      hasOnboarded: true,
    }));
    expect(await getSessionPrefs()).toEqual({ language: 'en', hasOnboarded: true });
  });

  test('drops invalid language values', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ language: 'de' }));
    expect(await getSessionPrefs()).toEqual({ language: undefined, hasOnboarded: undefined });
  });

  test('returns empty prefs on storage failure', async () => {
    AsyncStorage.getItem.mockRejectedValue(new Error('unavailable'));
    expect(await getSessionPrefs()).toEqual({});
  });

  test('merges writes onto existing prefs', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ language: 'hr' }));
    const next = await setSessionPrefs({ hasOnboarded: true });
    expect(next).toEqual({ language: 'hr', hasOnboarded: true });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'vinar.sessionPrefs',
      JSON.stringify({ language: 'hr', hasOnboarded: true })
    );
  });

  test('isValidLanguage accepts only en and hr', () => {
    expect(isValidLanguage('en')).toBe(true);
    expect(isValidLanguage('hr')).toBe(true);
    expect(isValidLanguage(null)).toBe(false);
    expect(isValidLanguage('')).toBe(false);
    expect(isValidLanguage('de')).toBe(false);
  });

  test('resolveLanguageGate prefers a valid profile language', () => {
    expect(resolveLanguageGate({ profileLanguage: 'en', cachedLanguage: 'hr' })).toEqual({
      language: 'en',
      needsLang: false,
      source: 'profile',
    });
  });

  test('resolveLanguageGate falls back to a trustworthy cache when profile has no language', () => {
    expect(resolveLanguageGate({ profileLanguage: null, cachedLanguage: 'hr' })).toEqual({
      language: 'hr',
      needsLang: false,
      source: 'cache',
    });
    expect(resolveLanguageGate({ profileLanguage: '', cachedLanguage: 'en' }).source).toBe('cache');
  });

  test('resolveLanguageGate requires language selection when neither source is valid', () => {
    expect(resolveLanguageGate({ profileLanguage: null, cachedLanguage: undefined })).toEqual({
      language: null,
      needsLang: true,
      source: null,
    });
    expect(resolveLanguageGate({ profileLanguage: 'de', cachedLanguage: 'xx' }).needsLang).toBe(true);
    expect(resolveLanguageGate({}).needsLang).toBe(true);
  });
});
