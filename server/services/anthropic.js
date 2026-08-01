import { config } from '../config.js';

// Model and max_tokens are NOT parameters here — they are fixed in config.js
// and never accepted from the caller. This function has no way to send a
// client-chosen model or token budget to Anthropic, by construction.
export async function callAnthropic({ system, messages }) {
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.anthropicModel,
        max_tokens: config.anthropicMaxTokens,
        system,
        messages,
      }),
    });

    const text = await upstream.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON upstream response — treated as failure below.
    }

    return { status: upstream.status, data };
  } catch (err) {
    return { status: 502, data: null, networkError: true };
  }
}
