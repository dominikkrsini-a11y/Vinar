import { useContext } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { LanguageContext } from '../../context/LanguageContext';

// Subtle app-wide banner shown only while offline. Wines and logbook
// entries keep working while it's visible — this is a status indicator,
// not a blocker.
export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const { language } = useContext(LanguageContext);

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {language === 'hr'
          ? 'Bez interneta — promjene će se sinkronizirati kad se povežete.'
          : 'Offline — changes will sync when online.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.burgundy,
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
