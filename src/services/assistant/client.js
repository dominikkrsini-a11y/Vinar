import Constants from 'expo-constants';

const getDefaultBaseUrl = () => {
  return (
    process.env.EXPO_PUBLIC_ASSISTANT_BASE_URL ||
    Constants.expoConfig?.extra?.assistantBaseUrl ||
    'http://localhost:3001'
  );
};

export async function sendAssistantMessage({
  baseUrl,
  system,
  messages,
  model = 'claude-3-5-haiku-latest',
  max_tokens = 1024,
}) {
  const urlBase = baseUrl || getDefaultBaseUrl();
  const url = `${String(urlBase).replace(/\/+$/, '')}/api/assistant`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, model, max_tokens }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    const text = await response.text().catch(() => '');
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

