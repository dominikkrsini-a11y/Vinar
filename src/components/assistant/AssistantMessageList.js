import { View, Text, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Chip } from '../ui/Chip';
import { colors } from '../../theme/colors';

function MessageBubble({ msg, isUser, styles }) {
  const textContent = Array.isArray(msg.content)
    ? msg.content.find(c => c.type === 'text')?.text || ''
    : msg.content;

  return (
    <View style={[
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
}

export function AssistantMessageList({
  scrollRef,
  styles,
  language,
  t,
  messages,
  loading,
  profile,
  onSuggestionPress,
}) {
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.messages}
      contentContainerStyle={styles.messagesContent}
    >
      {messages.length === 0 && (
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>
            {language === 'hr' ? 'Dobro došli' : 'Welcome'}
            {profile?.firstName ? `, ${profile.firstName}` : ''}!
          </Text>
          <Text style={styles.welcomeText}>{t(language, 'welcomeMsg')}</Text>
          <View style={styles.suggestions}>
            {[
              t(language, 'suggestion1'),
              t(language, 'suggestion2'),
              t(language, 'suggestion3'),
              t(language, 'suggestion4'),
            ].map((s, i) => (
              <Chip key={i} label={s} onPress={() => onSuggestionPress(s)} />
            ))}
          </View>
        </View>
      )}

      {messages.map((msg, i) => (
        <MessageBubble key={i} msg={msg} isUser={msg.role === 'user'} styles={styles} />
      ))}

      {loading && (
        <View style={[styles.bubble, styles.bubbleAssistant, { alignSelf: 'flex-start' }]}>
          <ActivityIndicator color={colors.gold} size="small" />
        </View>
      )}
    </ScrollView>
  );
}

