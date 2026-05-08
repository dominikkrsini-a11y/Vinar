import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { auth } from '../../firebase/config';
import { getEntries, getUserProfile, getWines } from '../../firebase/firestore';
import { buildSystemPrompt } from '../../services/assistant/prompt';
import { getAssistantBaseUrl, sendAssistantMessage } from '../../services/assistant/client';
import { reportError } from '../../utils/reportError';
import { buildUserContent } from './buildUserContent';
import { captureCameraImage } from './camera';

export function useAssistantOrchestrator({ language, t }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCtx, setLoadingCtx] = useState(true);
  const [profile, setProfile] = useState(null);
  const [wines, setWines] = useState([]);
  const [entries, setEntries] = useState({});
  const [pendingImage, setPendingImage] = useState(null);

  const scrollRef = useRef(null);
  const assistantBaseUrl = getAssistantBaseUrl();

  useEffect(() => {
    (async () => {
      try {
        const uid = auth.currentUser.uid;
        const [profileData, winesData] = await Promise.all([
          getUserProfile(uid),
          getWines(uid),
        ]);
        setProfile(profileData);
        setWines(winesData);

        const entriesMap = {};
        await Promise.all(winesData.map(async (w) => {
          const e = await getEntries(uid, w.id);
          entriesMap[w.id] = e.slice(0, 5);
        }));
        setEntries(entriesMap);
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

    const { userContent, displayImage } = await buildUserContent({
      language,
      inputText: input,
      pendingImage,
      reportError,
    });

    const userMessage = { role: 'user', content: userContent, displayImage };
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

      const data = await sendAssistantMessage({
        baseUrl: assistantBaseUrl,
        model: 'claude-3-5-haiku-latest',
        max_tokens: 1024,
        system: buildSystemPrompt(profile, wines, entries),
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
          ? 'Ne mogu kontaktirati pomoćnika. Provjerite da server radi.'
          : 'Could not reach the assistant. Please check the local server is running.'
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

