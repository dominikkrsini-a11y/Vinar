const { getDefaultConfig } = require('expo/metro-config');

// Sentry's Metro plugin assigns Debug IDs so uploaded source maps match the
// shipped bundle. Keep Metro usable without a Sentry install; app.config.js
// only adds the native upload plugin when SENTRY_ORG, SENTRY_PROJECT, and
// SENTRY_AUTH_TOKEN are all set.
function buildMetroConfig() {
  try {
    const { getSentryExpoConfig } = require('@sentry/react-native/metro');
    return getSentryExpoConfig(__dirname);
  } catch (error) {
    if (process.env.EAS_BUILD || process.env.CI) throw error;
    console.warn(
      '[metro.config] @sentry/react-native unavailable - using default Expo Metro config.'
    );
    return getDefaultConfig(__dirname);
  }
}

module.exports = buildMetroConfig();
