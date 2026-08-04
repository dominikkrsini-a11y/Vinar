import { useState, useContext } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { updateWine } from '../firebase/firestore';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import { reportError } from '../utils/reportError';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { TextField } from '../components/ui/TextField';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { formatTypedDate } from '../utils/dates';
import { mustFieldsFromForm } from '../utils/wineMust';

const WINE_TYPES = ['Red', 'White', 'Rosé', 'Orange', 'Sparkling', 'Dessert'];

const GRAPE_VARIETIES = [
  'Plavac Mali', 'Pošip', 'Grk', 'Maraština', 'Babić',
  'Dingač', 'Teran', 'Malvazija', 'Debit', 'Vugava',
  'Cabernet Sauvignon', 'Merlot', 'Chardonnay', 'Graševina', 'Other',
];

export default function EditWineScreen({ route, navigation }) {
  const { wine } = route.params;
  const { language } = useContext(LanguageContext);

  const [name,       setName]       = useState(wine.name       || '');
  const [vintage,    setVintage]    = useState(wine.vintage    || '');
  const [type,       setType]       = useState(wine.type       || '');
  const [grape,      setGrape]      = useState(wine.grape      || '');
  const [volume,     setVolume]     = useState(wine.volume     || '');
  const [vessel,     setVessel]     = useState(wine.vessel     || '');
  const [harvestDate, setHarvestDate] = useState(
    wine.harvestDate ? formatTypedDate(wine.harvestDate) : ''
  );
  const [brix,       setBrix]       = useState(wine.brix       || '');
  const [babo,       setBabo]       = useState(wine.babo       || '');
  const [mustPh,     setMustPh]     = useState(wine.mustPh     || '');
  const [ta,         setTa]         = useState(wine.ta         || '');
  const [yan,        setYan]        = useState(wine.yan        || '');
  const [notes,      setNotes]      = useState(wine.notes      || '');
  const [showTypes,  setShowTypes]  = useState(false);
  const [showGrapes, setShowGrapes] = useState(false);
  const [saving,     setSaving]     = useState(false);

  const WINE_TYPE_LABELS = {
    'Red':       t(language, 'red'),
    'White':     t(language, 'white'),
    'Rosé':      t(language, 'rose'),
    'Orange':    t(language, 'orange'),
    'Sparkling': t(language, 'sparkling'),
    'Dessert':   t(language, 'dessert'),
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t(language, 'required'), t(language, 'wineNameRequired'));
      return;
    }
    if (!type) {
      Alert.alert(t(language, 'required'), t(language, 'typeRequired'));
      return;
    }
    const must = mustFieldsFromForm({ harvestDate, brix, babo, mustPh, ta, yan });
    if (!must.ok) {
      Alert.alert(t(language, 'required'), t(language, 'harvestDateInvalid'));
      return;
    }
    setSaving(true);
    // Don't await — see AddWineScreen for why: write promises don't
    // resolve until the backend acknowledges the write, so awaiting would
    // hang the UI indefinitely while offline.
    updateWine(auth.currentUser.uid, wine.id, {
      name: name.trim(), vintage: vintage.trim(),
      type, grape, notes: notes.trim(), volume: volume.trim(),
      vessel: vessel.trim(),
      ...must.fields,
    }).catch((e) => {
      reportError(e, { screen: 'EditWine', action: 'updateWine', wineId: wine?.id });
    });
    setSaving(false);
    Alert.alert(t(language, 'done'), language === 'hr' ? 'Vino ažurirano.' : 'Wine updated.', [
      { text: t(language, 'ok'), onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <ScreenWrapper style={styles.content}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← {wine.name}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {language === 'hr' ? 'Uredi vino' : 'Edit Wine'}
        </Text>

        <TextField
          label={`${t(language, 'wineName')} *`}
          value={name}
          onChangeText={setName}
          placeholder={t(language, 'wineNamePlaceholder')}
          editable={!saving}
        />

        <TextField
          label={t(language, 'vintageYear')}
          value={vintage}
          onChangeText={setVintage}
          placeholder={t(language, 'vintagePlaceholder')}
          keyboardType="number-pad"
          editable={!saving}
        />

        <TextField
          label={t(language, 'wineVolume')}
          value={volume}
          onChangeText={setVolume}
          placeholder={t(language, 'volumePlaceholder')}
          keyboardType="decimal-pad"
          editable={!saving}
        />
        <Text style={styles.hint}>{t(language, 'volumeHint')}</Text>

        <TextField
          label={t(language, 'wineVessel')}
          value={vessel}
          onChangeText={setVessel}
          placeholder={t(language, 'wineVesselPlaceholder')}
          editable={!saving}
        />

        <Text style={styles.sectionLabel}>{t(language, 'mustSection')}</Text>

        <TextField
          label={t(language, 'wineHarvestDate')}
          value={harvestDate}
          onChangeText={setHarvestDate}
          placeholder={t(language, 'harvestDatePlaceholder')}
          keyboardType="numbers-and-punctuation"
          editable={!saving}
        />

        <TextField
          label={t(language, 'wineBrix')}
          value={brix}
          onChangeText={setBrix}
          placeholder={t(language, 'brixPlaceholder')}
          keyboardType="decimal-pad"
          editable={!saving}
        />

        <TextField
          label={t(language, 'wineBabo')}
          value={babo}
          onChangeText={setBabo}
          placeholder={t(language, 'baboPlaceholder')}
          keyboardType="decimal-pad"
          editable={!saving}
        />

        <TextField
          label={t(language, 'wineMustPh')}
          value={mustPh}
          onChangeText={setMustPh}
          placeholder={t(language, 'mustPhPlaceholder')}
          keyboardType="decimal-pad"
          editable={!saving}
        />

        <TextField
          label={t(language, 'wineTA')}
          value={ta}
          onChangeText={setTa}
          placeholder={t(language, 'taPlaceholder')}
          keyboardType="decimal-pad"
          editable={!saving}
        />

        <TextField
          label={t(language, 'wineYAN')}
          value={yan}
          onChangeText={setYan}
          placeholder={t(language, 'yanPlaceholder')}
          keyboardType="decimal-pad"
          editable={!saving}
        />

        <Text style={styles.label}>{t(language, 'wineType')} *</Text>
        <TouchableOpacity style={styles.input}
          onPress={() => { setShowTypes(!showTypes); setShowGrapes(false); }}>
          <Text style={{ color: type ? colors.textPrimary : colors.textMuted }}>
            {type ? WINE_TYPE_LABELS[type] : t(language, 'selectType')}
          </Text>
        </TouchableOpacity>
        {showTypes && (
          <View style={styles.dropdown}>
            {WINE_TYPES.map(wt => (
              <TouchableOpacity key={wt} style={styles.dropdownItem}
                onPress={() => { setType(wt); setShowTypes(false); }}>
                <Text style={[styles.dropdownText, wt === type && { color: colors.gold }]}>
                  {WINE_TYPE_LABELS[wt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>{t(language, 'grapeVariety')}</Text>
        <TouchableOpacity style={styles.input}
          onPress={() => { setShowGrapes(!showGrapes); setShowTypes(false); }}>
          <Text style={{ color: grape ? colors.textPrimary : colors.textMuted }}>
            {grape || t(language, 'selectGrape')}
          </Text>
        </TouchableOpacity>
        {showGrapes && (
          <View style={styles.dropdown}>
            {GRAPE_VARIETIES.map(g => (
              <TouchableOpacity key={g} style={styles.dropdownItem}
                onPress={() => { setGrape(g); setShowGrapes(false); }}>
                <Text style={[styles.dropdownText, g === grape && { color: colors.gold }]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TextField
          label={t(language, 'notes')}
          value={notes}
          onChangeText={setNotes}
          placeholder={t(language, 'notesPlaceholder')}
          editable={!saving}
          multiline
        />

        <PrimaryButton
          style={styles.button}
          onPress={handleSave}
          disabled={saving}
          loading={saving}
          label={language === 'hr' ? 'Spremi promjene' : 'Save Changes'}
        />

        </ScreenWrapper>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  content:        { padding: 0, paddingBottom: 0 },
  backBtn:        { marginBottom: 16 },
  backText:       { color: colors.gold, fontSize: 14 },
  title:          { fontSize: 28, color: colors.gold, fontWeight: '700', marginBottom: 24 },
  label:          { fontSize: 12, color: colors.textMuted,
                    textTransform: 'uppercase', letterSpacing: 1,
                    marginBottom: 6, marginTop: 16 },
  hint:           { fontSize: 12, color: colors.textMuted, marginTop: 5 },
  sectionLabel:   { fontSize: 12, color: colors.gold,
                    textTransform: 'uppercase', letterSpacing: 1,
                    marginBottom: 4, marginTop: 28 },
  input:          { backgroundColor: colors.surface, borderWidth: 1,
                    borderColor: colors.border, borderRadius: 8,
                    paddingHorizontal: 14, paddingVertical: 12,
                    color: colors.textPrimary, fontSize: 15 },
  textArea:       { height: 100, textAlignVertical: 'top' },
  dropdown:       { backgroundColor: colors.surface, borderWidth: 1,
                    borderColor: colors.border, borderRadius: 8,
                    marginTop: 4, overflow: 'hidden' },
  dropdownItem:   { paddingHorizontal: 14, paddingVertical: 12,
                    borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownText:   { color: colors.textPrimary, fontSize: 15 },
  button:         { marginTop: 32 },
});

