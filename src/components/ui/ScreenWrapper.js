import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';

export function ScreenWrapper({ children, style }) {
  return <View style={[styles.base, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    paddingBottom: 60,
  },
});

