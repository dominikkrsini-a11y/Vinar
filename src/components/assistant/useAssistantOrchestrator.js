import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { auth } from '../../firebase/config';
import { getUserProfile } from '../../firebase/firestore';
import { getAssistantBaseUrl, sendAssistantMessage } from '../../services/assistant/client';
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

  const scrollRef = useRef(null);
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

    try {
      const apiMessages = newMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // system/model/max_tokens are no longer sent — the server owns all
      // three (see server/routes/assistant.js).
      const data = await sendAssistantMessage({
        baseUrl: assistantBaseUrl,
        messages: apiMessages,
      });

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: [{ type: 'text', text: data.content[0].text }],
      }]);
    } catch (e) {
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
      setLoading(false);
    }
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
  };
}
