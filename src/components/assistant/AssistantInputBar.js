import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';

export function AssistantInputBar({
  styles,
  language,
  t,
  input,
  setInput,
  pendingImage,
  loading,
  onPressCamera,
  onPressSend,
}) {
  const disabled = ((!input.trim() && !pendingImage) || loading);

  return (
    <View style={styles.inputRow}>
      <TouchableOpacity style={styles.plusBtn} onPress={onPressCamera}>
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
        style={[styles.sendBtn, disabled && styles.sendBtnDisabled]}
        onPress={onPressSend}
        disabled={disabled}
      >
        <Text style={styles.sendBtnText}>↑</Text>
      </TouchableOpacity>
    </View>
  );
}

