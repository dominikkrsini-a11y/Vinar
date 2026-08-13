import { useContext, useMemo } from 'react';
import {
  View, Text, ActivityIndicator, TouchableOpacity,
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
import { FeedbackSurveyModal } from '../components/feedback/FeedbackSurveyModal';

export default function AssistantScreen({ route, navigation }) {
  const { language } = useContext(LanguageContext);

  // Set by the Ask AI button on WineDetail. Derived straight from the route so
  // pinning the same wine again always works, and dismissing clears the param.
  const focusWine = route?.params?.wine ?? null;
  const clearFocusWine = () => navigation.setParams({ wine: undefined });

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
    cancelMessage,
    showAssistantSurvey,
    onAssistantSurveySubmit,
    onAssistantSurveyDismiss,
  } = useAssistantOrchestrator({ language, t, focusWine });

  const surveyChoices = useMemo(() => ([
    { value: 'yes', label: t(language, 'feedbackYes') },
    { value: 'partially', label: t(language, 'feedbackPartially') },
    { value: 'no', label: t(language, 'feedbackNo') },
  ]), [language]);

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
          focusWine={focusWine}
          onSuggestionPress={(s) => setInput(s)}
        />

        {/* Pinned wine */}
        {focusWine ? (
          <View style={styles.focusPill}>
            <Text style={styles.focusPillText} numberOfLines={1}>
              {t(language, 'askingAbout')}: {focusWine.name}
            </Text>
            <TouchableOpacity onPress={clearFocusWine} hitSlop={10}>
              <Text style={styles.focusPillClear}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

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
          onPressCancel={cancelMessage}
        />

        <FeedbackSurveyModal
          visible={showAssistantSurvey}
          title={t(language, 'feedbackAssistantUseful')}
          choices={surveyChoices}
          needsComment={(c) => c === 'partially' || c === 'no'}
          commentPlaceholder={t(language, 'feedbackCommentPlaceholder')}
          submitLabel={t(language, 'feedbackSubmit')}
          skipLabel={t(language, 'feedbackSkip')}
          onSubmit={onAssistantSurveySubmit}
          onDismiss={onAssistantSurveyDismiss}
        />

      </View>
    </KeyboardAvoidingView>
  );
}
