import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { auth } from '../../firebase/config';
import { getUserProfile } from '../../firebase/firestore';
import {
  FEEDBACK_TYPES,
  hasAskedFeedback,
  markFeedbackAsked,
  submitFeedback,
} from '../../firebase/feedback';
import { getAssistantBaseUrl, sendAssistantMessage, lastAssistantTurns, isAbortError } from '../../services/assistant/client';
import { track, EVENTS } from '../../services/analytics';
import { reportError } from '../../utils/reportError';
import { buildUserContent } from './buildUserContent';
import { captureCameraImage } from './camera';

export function useAssistantOrchestrator({ language, t, focusWine }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCtx, setLoadingCtx] = useState(true);
  const [profile, setProfile] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [showAssistantSurvey, setShowAssistantSurvey] = useState(false);

  const scrollRef = useRef(null);
  // Session-local gate so a second successful reply in the same session cannot
  // re-open the survey before the profile write lands.
  const assistantSurveyAskedRef = useRef(false);
  const abortRef = useRef(null);
  const cancelledRef = useRef(false);
  const assistantBaseUrl = getAssistantBaseUrl();

  useEffect(() => {
    (async () => {
      try {
        // Only the profile is fetched here — it's used for the local
        // welcome message (see AssistantMessageList.js). Wines and logbook
        // entries are no longer fetched client-side: the server builds the
        // system prompt itself from Firestore, keyed by the verified uid.
        const uid = auth.currentUser.uid;
        const profileData = await getUserProfile(uid);
        setProfile(profileData);
        const asked = await hasAskedFeedback(uid, FEEDBACK_TYPES.ASSISTANT_USEFUL);
        assistantSurveyAskedRef.current = asked;
      } catch (e) {
        reportError(e, { screen: 'Assistant', action: 'loadContext' });
        Alert.alert(
          language === 'hr' ? 'Greška' : 'Error',
          language === 'hr'
            ? 'Ne mogu učitati podatke za asistenta.'
            : 'Could not load assistant context.'
        );
      } finally {
        setLoadingCtx(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional — load-once pattern, adding dependency causes infinite loop
  }, []);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleCamera = async () => {
    const asset = await captureCameraImage({ language });
    if (asset) setPendingImage(asset);
  };

  const cancelMessage = () => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    setLoading(false);
  };

  const sendMessage = async () => {
    if ((!input.trim() && !pendingImage) || loading) return;

    const { userContent, displayImage, displayText } = await buildUserContent({
      language,
      inputText: input,
      pendingImage,
      focusWine,
      reportError,
    });

    const userMessage = { role: 'user', content: userContent, displayImage, displayText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setPendingImage(null);
    setLoading(true);
    cancelledRef.current = false;

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const apiMessages = lastAssistantTurns(newMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })));

      // system/model/max_tokens are no longer sent — the server owns all
      // three (see server/routes/assistant.js).
      const data = await sendAssistantMessage({
        baseUrl: assistantBaseUrl,
        messages: apiMessages,
        signal: controller.signal,
      });

      if (cancelledRef.current) return;

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: [{ type: 'text', text: data.content[0].text }],
      }]);

      track(EVENTS.ASSISTANT_MESSAGE_SENT, {
        hasImage: Boolean(displayImage),
        aboutWine: Boolean(focusWine),
      });

      // First successful reply only — error bubbles in catch must not trigger this.
      if (!assistantSurveyAskedRef.current) {
        assistantSurveyAskedRef.current = true;
        setShowAssistantSurvey(true);
      }
    } catch (e) {
      if (cancelledRef.current) return;
      if (isAbortError(e)) {
        // Timed out — leave the user message, tell them it did not finish.
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: [{ type: 'text', text: t(language, 'errorMsg') }],
        }]);
        reportError(e, { screen: 'Assistant', action: 'sendMessageTimeout', assistantBaseUrl });
        Alert.alert(
          language === 'hr' ? 'Greška' : 'Error',
          language === 'hr'
            ? 'Zahtjev je predugo trajao. Pokušajte ponovno.'
            : 'The request took too long. Please try again.'
        );
        return;
      }

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: [{ type: 'text', text: t(language, 'errorMsg') }],
      }]);

      reportError(e, { screen: 'Assistant', action: 'sendMessage', assistantBaseUrl });
      Alert.alert(
        language === 'hr' ? 'Greška' : 'Error',
        language === 'hr'
          ? 'Trenutno ne mogu kontaktirati pomoćnika. Pokušajte ponovno kasnije.'
          : 'Could not reach the assistant right now. Please try again later.'
      );
    } finally {
      clearTimeout(timeoutId);
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  };

  const onAssistantSurveySubmit = ({ choice, comment }) => {
    setShowAssistantSurvey(false);
    const uid = auth.currentUser?.uid;
    if (!uid || !choice) {
      markFeedbackAsked(uid, FEEDBACK_TYPES.ASSISTANT_USEFUL);
      return;
    }
    submitFeedback({
      userId: uid,
      type: FEEDBACK_TYPES.ASSISTANT_USEFUL,
      choice,
      comment,
      context: 'assistant',
    });
  };

  const onAssistantSurveyDismiss = () => {
    setShowAssistantSurvey(false);
    assistantSurveyAskedRef.current = true;
    markFeedbackAsked(auth.currentUser?.uid, FEEDBACK_TYPES.ASSISTANT_USEFUL);
  };

  return {
    scrollRef,
    loadingCtx,
    loading,
    profile,
    messages,
    input,
    setInput,
    pendingImage,
    setPendingImage,
    handleCamera,
    sendMessage,
    cancelMessage,
    showAssistantSurvey,
    onAssistantSurveySubmit,
    onAssistantSurveyDismiss,
  };
}
