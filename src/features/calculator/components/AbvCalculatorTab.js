import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { colors } from '../../../theme/colors';

export function AbvCalculatorTab({
  language,
  t,
  styles,

  startSG,
  setStartSG,
  startTemp,
  setStartTemp,
  endSG,
  setEndSG,
  endTemp,
  setEndTemp,

  abvError,
  abvResult,
  onCalculate,
  onReset,
}) {
  return (
    <>
      <Text style={styles.label}>{t(language, 'startingSG')}</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.inputLarge]}
          value={startSG}
          onChangeText={setStartSG}
          placeholder="e.g. 1108"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[styles.input, styles.inputSmall]}
          value={startTemp}
          onChangeText={setStartTemp}
          placeholder="°C"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
      </View>

      <Text style={styles.label}>{t(language, 'finishingSG')}</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.inputLarge]}
          value={endSG}
          onChangeText={setEndSG}
          placeholder="e.g. 994"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[styles.input, styles.inputSmall]}
          value={endTemp}
          onChangeText={setEndTemp}
          placeholder="°C"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
      </View>

      {abvError ? <Text style={styles.error}>{abvError}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={onCalculate}>
        <Text style={styles.buttonText}>{t(language, 'calculate')}</Text>
      </TouchableOpacity>

      {abvResult && (
        <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
          <Text style={styles.resetText}>{t(language, 'reset')}</Text>
        </TouchableOpacity>
      )}

      {abvResult && (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>{t(language, 'estimatedABV')}</Text>
          <Text style={styles.resultValue}>{abvResult.abv}%</Text>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t(language, 'correctedOG')}</Text>
            <Text style={styles.detailValue}>{abvResult.correctedOG}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t(language, 'correctedFG')}</Text>
            <Text style={styles.detailValue}>{abvResult.correctedFG}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.warning}>{t(language, 'abvWarning')}</Text>
        </View>
      )}
    </>
  );
}

