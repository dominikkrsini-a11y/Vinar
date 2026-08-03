import { View, Text, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Chip } from '../ui/Chip';
import { colors } from '../../theme/colors';

function MessageBubble({ msg, isUser, styles }) {
  // displayText is what the winemaker typed; msg.content may carry an added wine
  // name that only the model needs to see.
  const textContent = msg.displayText ?? (Array.isArray(msg.content)
    ? msg.content.find(c => c.type === 'text')?.text || ''
    : msg.content);

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
  focusWine,
  onSuggestionPress,
}) {
  // With a wine pinned, the openers are about that wine instead of the whole cellar.
  const suggestionKeys = focusWine
    ? ['wineSuggestion1', 'wineSuggestion2', 'wineSuggestion3', 'wineSuggestion4']
    : ['suggestion1', 'suggestion2', 'suggestion3', 'suggestion4'];

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.messages}
      contentContainerStyle={styles.messagesContent}
    >
      {messages.length === 0 && (
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>
            {focusWine
              ? focusWine.name
              : `${language === 'hr' ? 'Dobro došli' : 'Welcome'}${
                  profile?.firstName ? `, ${profile.firstName}` : ''
                }!`}
          </Text>
          <Text style={styles.welcomeText}>{t(language, 'welcomeMsg')}</Text>
          <View style={styles.suggestions}>
            {suggestionKeys.map((key) => {
              const label = t(language, key);
              return <Chip key={key} label={label} onPress={() => onSuggestionPress(label)} />;
            })}
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
