import { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';

// ─── ABV HELPERS ────────────────────────────────────────────────────────────
const correctSG = (sg, temp) => {
  const sgDecimal = sg / 1000;
  return sgDecimal + 0.00130 * (temp - 20);
};

const calculateABV = (ogRaw, ogTemp, fgRaw, fgTemp) => {
  const og = correctSG(ogRaw, ogTemp);
  const fg = correctSG(fgRaw, fgTemp);
  return (og - fg) * 131.25;
};

// ─── SO2 HELPERS ────────────────────────────────────────────────────────────
const getTargetFreeSO2 = (wineType, pH) => {
  const molecularTarget = wineType === 'red' ? 0.5 : 0.8;
  const ratio = 1 / (1 + Math.pow(10, pH - 1.81));
  return Math.round(molecularTarget / ratio);
};

const calculateSO2Addition = (targetFree, currentFree, volume, so2Percent) => {
  const so2Needed = targetFree - currentFree;
  if (so2Needed <= 0) return { needed: 0, gPerHl: 0, totalGrams: 0 };
  const gPerHl     = (so2Needed * 100) / (so2Percent * 10);
  const totalGrams = gPerHl * (volume / 100);
  return { needed: so2Needed, gPerHl: gPerHl.toFixed(2), totalGrams: totalGrams.toFixed(1) };
};

const TABS = ['ABV', 'SO₂'];

export default function CalculatorScreen({ navigation }) {
  const { language } = useContext(LanguageContext);

  // ABV state
  const [startSG,   setStartSG]   = useState('');
  const [startTemp, setStartTemp] = useState('');
  const [endSG,     setEndSG]     = useState('');
  const [endTemp,   setEndTemp]   = useState('');
  const [abvResult, setAbvResult] = useState(null);
  const [abvError,  setAbvError]  = useState('');
  const [activeTab, setActiveTab] = useState('ABV');

  // SO2 state
  const [wineType,   setWineType]   = useState('white');
  const [pH,         setPH]         = useState('');
  const [currentSO2, setCurrentSO2] = useState('');
  const [volume,     setVolume]     = useState('');
  const [product,    setProduct]    = useState('kmbs');
  const [so2Pct,     setSo2Pct]    = useState('57');
  const [tabletMg,   setTabletMg]  = useState('440');
  const [so2Result,  setSo2Result]  = useState(null);
  const [so2Error,   setSo2Error]   = useState('');

  const WINE_TYPES_SO2 = [
    { key: 'white', label: t(language, 'white') },
    { key: 'rose',  label: t(language, 'rose')  },
    { key: 'red',   label: t(language, 'red')   },
    { key: 'sweet', label: t(language, 'sweet') },
  ];

  const PRODUCTS = [
    { key: 'kmbs',    label: 'K₂S₂O₅ powder',  defaultPct: 57,   unit: 'pct'    },
    { key: 'blend',   label: 'Blend powder',    defaultPct: 55.1, unit: 'pct'    },
    { key: 'campden', label: 'Campden tablets', defaultMg:  440,  unit: 'tablet' },
    { key: 'liquid',  label: 'Liquid SO₂',      defaultPct: 100,  unit: 'pct'    },
  ];

  // ─── ABV CALCULATE ─────────────────────────────────────────────────────
  const handleABV = () => {
    setAbvError(''); setAbvResult(null);
    const og = parseFloat(startSG), ogT = parseFloat(startTemp);
    const fg = parseFloat(endSG),   fgT = parseFloat(endTemp);
    if (isNaN(og) || isNaN(ogT) || isNaN(fg) || isNaN(fgT)) {
      setAbvError('Please fill in all fields.'); return;
    }
    if (og < 900 || og > 1200) { setAbvError('Starting SG should be 900–1200.'); return; }
    if (fg < 900 || fg > 1200) { setAbvError('Finishing SG should be 900–1200.'); return; }
    if (fg >= og) { setAbvError('Finishing SG must be lower than starting SG.'); return; }
    if (ogT < 0 || ogT > 50 || fgT < 0 || fgT > 50) {
      setAbvError('Temperature must be 0–50°C.'); return;
    }
    const abv = calculateABV(og, ogT, fg, fgT);
    if (abv < 0 || abv > 25) { setAbvError('Result out of range. Check inputs.'); return; }
    setAbvResult({
      abv:         abv.toFixed(1),
      correctedOG: (correctSG(og, ogT) * 1000).toFixed(1),
      correctedFG: (correctSG(fg, fgT) * 1000).toFixed(1),
    });
  };

  // ─── SO2 CALCULATE ─────────────────────────────────────────────────────
  const handleSO2 = () => {
    setSo2Error(''); setSo2Result(null);
    const pHVal      = parseFloat(pH);
    const currentVal = parseFloat(currentSO2);
    const volVal     = parseFloat(volume);
    if (isNaN(pHVal) || isNaN(currentVal) || isNaN(volVal)) {
      setSo2Error('Please fill in all fields.'); return;
    }
    if (pHVal < 2.8 || pHVal > 4.5) {
      setSo2Error('pH should be between 2.8 and 4.5.'); return;
    }
    if (currentVal < 0 || currentVal > 200) {
      setSo2Error('Current free SO₂ should be 0–200 mg/L.'); return;
    }
    if (volVal <= 0 || volVal > 100000) {
      setSo2Error('Please enter a valid volume in liters.'); return;
    }
    const target = wineType === 'sweet' ? 45 : getTargetFreeSO2(wineType, pHVal);
    if (currentVal >= target) {
      setSo2Result({ sufficient: true, target, current: currentVal });
      return;
    }
    let result;
    if (product === 'campden') {
      const mgPerTablet = parseFloat(tabletMg) || 440;
      const so2Needed   = (target - currentVal) * volVal;
      const tablets     = Math.ceil(so2Needed / mgPerTablet);
      result = { sufficient: false, target, current: currentVal,
                 tablets, mgPerTablet, so2Needed: (target - currentVal).toFixed(1) };
    } else {
      const pct  = parseFloat(so2Pct) || 57;
      const calc = calculateSO2Addition(target, currentVal, volVal, pct);
      result = { sufficient: false, target, current: currentVal, ...calc, pct };
    }
    setSo2Result(result);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        <Text style={styles.title}>{t(language, 'calculators')}</Text>

        {/* Tab switcher */}
        <View style={styles.tabs}>
          {TABS.map(tab => (
            <TouchableOpacity key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'ABV' ? `🍷 ${t(language, 'abvTitle')}` : `🧪 ${t(language, 'so2Title')}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── ABV TAB ── */}
        {activeTab === 'ABV' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t(language, 'abvTitle')}</Text>
            <Text style={styles.cardSub}>{t(language, 'abvSub')}</Text>

            <Text style={styles.label}>{t(language, 'startingSG')}</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.inputLarge]}
                value={startSG} onChangeText={setStartSG}
                placeholder="e.g. 1108" placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad" />
              <TextInput style={[styles.input, styles.inputSmall]}
                value={startTemp} onChangeText={setStartTemp}
                placeholder="°C" placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad" />
            </View>

            <Text style={styles.label}>{t(language, 'finishingSG')}</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.inputLarge]}
                value={endSG} onChangeText={setEndSG}
                placeholder="e.g. 994" placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad" />
              <TextInput style={[styles.input, styles.inputSmall]}
                value={endTemp} onChangeText={setEndTemp}
                placeholder="°C" placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad" />
            </View>

            {abvError ? <Text style={styles.error}>{abvError}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={handleABV}>
              <Text style={styles.buttonText}>{t(language, 'calculate')}</Text>
            </TouchableOpacity>
            {abvResult && (
              <TouchableOpacity style={styles.resetBtn}
                onPress={() => { setStartSG(''); setStartTemp('');
                  setEndSG(''); setEndTemp(''); setAbvResult(null); }}>
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
          </View>
        )}

        {/* ── SO2 TAB ── */}
        {activeTab === 'SO₂' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t(language, 'so2Title')}</Text>
            <Text style={styles.cardSub}>{t(language, 'so2Sub')}</Text>

            <View style={styles.warningBox}>
              <Text style={styles.warningBoxText}>{t(language, 'so2Warning')}</Text>
            </View>

            <Text style={styles.label}>{t(language, 'wineTypeCal')}</Text>
            <View style={styles.typeRow}>
              {WINE_TYPES_SO2.map(wt => (
                <TouchableOpacity key={wt.key}
                  style={[styles.typeBtn, wineType === wt.key && styles.typeBtnActive]}
                  onPress={() => setWineType(wt.key)}>
                  <Text style={[styles.typeBtnText, wineType === wt.key && styles.typeBtnTextActive]}>
                    {wt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t(language, 'winePH')}</Text>
            <TextInput style={styles.input} value={pH} onChangeText={setPH}
              placeholder="e.g. 3.4" placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad" />

            <Text style={styles.label}>{t(language, 'currentFreeSO2')}</Text>
            <TextInput style={styles.input} value={currentSO2} onChangeText={setCurrentSO2}
              placeholder="e.g. 12" placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad" />

            <Text style={styles.label}>{t(language, 'volumeWine')}</Text>
            <TextInput style={styles.input} value={volume} onChangeText={setVolume}
              placeholder="e.g. 500" placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad" />

            <Text style={styles.label}>{t(language, 'product')}</Text>
            <View style={styles.productRow}>
              {PRODUCTS.map(p => (
                <TouchableOpacity key={p.key}
                  style={[styles.productBtn, product === p.key && styles.productBtnActive]}
                  onPress={() => {
                    setProduct(p.key);
                    if (p.unit === 'pct')    setSo2Pct(String(p.defaultPct));
                    if (p.unit === 'tablet') setTabletMg(String(p.defaultMg));
                  }}>
                  <Text style={[styles.productBtnText, product === p.key && styles.productBtnTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(product === 'kmbs' || product === 'blend' || product === 'liquid') && (
              <>
                <Text style={styles.label}>{t(language, 'so2Content')}</Text>
                <TextInput style={styles.input} value={so2Pct} onChangeText={setSo2Pct}
                  placeholder="e.g. 57" placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad" editable={product !== 'liquid'} />
              </>
            )}
            {product === 'campden' && (
              <>
                <Text style={styles.label}>{t(language, 'mgPerTablet')}</Text>
                <TextInput style={styles.input} value={tabletMg} onChangeText={setTabletMg}
                  placeholder="e.g. 440" placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad" />
              </>
            )}

            {so2Error ? <Text style={styles.error}>{so2Error}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={handleSO2}>
              <Text style={styles.buttonText}>{t(language, 'calculate')}</Text>
            </TouchableOpacity>
            {so2Result && (
              <TouchableOpacity style={styles.resetBtn}
                onPress={() => { setPH(''); setCurrentSO2('');
                  setVolume(''); setSo2Result(null); setSo2Error(''); }}>
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
          </View>
        )}

        {/* Reference tables button */}
        <TouchableOpacity style={styles.comingSoon}
          onPress={() => navigation.navigate('Reference')}>
          <Text style={styles.comingSoonTitle}>{t(language, 'comingSoon')}</Text>
          <Text style={styles.comingSoonItem}>🧪 {t(language, 'so2Targets')}</Text>
          <Text style={styles.comingSoonItem}>🍋 {t(language, 'acidity')}</Text>
          <Text style={styles.comingSoonItem}>🔬 {t(language, 'labGuide')}</Text>
          <Text style={styles.comingSoonItem}>📍 {t(language, 'labContacts')} →</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: colors.background },
  content:             { padding: 24, paddingBottom: 60 },
  title:               { fontSize: 28, color: colors.gold, fontWeight: '700', marginBottom: 16 },
  tabs:                { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tab:                 { flex: 1, paddingVertical: 10, borderRadius: 8,
                         backgroundColor: colors.surface, borderWidth: 1,
                         borderColor: colors.border, alignItems: 'center' },
  tabActive:           { backgroundColor: colors.surfaceDeep, borderColor: colors.gold },
  tabText:             { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  tabTextActive:       { color: colors.gold },
  card:                { backgroundColor: colors.surface, borderRadius: 12,
                         borderWidth: 1, borderColor: colors.border,
                         padding: 18, marginBottom: 16 },
  cardTitle:           { fontSize: 18, color: colors.textPrimary,
                         fontWeight: '700', marginBottom: 4 },
  cardSub:             { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  warningBox:          { backgroundColor: colors.surfaceDeep, borderRadius: 8,
                         borderWidth: 1, borderColor: '#7a4a00',
                         padding: 12, marginBottom: 8 },
  warningBoxText:      { fontSize: 12, color: '#c8902a', lineHeight: 18 },
  label:               { fontSize: 12, color: colors.textMuted,
                         textTransform: 'uppercase', letterSpacing: 1,
                         marginBottom: 6, marginTop: 14 },
  row:                 { flexDirection: 'row', gap: 10 },
  input:               { backgroundColor: colors.surfaceDeep, borderWidth: 1,
                         borderColor: colors.border, borderRadius: 8,
                         paddingHorizontal: 14, paddingVertical: 12,
                         color: colors.textPrimary, fontSize: 16 },
  inputLarge:          { flex: 1 },
  inputSmall:          { width: 70, textAlign: 'center' },
  typeRow:             { flexDirection: 'row', gap: 8 },
  typeBtn:             { flex: 1, paddingVertical: 8, borderRadius: 8,
                         backgroundColor: colors.surfaceDeep, borderWidth: 1,
                         borderColor: colors.border, alignItems: 'center' },
  typeBtnActive:       { borderColor: colors.gold },
  typeBtnText:         { fontSize: 12, color: colors.textMuted },
  typeBtnTextActive:   { color: colors.gold },
  productRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productBtn:          { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
                         backgroundColor: colors.surfaceDeep, borderWidth: 1,
                         borderColor: colors.border },
  productBtnActive:    { borderColor: colors.gold },
  productBtnText:      { fontSize: 12, color: colors.textMuted },
  productBtnTextActive:{ color: colors.gold },
  error:               { color: '#e07070', fontSize: 13, marginTop: 10, marginBottom: 4 },
  button:              { backgroundColor: colors.gold, borderRadius: 8,
                         paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  buttonText:          { color: colors.background, fontWeight: '700', fontSize: 16 },
  resetBtn:            { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  resetText:           { color: colors.textMuted, fontSize: 14 },
  resultCard:          { backgroundColor: colors.surfaceDeep, borderRadius: 12,
                         borderWidth: 1, borderColor: colors.gold,
                         padding: 20, marginTop: 16 },
  resultLabel:         { fontSize: 12, color: colors.textMuted,
                         textTransform: 'uppercase', letterSpacing: 1 },
  resultValue:         { fontSize: 48, color: colors.gold,
                         fontWeight: '700', marginTop: 4 },
  divider:             { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  detailRow:           { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel:         { fontSize: 13, color: colors.textMuted },
  detailValue:         { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  warning:             { fontSize: 12, color: colors.textMuted,
                         fontStyle: 'italic', lineHeight: 18 },
  comingSoon:          { backgroundColor: colors.surface, borderRadius: 12,
                         borderWidth: 1, borderColor: colors.border,
                         padding: 18, marginTop: 8 },
  comingSoonTitle:     { fontSize: 12, color: colors.textMuted,
                         textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  comingSoonItem:      { fontSize: 14, color: colors.textMuted, marginBottom: 8 },
});
