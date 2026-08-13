import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { colors } from '../theme/colors';
import { saveUserProfile } from '../firebase/firestore';
import { auth } from '../firebase/config';
import { reportError } from '../utils/reportError';
import { track, EVENTS } from '../services/analytics';

export default function LanguageSelectScreen({ onLanguageSelected }) {
  const handleSelect = async (lang) => {
    try {
      await saveUserProfile(auth.currentUser.uid, { language: lang });
    } catch (e) {
      reportError(e, { screen: 'LanguageSelect', action: 'saveLanguage', lang });
      Alert.alert('Error', 'Could not save language preference.');
    }
    track(EVENTS.LANGUAGE_SELECTED, { language: lang });
    onLanguageSelected(lang);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vinar</Text>
      <Text style={styles.subtitle}>🍷</Text>

      <Text style={styles.heading}>Choose your language</Text>
      <Text style={styles.headingHr}>Odaberite jezik</Text>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.langBtn} onPress={() => handleSelect('hr')}>
          <Text style={styles.flag}>🇭🇷</Text>
          <Text style={styles.langLabel}>Hrvatski</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.langBtn} onPress={() => handleSelect('en')}>
          <Text style={styles.flag}>🇬🇧</Text>
          <Text style={styles.langLabel}>English</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background,
                alignItems: 'center', justifyContent: 'center', padding: 40 },
  title:      { fontSize: 42, color: colors.gold, fontWeight: '700', marginBottom: 8 },
  subtitle:   { fontSize: 48, marginBottom: 40 },
  heading:    { fontSize: 18, color: colors.textPrimary, marginBottom: 4 },
  headingHr:  { fontSize: 18, color: colors.textMuted, marginBottom: 48 },
  buttons:    { flexDirection: 'row', gap: 20 },
  langBtn:    { backgroundColor: colors.surface, borderRadius: 16,
                borderWidth: 1, borderColor: colors.border,
                alignItems: 'center', paddingVertical: 24,
                paddingHorizontal: 32, minWidth: 130 },
  flag:       { fontSize: 48, marginBottom: 12 },
  langLabel:  { fontSize: 16, color: colors.textPrimary, fontWeight: '700' },
});
