import { lastAssistantTurns, isAbortError, sendAssistantMessage } from '../client';

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { assistantBaseUrl: 'http://localhost:3001' } },
}));

jest.mock('../../../firebase/config', () => ({
  auth: { currentUser: { uid: 'u1', getIdToken: async () => 'token' } },
}));

jest.mock('../../../utils/reportError', () => ({
  reportError: jest.fn(),
}));

describe('lastAssistantTurns', () => {
  test('returns empty for a non-array', () => {
    expect(lastAssistantTurns(null)).toEqual([]);
  });

  test('keeps short threads intact', () => {
    const messages = [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
    ];
    expect(lastAssistantTurns(messages)).toBe(messages);
  });

  test('caps to the last 10 turns (20 messages)', () => {
    const messages = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: String(i),
    }));
    const sliced = lastAssistantTurns(messages);
    expect(sliced).toHaveLength(20);
    expect(sliced[0].content).toBe('10');
    expect(sliced[19].content).toBe('29');
  });
});

describe('isAbortError', () => {
  test('recognizes AbortError and TimeoutError', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true);
    expect(isAbortError({ name: 'TimeoutError' })).toBe(true);
    expect(isAbortError({ name: 'TypeError' })).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});

describe('sendAssistantMessage abort', () => {
  test('maps fetch AbortError to a named AbortError', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    global.fetch = jest.fn(() => Promise.reject(abortErr));

    await expect(
      sendAssistantMessage({
        messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
        signal: { aborted: false },
      })
    ).rejects.toMatchObject({ name: 'AbortError', message: 'Request cancelled.' });
  });
});
