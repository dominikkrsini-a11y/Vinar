import 'dotenv/config';

// Every value here must come from EXPO_PUBLIC_* environment variables —
// no hardcoded keys or environment-specific URLs. Set these per environment
// via `.env` locally, or via EAS Environment Variables for EAS builds
// (see .env.example for the full required list).
// SENTRY_ORG / SENTRY_PROJECT are non-secret identifiers used only at build
// time (by `expo prebuild`/EAS Build) so the Sentry Expo plugin knows where
// to upload source maps. The actual credential, SENTRY_AUTH_TOKEN, is read
// directly by the Sentry build tooling from the environment — it must NEVER
// appear here or in any EXPO_PUBLIC_* variable. When org/project are unset,
// register the bare "@sentry/react-native" plugin so `npx expo install` and
// local dev work; when set, use the configured expo plugin for source maps.
const sentryPlugin =
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
    ? [
        [
          '@sentry/react-native/expo',
          {
            url: 'https://sentry.io/',
            organization: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
          },
        ],
      ]
    : ['@sentry/react-native'];

export default ({ config }) => {
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ...sentryPlugin],
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

