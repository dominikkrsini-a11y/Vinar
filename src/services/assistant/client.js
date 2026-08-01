import Constants from 'expo-constants';
import { auth } from '../../firebase/config';
import { reportError } from '../../utils/reportError';

const extra = Constants.expoConfig?.extra || {};

// app.config.js loads .env via dotenv and writes assistantBaseUrl into
// Constants.expoConfig.extra — that is the canonical runtime source.
// process.env.EXPO_PUBLIC_* is inlined at Metro bundle time and can stay
// stale (e.g. old localhost) until a full rebundle; prefer extra first.
const getDefaultBaseUrl = () => {
  return (
    extra.assistantBaseUrl ||
    process.env.EXPO_PUBLIC_ASSISTANT_BASE_URL ||
    'http://localhost:3001'
  );
};
// The server owns system prompt, model, and max_tokens — the client cannot
// set any of them. Only `messages` is sent, alongside a verified Firebase ID
// token, which the server uses to look up the user's own wines/logbook data
// to build the system prompt itself.
export async function sendAssistantMessage({ baseUrl, messages }) {
  const urlBase = baseUrl || getDefaultBaseUrl();
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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ messages }),
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
}

export function getAssistantBaseUrl() {
  return getDefaultBaseUrl();
}
