import { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { addWine } from '../firebase/firestore';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';

const WINE_TYPES = ['Red', 'White', 'Rosé', 'Orange', 'Sparkling', 'Dessert'];

const GRAPE_VARIETIES = [
  'Plavac Mali', 'Pošip', 'Grk', 'Maraština', 'Babić',
  'Dingač', 'Teran', 'Malvazija', 'Debit', 'Vugava',
  'Cabernet Sauvignon', 'Merlot', 'Chardonnay', 'Graševina', 'Other',
];

export default function AddWineScreen({ navigation }) {
  const { language } = useContext(LanguageContext);
  const [name,        setName]        = useState('');
  const [vintage,     setVintage]     = useState('');
  const [type,        setType]        = useState('');
  const [grape,       setGrape]       = useState('');
  const [notes,       setNotes]       = useState('');
  const [volume,      setVolume]      = useState('');
  const [showTypes,   setShowTypes]   = useState(false);
  const [showGrapes,  setShowGrapes]  = useState(false);
  const [saving,      setSaving]      = useState(false);

  const WINE_TYPE_LABELS = {
    'Red':      t(language, 'red'),
    'White':    t(language, 'white'),
    'Rosé':     t(language, 'rose'),
    'Orange':   t(language, 'orange'),
    'Sparkling':t(language, 'sparkling'),
    'Dessert':  t(language, 'dessert'),
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t(language, 'required'), t(language, 'wineNameRequired'));
      return;
    }
    if (!type) {
      Alert.alert(t(language, 'required'), t(language, 'typeRequired'));
      return;
    }
    setSaving(true);
    try {
      await addWine(auth.currentUser.uid, {
        name: name.trim(), vintage: vintage.trim(),
        type, grape, notes: notes.trim(), volume: volume.trim(),
      });
      Alert.alert(t(language, 'done'), t(language, 'wineAdded'), [
        { text: t(language, 'ok'), onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert(t(language, 'error'), 'Could not save wine.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        <Text style={styles.title}>{t(language, 'addWineTitle')}</Text>

        <Text style={styles.label}>{t(language, 'wineName')} *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName}
          placeholder={t(language, 'wineNamePlaceholder')}
          placeholderTextColor={colors.textMuted} />

        <Text style={styles.label}>{t(language, 'vintageYear')}</Text>
        <TextInput style={styles.input} value={vintage} onChangeText={setVintage}
          placeholder={t(language, 'vintagePlaceholder')}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad" maxLength={4} />

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

        <Text style={styles.label}>{t(language, 'notes')}</Text>
        <TextInput style={[styles.input, styles.textArea]}
          value={notes} onChangeText={setNotes}
          placeholder={t(language, 'notesPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline numberOfLines={4} />

        <Text style={styles.label}>Volume (L)</Text>
        <TextInput style={styles.input} value={volume} onChangeText={setVolume}
          placeholder="e.g. 50"
          placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color={colors.background} />
            : <Text style={styles.buttonText}>{t(language, 'addWineTitle')}</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  content:        { padding: 24, paddingBottom: 60 },
  title:          { fontSize: 28, color: colors.gold, fontWeight: '700', marginBottom: 24 },
  label:          { fontSize: 12, color: colors.textMuted,
                    textTransform: 'uppercase', letterSpacing: 1,
                    marginBottom: 6, marginTop: 16 },
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
  button:         { backgroundColor: colors.gold, borderRadius: 8,
                    paddingVertical: 14, alignItems: 'center', marginTop: 32 },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: colors.background, fontWeight: '700', fontSize: 16 },
});
