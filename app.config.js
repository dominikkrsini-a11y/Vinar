import 'dotenv/config';
import { getSentryExpoPlugins } from './src/config/sentryExpoPlugin.js';

// Every value here must come from EXPO_PUBLIC_* environment variables —
// no hardcoded keys or environment-specific URLs. Set these per environment
// via `.env` locally, or via EAS Environment Variables for EAS builds
// (see .env.example for the full required list).
// SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN are build-time only.
// The auth token must NEVER appear in plugin props or any EXPO_PUBLIC_*
// variable. Do not register a bare "@sentry/react-native" plugin when those
// vars are unset — that still injects sentry.gradle and production Android
// EAS builds fail with "organization ID or slug is required (--org)".

export default ({ config }) => {
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ...getSentryExpoPlugins()],
    extra: {
      ...(config.extra ?? {}),
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      // No fallback here — src/services/assistant/client.js owns the
      // localhost dev-only fallback. Production builds MUST set this via
      // EAS Environment Variables to the deployed proxy URL.
      assistantBaseUrl: process.env.EXPO_PUBLIC_ASSISTANT_BASE_URL?.trim() || undefined,
      // Client-safe DSN (see App.js) — not a secret, but still
      // environment-specific, so it comes from EXPO_PUBLIC_SENTRY_DSN.
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    },
  };
};

