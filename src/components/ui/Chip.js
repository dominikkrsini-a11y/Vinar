import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';

export function Chip({ label, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.chip, style]} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  text: { fontSize: 13, color: colors.textMuted },
});

