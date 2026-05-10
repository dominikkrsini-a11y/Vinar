import { View, Text, TouchableOpacity } from 'react-native';
import { TextField } from '../../../components/ui/TextField';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';

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
        <TextField
          style={styles.inputLarge}
          value={startSG}
          onChangeText={setStartSG}
          placeholder="e.g. 1108"
          keyboardType="decimal-pad"
        />
        <TextField
          style={styles.inputSmall}
          value={startTemp}
          onChangeText={setStartTemp}
          placeholder="°C"
          keyboardType="decimal-pad"
        />
      </View>

      <Text style={styles.label}>{t(language, 'finishingSG')}</Text>
      <View style={styles.row}>
        <TextField
          style={styles.inputLarge}
          value={endSG}
          onChangeText={setEndSG}
          placeholder="e.g. 994"
          keyboardType="decimal-pad"
        />
        <TextField
          style={styles.inputSmall}
          value={endTemp}
          onChangeText={setEndTemp}
          placeholder="°C"
          keyboardType="decimal-pad"
        />
      </View>

      {abvError ? <Text style={styles.error}>{abvError}</Text> : null}

      <PrimaryButton style={styles.button} onPress={onCalculate} label={t(language, 'calculate')} />

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

