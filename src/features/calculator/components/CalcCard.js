import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/colors';

export function CalcCard({ title, subtitle, children }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, color: colors.textPrimary, fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
});

