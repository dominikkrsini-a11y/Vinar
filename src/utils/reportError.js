import * as Sentry from '@sentry/react-native';

export function reportError(error, context = {}) {
  const payload = {
    name: error?.name,
    message: String(error?.message || error || ''),
    context,
  };

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error('[reportError]', payload, error?.stack);
    return;
  }

  // eslint-disable-next-line no-console
  console.error('[reportError]', payload);

  // No-ops if Sentry.init() was never called (e.g. no DSN configured) —
  // see App.js.
  Sentry.captureException(error instanceof Error ? error : new Error(payload.message), {
    extra: context,
  });
}

