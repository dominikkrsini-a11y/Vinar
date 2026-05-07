import { useState, useRef, useEffect, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { getUserProfile, getWines, getEntries } from '../firebase/firestore';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import { buildSystemPrompt } from '../services/assistant/prompt';
import { sendAssistantMessage, getAssistantBaseUrl } from '../services/assistant/client';
import { reportError } from '../utils/reportError';
import { Chip } from '../components/ui/Chip';

export default function AssistantScreen() {
  const { language } = useContext(LanguageContext);
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [loadingCtx,  setLoadingCtx]  = useState(true);
  const [profile,     setProfile]     = useState(null);
  const [wines,       setWines]       = useState([]);
  const [entries,     setEntries]     = useState({});
  const [pendingImage, setPendingImage] = useState(null);
  const scrollRef = useRef(null);
  const assistantBaseUrl = getAssistantBaseUrl();

  useEffect(() => { loadContext(); }, []);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const loadContext = async () => {
    try {
      const uid = auth.currentUser.uid;
      const [profileData, winesData] = await Promise.all([
        getUserProfile(uid),
        getWines(uid),
      ]);
      setProfile(profileData);
      setWines(winesData);
      const entriesMap = {};
      await Promise.all(winesData.map(async w => {
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
  };

  const handleCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        language === 'hr' ? 'Dozvola odbijena' : 'Permission denied',
        language === 'hr' ? 'Trebamo pristup kameri.' : 'We need access to your camera.'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.6,
    });
    if (!result.canceled) {
      setPendingImage(result.assets[0]);
    }
  };

  const imageToBase64 = async (uri) => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    return base64;
  };

  const sendMessage = async () => {
    if ((!input.trim() && !pendingImage) || loading) return;

    const userContent = [];
    let displayImage = null;

    if (pendingImage) {
      displayImage = pendingImage.uri;
      try {
        const base64data = await imageToBase64(pendingImage.uri);
        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: base64data,
          },
        });
      } catch (imgError) {
        reportError(imgError, { screen: 'Assistant', action: 'imageToBase64' });
      }
    }

    if (input.trim()) {
      userContent.push({ type: 'text', text: input.trim() });
    } else if (pendingImage) {
      userContent.push({
        type: 'text',
        text: language === 'hr' ? 'Što možete reći o ovoj slici?' : 'What can you tell me about this image?',
      });
    }

    const userMessage = { role: 'user', content: userContent, displayImage };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setPendingImage(null);
    setLoading(true);

    try {
      const apiMessages = newMessages.map(msg => ({
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

      setMessages(prev => [...prev, {
        role:    'assistant',
        content: [{ type: 'text', text: data.content[0].text }],
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role:    'assistant',
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

  const renderMessage = (msg, i) => {
    const isUser = msg.role === 'user';
    const textContent = Array.isArray(msg.content)
      ? msg.content.find(c => c.type === 'text')?.text || ''
      : msg.content;

    return (
      <View key={i} style={[
        styles.bubbleWrapper,
        isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperAssistant,
      ]}>
        {msg.displayImage && (
          <Image source={{ uri: msg.displayImage }}
            style={styles.chatImage} resizeMode="cover" />
        )}
        {textContent ? (
          <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
            <Text selectable style={[
              styles.bubbleText,
              isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
            ]}>
              {textContent}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  if (loadingCtx) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t(language, 'assistantTitle')}</Text>
          <Text style={styles.headerSub}>{t(language, 'assistantSub')}</Text>
        </View>

        {/* Messages */}
        <ScrollView ref={scrollRef} style={styles.messages}
          contentContainerStyle={styles.messagesContent}>

          {messages.length === 0 && (
            <View style={styles.welcome}>
              <Text style={styles.welcomeTitle}>
                {language === 'hr' ? 'Dobro došli' : 'Welcome'}{profile?.firstName ? `, ${profile.firstName}` : ''}!
              </Text>
              <Text style={styles.welcomeText}>{t(language, 'welcomeMsg')}</Text>
              <View style={styles.suggestions}>
                {[
                  t(language, 'suggestion1'),
                  t(language, 'suggestion2'),
                  t(language, 'suggestion3'),
                  t(language, 'suggestion4'),
                ].map((s, i) => (
                  <Chip key={i} label={s} onPress={() => setInput(s)} />
                ))}
              </View>
            </View>
          )}

          {messages.map((msg, i) => renderMessage(msg, i))}

          {loading && (
            <View style={[styles.bubble, styles.bubbleAssistant, { alignSelf: 'flex-start' }]}>
              <ActivityIndicator color={colors.gold} size="small" />
            </View>
          )}

        </ScrollView>

        {/* Pending image preview */}
        {pendingImage && (
          <View style={styles.pendingImageContainer}>
            <Image source={{ uri: pendingImage.uri }} style={styles.pendingImage} />
            <TouchableOpacity style={styles.removePending}
              onPress={() => setPendingImage(null)}>
              <Text style={styles.removePendingText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.plusBtn} onPress={handleCamera}>
            <Text style={styles.plusBtnText}>+</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t(language, 'askPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (((!input.trim() && !pendingImage) || loading)) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={(!input.trim() && !pendingImage) || loading}>
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: colors.background },
  center:                 { flex: 1, backgroundColor: colors.background,
                            alignItems: 'center', justifyContent: 'center' },
  header:                 { padding: 20, paddingTop: 52,
                            backgroundColor: colors.surface,
                            borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:            { fontSize: 18, color: colors.gold, fontWeight: '700' },
  headerSub:              { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  messages:               { flex: 1 },
  messagesContent:        { padding: 16, paddingBottom: 8 },
  welcome:                { alignItems: 'center', paddingTop: 20, paddingBottom: 10 },
  welcomeTitle:           { fontSize: 20, color: colors.gold,
                            fontWeight: '700', marginBottom: 8 },
  welcomeText:            { fontSize: 14, color: colors.textMuted,
                            textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  suggestions:            { flexDirection: 'row', flexWrap: 'wrap',
                            gap: 8, justifyContent: 'center' },
  bubbleWrapper:          { marginBottom: 10 },
  bubbleWrapperUser:      { alignItems: 'flex-end' },
  bubbleWrapperAssistant: { alignItems: 'flex-start' },
  bubble:                 { maxWidth: '85%', borderRadius: 16, padding: 12 },
  bubbleUser:             { backgroundColor: colors.gold, borderBottomRightRadius: 4 },
  bubbleAssistant:        { backgroundColor: colors.surface, borderBottomLeftRadius: 4,
                            borderWidth: 1, borderColor: colors.border,
                            minWidth: 50, alignItems: 'center' },
  bubbleText:             { fontSize: 14, lineHeight: 20 },
  bubbleTextUser:         { color: colors.background, fontWeight: '500' },
  bubbleTextAssistant:    { color: colors.textPrimary },
  chatImage:              { width: 220, height: 160, borderRadius: 12, marginBottom: 6 },
  pendingImageContainer:  { margin: 12, position: 'relative', alignSelf: 'flex-end' },
  pendingImage:           { width: 80, height: 80, borderRadius: 8 },
  removePending:          { position: 'absolute', top: -6, right: -6,
                            backgroundColor: colors.surface, borderRadius: 10,
                            width: 20, height: 20, alignItems: 'center',
                            justifyContent: 'center', borderWidth: 1,
                            borderColor: colors.border },
  removePendingText:      { color: colors.textMuted, fontSize: 12 },
  inputRow:               { flexDirection: 'row', padding: 12,
                            backgroundColor: colors.surface,
                            borderTopWidth: 1, borderTopColor: colors.border,
                            gap: 8, alignItems: 'flex-end' },
  plusBtn:                { width: 42, height: 42, borderRadius: 21,
                            backgroundColor: colors.surfaceDeep,
                            borderWidth: 1, borderColor: colors.border,
                            alignItems: 'center', justifyContent: 'center' },
  plusBtnText:            { fontSize: 24, color: colors.textMuted, lineHeight: 28 },
  input:                  { flex: 1, backgroundColor: colors.surfaceDeep,
                            borderWidth: 1, borderColor: colors.inputBorder,
                            borderRadius: 20, paddingHorizontal: 16,
                            paddingVertical: 10, color: colors.textPrimary,
                            fontSize: 15, maxHeight: 100 },
  sendBtn:                { width: 42, height: 42, borderRadius: 21,
                            backgroundColor: colors.gold,
                            alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:        { opacity: 0.4 },
  sendBtnText:            { fontSize: 20, color: colors.background, fontWeight: '700' },
});
