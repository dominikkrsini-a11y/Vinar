export function reportError(error, context = {}) {
  const payload = {
    name: error?.name,
    message: String(error?.message || error || ''),
    context,
  };

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error('[reportError]', payload, error?.stack);
  } else {
    // eslint-disable-next-line no-console
    console.error('[reportError]', payload);
  }
}

