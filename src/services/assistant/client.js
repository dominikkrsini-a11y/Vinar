import Constants from 'expo-constants';
import { auth } from '../../firebase/config';
import { reportError } from '../../utils/reportError';

const extra = Constants.expoConfig?.extra || {};

export const ASSISTANT_CLIENT_TIMEOUT_MS = 30000;
export const ASSISTANT_MAX_TURNS = 10;

export function isAbortError(err) {
  return err?.name === 'AbortError' || err?.name === 'TimeoutError';
}

// One turn is a user message plus the assistant reply, so 10 turns = 20 messages.
export function lastAssistantTurns(messages, maxTurns = ASSISTANT_MAX_TURNS) {
  if (!Array.isArray(messages)) return [];
  const maxMessages = maxTurns * 2;
  if (messages.length <= maxMessages) return messages;
  return messages.slice(-maxMessages);
}

// app.config.js loads .env via dotenv and writes assistantBaseUrl into
// Constants.expoConfig.extra — that is the canonical runtime source.
// process.env.EXPO_PUBLIC_* is inlined at Metro bundle time and can stay
// stale (e.g. old localhost) until a full rebundle; prefer extra first.
// Production must not silently fall back to localhost (testers' phones
// cannot reach it). Dev still does, so `expo start` keeps working.
export function resolveAssistantBaseUrl({ extraUrl, envUrl, isDev } = {}) {
  const configured = String(extraUrl || envUrl || '').trim();
  if (configured) return configured;
  return isDev ? 'http://localhost:3001' : null;
}

const getDefaultBaseUrl = () => resolveAssistantBaseUrl({
  extraUrl: extra.assistantBaseUrl,
  envUrl: process.env.EXPO_PUBLIC_ASSISTANT_BASE_URL,
  isDev: typeof __DEV__ !== 'undefined' && __DEV__,
});
// The server owns system prompt, model, and max_tokens — the client cannot
// set any of them. Only `messages` is sent, alongside a verified Firebase ID
// token, which the server uses to look up the user's own wines/logbook data
// to build the system prompt itself.
export async function sendAssistantMessage({ baseUrl, messages, signal } = {}) {
  const urlBase = baseUrl || getDefaultBaseUrl();
  if (!urlBase) {
    throw new Error('Assistant is not configured.');
  }
  const url = `${String(urlBase).replace(/\/+$/, '')}/api/assistant`;

  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not signed in.');
  }

  let idToken;
  try {
    idToken = await user.getIdToken();
  } catch (e) {
    reportError(e, { scope: 'assistantClient', action: 'getIdToken', url });
    throw new Error('Could not verify your session. Please sign in again.');
  }

  const ownController = signal ? null : new AbortController();
  const timeoutId = ownController
    ? setTimeout(() => ownController.abort(), ASSISTANT_CLIENT_TIMEOUT_MS)
    : null;
  const fetchSignal = signal || ownController.signal;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ messages }),
      signal: fetchSignal,
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      reportError(e, { scope: 'assistantClient', action: 'parseJson', url });
      let text = '';
      try {
        text = await response.text();
      } catch (e2) {
        reportError(e2, { scope: 'assistantClient', action: 'readTextFallback', url });
      }
      throw new Error(text || 'Invalid server response.');
    }

    if (!response.ok) {
      const msg = data?.error?.message || `Request failed (${response.status}).`;
      throw new Error(msg);
    }

    return data;
  } catch (e) {
    if (isAbortError(e)) {
      const err = new Error('Request cancelled.');
      err.name = 'AbortError';
      throw err;
    }
    throw e;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function getAssistantBaseUrl() {
  return getDefaultBaseUrl();
}
