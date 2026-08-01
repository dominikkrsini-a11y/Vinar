const { getDefaultConfig } = require('expo/metro-config');

// Sentry's Metro plugin assigns Debug IDs so uploaded source maps match the
// shipped bundle. Treated as optional here for the same reason app.config.js
// only adds the Sentry plugin when SENTRY_ORG/SENTRY_PROJECT are set: a
// missing Sentry install should not make the bundler unusable. Production
// builds still fail loudly so source map upload can't silently regress.
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
