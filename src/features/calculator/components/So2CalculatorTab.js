import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { colors } from '../../../theme/colors';

export function So2CalculatorTab({
  language,
  t,
  styles,

  WINE_TYPES_SO2,
  PRODUCTS,

  wineType,
  setWineType,
  pH,
  setPH,
  currentSO2,
  setCurrentSO2,
  volume,
  setVolume,
  product,
  setProduct,
  so2Pct,
  setSo2Pct,
  tabletMg,
  setTabletMg,

  so2Error,
  so2Result,
  onCalculate,
  onReset,
}) {
  return (
    <>
      <View style={styles.warningBox}>
        <Text style={styles.warningBoxText}>{t(language, 'so2Warning')}</Text>
      </View>

      <Text style={styles.label}>{t(language, 'wineTypeCal')}</Text>
      <View style={styles.typeRow}>
        {WINE_TYPES_SO2.map(wt => (
          <TouchableOpacity
            key={wt.key}
            style={[styles.typeBtn, wineType === wt.key && styles.typeBtnActive]}
            onPress={() => setWineType(wt.key)}
          >
            <Text style={[styles.typeBtnText, wineType === wt.key && styles.typeBtnTextActive]}>
              {wt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t(language, 'winePH')}</Text>
      <TextInput
        style={styles.input}
        value={pH}
        onChangeText={setPH}
        placeholder="e.g. 3.4"
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>{t(language, 'currentFreeSO2')}</Text>
      <TextInput
        style={styles.input}
        value={currentSO2}
        onChangeText={setCurrentSO2}
        placeholder="e.g. 12"
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>{t(language, 'volumeWine')}</Text>
      <TextInput
        style={styles.input}
        value={volume}
        onChangeText={setVolume}
        placeholder="e.g. 500"
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>{t(language, 'product')}</Text>
      <View style={styles.productRow}>
        {PRODUCTS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.productBtn, product === p.key && styles.productBtnActive]}
            onPress={() => {
              setProduct(p.key);
              if (p.unit === 'pct') setSo2Pct(String(p.defaultPct));
              if (p.unit === 'tablet') setTabletMg(String(p.defaultMg));
            }}
          >
            <Text style={[styles.productBtnText, product === p.key && styles.productBtnTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {(product === 'kmbs' || product === 'blend' || product === 'liquid') && (
        <>
          <Text style={styles.label}>{t(language, 'so2Content')}</Text>
          <TextInput
            style={styles.input}
            value={so2Pct}
            onChangeText={setSo2Pct}
            placeholder="e.g. 57"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            editable={product !== 'liquid'}
          />
        </>
      )}

      {product === 'campden' && (
        <>
          <Text style={styles.label}>{t(language, 'mgPerTablet')}</Text>
          <TextInput
            style={styles.input}
            value={tabletMg}
            onChangeText={setTabletMg}
            placeholder="e.g. 440"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </>
      )}

      {so2Error ? <Text style={styles.error}>{so2Error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={onCalculate}>
        <Text style={styles.buttonText}>{t(language, 'calculate')}</Text>
      </TouchableOpacity>

      {so2Result && (
        <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
          <Text style={styles.resetText}>{t(language, 'reset')}</Text>
        </TouchableOpacity>
      )}

      {so2Result && (
        <View style={styles.resultCard}>
          {so2Result.sufficient ? (
            <>
              <Text style={styles.resultLabel}>Status</Text>
              <Text style={[styles.resultValue, { color: colors.green, fontSize: 24 }]}>
                {t(language, 'noAdditionNeeded')}
              </Text>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t(language, 'currentFreeSO2Label')}</Text>
                <Text style={styles.detailValue}>{so2Result.current} mg/L</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t(language, 'targetFreeSO2')}</Text>
                <Text style={styles.detailValue}>{so2Result.target} mg/L</Text>
              </View>
            </>
          ) : product === 'campden' ? (
            <>
              <Text style={styles.resultLabel}>Campden tablets</Text>
              <Text style={styles.resultValue}>{so2Result.tablets}</Text>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t(language, 'so2ToAdd')}</Text>
                <Text style={styles.detailValue}>{so2Result.so2Needed} mg/L</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.resultLabel}>{t(language, 'productToAdd')}</Text>
              <Text style={styles.resultValue}>{so2Result.gPerHl} g/hL</Text>
              <Text style={[styles.resultValue, { fontSize: 28, marginTop: 4 }]}>
                {so2Result.totalGrams} {t(language, 'totalGrams')}
              </Text>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t(language, 'currentFreeSO2Label')}</Text>
                <Text style={styles.detailValue}>{so2Result.current} mg/L</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t(language, 'targetFreeSO2')}</Text>
                <Text style={styles.detailValue}>{so2Result.target} mg/L</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t(language, 'so2ToAdd')}</Text>
                <Text style={styles.detailValue}>{so2Result.needed} mg/L</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t(language, 'productSO2Content')}</Text>
                <Text style={styles.detailValue}>{so2Result.pct}%</Text>
              </View>
            </>
          )}
          <View style={styles.divider} />
          <Text style={styles.warning}>{t(language, 'so2ResultWarning')}</Text>
        </View>
      )}
    </>
  );
}

