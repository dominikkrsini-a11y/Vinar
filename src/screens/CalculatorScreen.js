import { useState, useContext, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Alert, Modal, Share,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { subscribeToWines } from '../firebase/firestore';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import { calculateABV, calculateSO2Addition, correctSG, getTargetFreeSO2 } from '../features/calculator/helpers';
import { buildSulfurPrefill } from '../features/calculator/so2Entry';
import { buildAbvShareMessage, buildSo2ShareMessage } from '../features/calculator/shareResults';
import { reportError } from '../utils/reportError';
import { track, EVENTS } from '../services/analytics';
import { toNumber } from '../utils/numbers';
import { TabSwitcher } from '../features/calculator/components/TabSwitcher';
import { CalcCard } from '../features/calculator/components/CalcCard';
import { AbvCalculatorTab } from '../features/calculator/components/AbvCalculatorTab';
import { So2CalculatorTab } from '../features/calculator/components/So2CalculatorTab';

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

  // Wines are only needed to save a result into a logbook. Same live source as
  // the dashboard, so the list is there offline too.
  const [wines,          setWines]          = useState([]);
  const [showWinePicker, setShowWinePicker] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToWines(
      auth.currentUser.uid,
      setWines,
      (e) => reportError(e, { screen: 'Calculator', action: 'subscribeToWines' })
    );
    return unsubscribe;
  }, []);

  const WINE_TYPES_SO2 = [
    { key: 'white', label: t(language, 'white') },
    { key: 'rose',  label: t(language, 'rose')  },
    { key: 'red',   label: t(language, 'red')   },
    { key: 'sweet', label: t(language, 'sweet') },
  ];

  const PRODUCTS = [
    { key: 'kmbs',    label: 'K₂S₂O₅',                     defaultPct: 57,   unit: 'pct'    },
    { key: 'blend',   label: t(language, 'productBlend'),   defaultPct: 55.1, unit: 'pct'    },
    { key: 'campden', label: t(language, 'productCampden'), defaultMg:  440,  unit: 'tablet' },
    { key: 'liquid',  label: t(language, 'productLiquid'),  defaultPct: 100,  unit: 'pct'    },
  ];

  // ─── ABV CALCULATE ─────────────────────────────────────────────────────
  const handleABV = () => {
    setAbvError(''); setAbvResult(null);
    // toNumber, not parseFloat — the numeric pad hands back a decimal comma in
    // Croatian locales and parseFloat would read "3,4" as 3.
    const og = toNumber(startSG), ogT = toNumber(startTemp);
    const fg = toNumber(endSG),   fgT = toNumber(endTemp);
    if (og === null || ogT === null || fg === null || fgT === null) {
      setAbvError(t(language, 'calcFillAll')); return;
    }
    if (og < 900 || og > 1200) { setAbvError(t(language, 'calcStartSGRange')); return; }
    if (fg < 900 || fg > 1200) { setAbvError(t(language, 'calcEndSGRange')); return; }
    if (fg >= og) { setAbvError(t(language, 'calcEndBelowStart')); return; }
    if (ogT < 0 || ogT > 50 || fgT < 0 || fgT > 50) {
      setAbvError(t(language, 'calcTempRange')); return;
    }
    const abv = calculateABV(og, ogT, fg, fgT);
    if (abv < 0 || abv > 25) { setAbvError(t(language, 'calcAbvOutOfRange')); return; }
    track(EVENTS.CALC_ABV_USED);
    setAbvResult({
      abv:         abv.toFixed(1),
      correctedOG: (correctSG(og, ogT) * 1000).toFixed(1),
      correctedFG: (correctSG(fg, fgT) * 1000).toFixed(1),
    });
  };

  // ─── SO2 CALCULATE ─────────────────────────────────────────────────────
  const handleSO2 = () => {
    setSo2Error(''); setSo2Result(null);
    const pHVal      = toNumber(pH);
    const currentVal = toNumber(currentSO2);
    const volVal     = toNumber(volume);
    if (pHVal === null || currentVal === null || volVal === null) {
      setSo2Error(t(language, 'calcFillAll')); return;
    }
    if (pHVal < 2.8 || pHVal > 4.5) {
      setSo2Error(t(language, 'calcPhRange')); return;
    }
    if (currentVal < 0 || currentVal > 200) {
      setSo2Error(t(language, 'calcSo2Range')); return;
    }
    if (volVal <= 0 || volVal > 100000) {
      setSo2Error(t(language, 'calcVolumeInvalid')); return;
    }
    const target = wineType === 'sweet' ? 45 : getTargetFreeSO2(wineType, pHVal);
    if (currentVal >= target) {
      track(EVENTS.CALC_SO2_USED, { product, sufficient: true });
      setSo2Result({ sufficient: true, target, current: currentVal });
      return;
    }
    let result;
    if (product === 'campden') {
      const mgPerTablet = toNumber(tabletMg) || 440;
      const so2Needed   = (target - currentVal) * volVal;
      const tablets     = Math.ceil(so2Needed / mgPerTablet);
      result = { sufficient: false, target, current: currentVal,
                 tablets, mgPerTablet, so2Needed: (target - currentVal).toFixed(1) };
    } else {
      const pct  = toNumber(so2Pct) || 57;
      const calc = calculateSO2Addition(target, currentVal, volVal, pct);
      result = { sufficient: false, target, current: currentVal, ...calc, pct };
    }
    track(EVENTS.CALC_SO2_USED, { product, sufficient: false });
    setSo2Result(result);
  };

  // ─── SHARE RESULTS ─────────────────────────────────────────────────────
  const shareMessage = async (message, calc) => {
    if (!message) return;
    try {
      const { action } = await Share.share({ message });
      if (action !== Share.dismissedAction) {
        track(EVENTS.CALC_RESULT_SHARED, { calc });
      }
    } catch (e) {
      reportError(e, { screen: 'Calculator', action: 'shareResult', calc });
    }
  };

  const handleShareAbv = () =>
    shareMessage(buildAbvShareMessage({ abvResult, language }), 'abv');

  const handleShareSo2 = () =>
    shareMessage(
      buildSo2ShareMessage({
        so2Result,
        productLabel: PRODUCTS.find(p => p.key === product)?.label,
        language,
      }),
      'so2'
    );

  // ─── SO2 → LOGBOOK ─────────────────────────────────────────────────────
  // Opens the normal entry form with the calculated values filled in. The
  // winemaker confirms and saves there; nothing is written from here.
  const openSulfurEntry = (wine) => {
    const prefill = buildSulfurPrefill({
      so2Result,
      productLabel: PRODUCTS.find(p => p.key === product)?.label,
      ph: pH,
      volume,
      language,
    });
    if (!prefill) return;
    navigation.navigate('AddEntry', { wine, prefill });
  };

  const handleSaveToLogbook = () => {
    if (wines.length === 0) {
      Alert.alert(t(language, 'noWinesTitle'), t(language, 'noWinesYet'));
      return;
    }
    if (wines.length === 1) {
      openSulfurEntry(wines[0]);
      return;
    }
    setShowWinePicker(true);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      <Modal visible={showWinePicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWinePicker(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t(language, 'selectWine')}</Text>
            {wines.map(w => (
              <TouchableOpacity
                key={w.id}
                style={styles.modalItem}
                onPress={() => {
                  setShowWinePicker(false);
                  openSulfurEntry(w);
                }}>
                <Text style={styles.modalItemText}>{w.name}</Text>
                <Text style={styles.modalItemMeta}>
                  {[w.type, w.grape, w.vintage, w.vessel].filter(Boolean).join(' · ')}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowWinePicker(false)}>
              <Text style={styles.modalCancelText}>{t(language, 'cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        <Text style={styles.title}>{t(language, 'calculators')}</Text>

        {/* Tab switcher */}
        <TabSwitcher
          tabs={TABS}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          renderLabel={(tab) =>
            tab === 'ABV' ? `🍷 ${t(language, 'abvTitle')}` : `🧪 ${t(language, 'so2Title')}`
          }
        />

        {/* ── ABV TAB ── */}
        {activeTab === 'ABV' && (
          <CalcCard title={t(language, 'abvTitle')} subtitle={t(language, 'abvSub')}>
            <AbvCalculatorTab
              language={language}
              t={t}
              styles={styles}
              startSG={startSG}
              setStartSG={setStartSG}
              startTemp={startTemp}
              setStartTemp={setStartTemp}
              endSG={endSG}
              setEndSG={setEndSG}
              endTemp={endTemp}
              setEndTemp={setEndTemp}
              abvError={abvError}
              abvResult={abvResult}
              onShare={handleShareAbv}
              onCalculate={handleABV}
              onReset={() => {
                setStartSG(''); setStartTemp('');
                setEndSG(''); setEndTemp(''); setAbvResult(null);
              }}
            />
          </CalcCard>
        )}

        {/* ── SO2 TAB ── */}
        {activeTab === 'SO₂' && (
          <CalcCard title={t(language, 'so2Title')} subtitle={t(language, 'so2Sub')}>
            <So2CalculatorTab
              language={language}
              t={t}
              styles={styles}
              WINE_TYPES_SO2={WINE_TYPES_SO2}
              PRODUCTS={PRODUCTS}
              wineType={wineType}
              setWineType={setWineType}
              pH={pH}
              setPH={setPH}
              currentSO2={currentSO2}
              setCurrentSO2={setCurrentSO2}
              volume={volume}
              setVolume={setVolume}
              product={product}
              setProduct={setProduct}
              so2Pct={so2Pct}
              setSo2Pct={setSo2Pct}
              tabletMg={tabletMg}
              setTabletMg={setTabletMg}
              so2Error={so2Error}
              so2Result={so2Result}
              onSaveToLogbook={handleSaveToLogbook}
              onShare={handleShareSo2}
              onCalculate={handleSO2}
              onReset={() => {
                setPH(''); setCurrentSO2('');
                setVolume(''); setSo2Result(null); setSo2Error('');
              }}
            />
          </CalcCard>
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
                         borderColor: colors.inputBorder, borderRadius: 8,
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
  saveEntryBtn:        { marginTop: 16, borderRadius: 8, borderWidth: 1,
                         borderColor: colors.gold, paddingVertical: 12,
                         alignItems: 'center' },
  saveEntryBtnText:    { color: colors.gold, fontWeight: '700', fontSize: 15 },
  modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
                         justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox:            { backgroundColor: colors.surface, borderRadius: 14,
                         width: '100%', borderWidth: 1, borderColor: colors.border,
                         overflow: 'hidden' },
  modalTitle:          { fontSize: 13, color: colors.textMuted,
                         textTransform: 'uppercase', letterSpacing: 1, padding: 16,
                         borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItem:           { paddingHorizontal: 16, paddingVertical: 14,
                         borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemText:       { fontSize: 16, color: colors.textPrimary, fontWeight: '600' },
  modalItemMeta:       { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  modalCancel:         { padding: 16, alignItems: 'center' },
  modalCancelText:     { fontSize: 15, color: colors.textMuted },
});
