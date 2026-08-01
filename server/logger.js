// Structured JSON logging — Railway (and most hosts) capture stdout/stderr
// as logs, so emitting one JSON object per line makes proxy failures
// searchable/filterable instead of invisible free-text strings.
function write(stream, level, event, details) {
  stream(JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...details,
  }));
}

export function logInfo(event, details = {}) {
  // eslint-disable-next-line no-console
  write(console.log, 'info', event, details);
}

export function logError(event, details = {}) {
  // eslint-disable-next-line no-console
  write(console.error, 'error', event, details);
}
