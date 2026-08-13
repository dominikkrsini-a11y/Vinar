import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSessionPrefs, setSessionPrefs } from '../sessionCache';

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
});
