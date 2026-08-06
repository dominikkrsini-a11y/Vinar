import { collection, addDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import Constants from 'expo-constants';
import { db } from './config';
import { getUserProfile } from './firestore';
import { reportError } from '../utils/reportError';

export { buildLogbookFeedbackComment } from '../feedback/buildLogbookFeedbackComment';

export const FEEDBACK_TYPES = {
  ASSISTANT_USEFUL: 'assistant_useful',
  LOGBOOK_SPEED: 'logbook_speed',
};

function appVersion() {
  return Constants.expoConfig?.version || 'unknown';
}

export async function hasAskedFeedback(userId, type) {
  if (!userId || !type) return false;
  try {
    const profile = await getUserProfile(userId);
    return Boolean(profile?.feedbackAsked?.[type]);
  } catch (e) {
    reportError(e, { screen: 'Feedback', action: 'hasAskedFeedback', type });
    return false;
  }
}

// Fire-and-forget merge onto the user profile so surveys are never re-asked,
// including after a dismiss with no answer written. Uses dotted-path update so
// setting one survey flag does not wipe the other.
export function markFeedbackAsked(userId, type) {
  if (!userId || !type) return;
  const ref = doc(db, 'users', userId);
  updateDoc(ref, { [`feedbackAsked.${type}`]: true }).catch(() => {
    // Profile doc may not exist yet (language select is the usual first write).
    setDoc(ref, { feedbackAsked: { [type]: true } }, { merge: true }).catch((e) => {
      reportError(e, { screen: 'Feedback', action: 'markFeedbackAsked', type });
    });
  });
}

export function submitFeedback({ userId, type, choice, comment, context }) {
  if (!userId || !type || !choice || !context) return;

  const payload = {
    userId,
    type,
    choice,
    createdAt: new Date().toISOString(),
    appVersion: appVersion(),
    context,
  };
  const trimmed = typeof comment === 'string' ? comment.trim() : '';
  if (trimmed) payload.comment = trimmed;

  addDoc(collection(db, 'feedback'), payload).catch((e) => {
    reportError(e, { screen: 'Feedback', action: 'submitFeedback', type });
  });

  markFeedbackAsked(userId, type);
}
