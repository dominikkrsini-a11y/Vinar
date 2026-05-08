import { useContext } from 'react';
import {
  View, Text, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import { assistantStyles as styles } from '../components/assistant/styles';
import { AssistantMessageList } from '../components/assistant/AssistantMessageList';
import { AssistantInputBar } from '../components/assistant/AssistantInputBar';
import { PendingImagePreview } from '../components/assistant/PendingImagePreview';
import { useAssistantOrchestrator } from '../components/assistant/useAssistantOrchestrator';

export default function AssistantScreen() {
  const { language } = useContext(LanguageContext);
  const {
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
  } = useAssistantOrchestrator({ language, t });

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
        <AssistantMessageList
          scrollRef={scrollRef}
          styles={styles}
          language={language}
          t={t}
          messages={messages}
          loading={loading}
          profile={profile}
          onSuggestionPress={(s) => setInput(s)}
        />

        {/* Pending image preview */}
        <PendingImagePreview
          pendingImage={pendingImage}
          styles={styles}
          onRemove={() => setPendingImage(null)}
        />

        {/* Input */}
        <AssistantInputBar
          styles={styles}
          language={language}
          t={t}
          input={input}
          setInput={setInput}
          pendingImage={pendingImage}
          loading={loading}
          onPressCamera={handleCamera}
          onPressSend={sendMessage}
        />

      </View>
    </KeyboardAvoidingView>
  );
}
