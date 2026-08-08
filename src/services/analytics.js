import { collection, addDoc } from 'firebase/firestore';
import Constants from 'expo-constants';
import { db, auth } from '../firebase/config';

// Product analytics, Firestore-backed. The Firebase JS SDK's own analytics
// module (gtag-based) does not run in React Native, so events are written to
// an `analytics_events` collection instead — same backend as the rest of the
// app, queryable from the Firebase console, and it works offline via the
// persistent local cache (events sync when the device reconnects).
export const EVENTS = {
  SIGN_UP: 'sign_up',
  SIGN_IN: 'sign_in',
  WINE_ADDED: 'wine_added',
  ENTRY_ADDED: 'entry_added',
  CALC_ABV_USED: 'calc_abv_used',
  CALC_SO2_USED: 'calc_so2_used',
  CALC_RESULT_SHARED: 'calc_result_shared',
  ASSISTANT_MESSAGE_SENT: 'assistant_message_sent',
  PDF_EXPORTED: 'pdf_exported',
  LISTING_CREATED: 'listing_created',
  LANGUAGE_SELECTED: 'language_selected',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  SCREEN_VIEW: 'screen_view',
};

// Pure payload builder, kept separate from the Firestore write so it can be
// unit tested. Only primitive prop values survive — nested objects would make
// funnel queries in the console painful and risk accidentally logging PII.
export function buildEventPayload({ event, props = {}, userId = null, appVersion = 'unknown', now = new Date() }) {
  if (!event || typeof event !== 'string') return null;

  const cleanProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === '') continue;
    if (['string', 'number', 'boolean'].includes(typeof value)) {
      cleanProps[key] = value;
    }
  }

  return {
    event,
    props: cleanProps,
    userId,
    appVersion,
    createdAt: now.toISOString(),
  };
}

// Fire-and-forget: analytics must never block or break the UI, and a failed
// write (e.g. security rules not yet deployed) must not spam error reporting,
// so failures are swallowed silently.
export function track(event, props = {}) {
  try {
    const payload = buildEventPayload({
      event,
      props,
      userId: auth.currentUser?.uid ?? null,
      appVersion: Constants.expoConfig?.version || 'unknown',
    });
    if (!payload) return;
    addDoc(collection(db, 'analytics_events'), payload).catch(() => {});
  } catch {
    // Never let analytics take the app down.
  }
}

export function trackScreenView(screenName) {
  if (!screenName) return;
  track(EVENTS.SCREEN_VIEW, { screen: screenName });
}
