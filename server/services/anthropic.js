import { config } from '../config.js';

// Model and max_tokens are NOT parameters here — they are fixed in config.js
// and never accepted from the caller. This function has no way to send a
// client-chosen model or token budget to Anthropic, by construction.
// `tools` is server-supplied too (see services/assistantTools.js).
const ANTHROPIC_TIMEOUT_MS = 25000;

export async function callAnthropic({ system, messages, tools }) {
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
        ...(Array.isArray(tools) && tools.length > 0 ? { tools } : {}),
      }),
      signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
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
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      return {
        status: 504,
        data: { error: { message: 'The assistant timed out. Please try again.' } },
      };
    }
    return { status: 502, data: null, networkError: true };
  }
}
