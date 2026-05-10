import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';

export function Button({ title, onPress, variant = 'primary', disabled, style }) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.textBase, isPrimary ? styles.textPrimary : styles.textSecondary]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.gold },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: { opacity: 0.5 },
  textBase: { fontWeight: '700', fontSize: 14 },
  textPrimary: { color: colors.background },
  textSecondary: { color: colors.gold },
});

