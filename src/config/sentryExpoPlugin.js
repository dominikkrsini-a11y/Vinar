/**
 * Sentry Expo config plugin for EAS native builds.
 *
 * `@sentry/react-native` and `@sentry/react-native/expo` are the same plugin.
 * Registering it without organization/project still injects sentry.gradle, and
 * the Android release task `createBundleReleaseJsAndAssets_SentryUpload_*`
 * then fails with: "An organization ID or slug is required (provide with --org)".
 *
 * Only enable the plugin when org, project, AND auth token are present so
 * source maps upload. Runtime crash reporting uses EXPO_PUBLIC_SENTRY_DSN
 * in App.js and does not need this plugin. Never put the auth token in the
 * plugin props — Sentry would write it into the native project.
 */
export function getSentryExpoPlugins({
  org = process.env.SENTRY_ORG,
  project = process.env.SENTRY_PROJECT,
  authToken = process.env.SENTRY_AUTH_TOKEN,
} = {}) {
  const organization = String(org || '').trim();
  const projectSlug = String(project || '').trim();
  const token = String(authToken || '').trim();

  if (!organization || !projectSlug || !token) {
    return [];
  }

  return [
    [
      '@sentry/react-native/expo',
      {
        url: 'https://sentry.io/',
        organization,
        project: projectSlug,
      },
    ],
  ];
}
