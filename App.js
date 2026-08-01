import { useState } from 'react';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import { LanguageContext } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';

const sentryDsn =
  process.env.EXPO_PUBLIC_SENTRY_DSN || Constants.expoConfig?.extra?.sentryDsn;

// Client-safe DSN only (never the Sentry auth token — that's build-time-only,
// see app.config.js). Only send events in production so local development
// doesn't need Sentry configured at all.
if (sentryDsn && !__DEV__) {
  Sentry.init({
    dsn: sentryDsn,
    environment: 'production',
    tracesSampleRate: 0.2,
  });
}

function App() {
  const [language, setLanguage] = useState('hr');

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <AppNavigator />
    </LanguageContext.Provider>
  );
}

export default Sentry.wrap(App);
