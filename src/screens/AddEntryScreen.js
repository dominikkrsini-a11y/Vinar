import { useState, useContext } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { addEntry } from '../firebase/firestore';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import { reportError } from '../utils/reportError';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { TextField } from '../components/ui/TextField';
import { PrimaryButton } from '../components/ui/PrimaryButton';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

const requestPermissions = async () => {
  if (!Device.isDevice) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

const scheduleReminder = async (wineName, days, language) => {
  const granted = await requestPermissions();
  if (!granted) {
    Alert.alert(
      language === 'hr' ? 'Dozvola odbijena' : 'Permission denied',
      language === 'hr'
        ? 'Omogući obavijesti u postavkama uređaja.'
        : 'Enable notifications in device settings.'
    );
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: language === 'hr' ? '🍷 Provjeri SO₂' : '🍷 Check SO₂',
      body:  language === 'hr'
        ? `Vrijeme je za provjeru sumpora — ${wineName}`
        : `Time to check sulfur levels — ${wineName}`,
      sound: true,
    },
    trigger: { seconds: days * 24 * 60 * 60 },
  });
};

export default function AddEntryScreen({ route, navigation }) {
  const { wine } = route.params;
  const { language } = useContext(LanguageContext);

  const [type,              setType]              = useState('fermentation');
  const [temperature,       setTemperature]       = useState('');
  const [density,           setDensity]           = useState('');
  const [sugar,             setSugar]             = useState('');
  const [ph,                setPh]                = useState('');
  const [yeast,             setYeast]             = useState('');
  const [amount,            setAmount]            = useState('');
  const [product,           setProduct]           = useState('');
  const [freeSo2,           setFreeSo2]           = useState('');
  const [notes,             setNotes]             = useState('');
  const [saving,            setSaving]            = useState(false);
  const [showReminder,      setShowReminder]      = useState(false);

  const ENTRY_TYPES = [
    { key: 'fermentation', label: t(language, 'fermentation'), icon: '🌡️' },
    { key: 'sulfur',       label: t(language, 'sulfur'),       icon: '🧪' },
    { key: 'note',         label: t(language, 'note'),         icon: '📝' },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const entryData = { type };
      if (type === 'fermentation') {
        if (temperature) entryData.temperature = temperature;
        if (density)     entryData.density     = density;
        if (sugar)       entryData.sugar       = sugar;
        if (ph)          entryData.ph          = ph;
        if (yeast)       entryData.yeast       = yeast;
      }
      if (type === 'sulfur') {
        if (amount)  entryData.amount  = amount;
        if (product) entryData.product = product;
        if (freeSo2) entryData.freeSo2 = freeSo2;
        if (ph)      entryData.ph      = ph;
      }
      if (notes) entryData.notes = notes;

      await addEntry(auth.currentUser.uid, wine.id, entryData);

      if (type === 'sulfur') {
        // Show reminder modal before going back
        setShowReminder(true);
      } else {
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert(t(language, 'error'), 'Could not save entry.');
      reportError(e, { screen: 'AddEntry', action: 'saveEntry', type });
    } finally {
      setSaving(false);
    }
  };

  const handleReminderPick = async (days) => {
    setShowReminder(false);
    if (days) await scheduleReminder(wine.name, days, language);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* SO₂ Reminder Modal */}
      <Modal visible={showReminder} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {language === 'hr' ? 'Podsjetnik za SO₂' : 'SO₂ Reminder'}
            </Text>
            <Text style={styles.modalMsg}>
              {language === 'hr'
                ? 'Za koliko dana da te podsjetim na provjeru sumpora?'
                : 'Remind you to check sulfur levels in how many days?'}
            </Text>
            {[7, 14, 21, 28].map(days => (
              <TouchableOpacity
                key={days}
                style={styles.modalItem}
                onPress={() => handleReminderPick(days)}>
                <Text style={styles.modalItemText}>
                  {days} {language === 'hr' ? 'dana' : 'days'}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => handleReminderPick(null)}>
              <Text style={styles.modalCancelText}>
                {language === 'hr' ? 'Preskoči' : 'Skip'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <ScreenWrapper style={styles.content}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← {wine.name}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t(language, 'newEntry')}</Text>

        <Text style={styles.label}>{t(language, 'entryType')}</Text>
        <View style={styles.typeRow}>
          {ENTRY_TYPES.map(et => (
            <TouchableOpacity key={et.key}
              style={[styles.typeBtn, type === et.key && styles.typeBtnActive]}
              onPress={() => setType(et.key)}>
              <Text style={styles.typeIcon}>{et.icon}</Text>
              <Text style={[styles.typeLabel, type === et.key && styles.typeLabelActive]}>
                {et.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {type === 'fermentation' && (
          <>
            <TextField
              label={t(language, 'temperature')}
              value={temperature}
              onChangeText={setTemperature}
              placeholder={t(language, 'tempPlaceholder')}
              editable={!saving}
            />

            <TextField
              label={t(language, 'density')}
              value={density}
              onChangeText={setDensity}
              placeholder={t(language, 'densityPlaceholder')}
              editable={!saving}
            />

            <TextField
              label={t(language, 'sugar')}
              value={sugar}
              onChangeText={setSugar}
              placeholder={t(language, 'sugarPlaceholder')}
              editable={!saving}
            />

            <TextField
              label="pH"
              value={ph}
              onChangeText={setPh}
              placeholder="e.g. 3.4"
              editable={!saving}
            />

            <TextField
              label={language === 'hr' ? 'Soj kvasca' : 'Yeast Strain'}
              value={yeast}
              onChangeText={setYeast}
              placeholder="e.g. Lalvin QA23"
              editable={!saving}
            />
          </>
        )}

        {type === 'sulfur' && (
          <>
            <TextField
              label={language === 'hr' ? 'Količina (g/hL)' : 'Amount (g/hL)'}
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g. 5"
              editable={!saving}
            />

            <TextField
              label={t(language, 'productUsed')}
              value={product}
              onChangeText={setProduct}
              placeholder={t(language, 'productPlaceholder')}
              editable={!saving}
            />

            <TextField
              label={language === 'hr' ? 'Slobodni SO₂ prije (ppm)' : 'Free SO₂ Before (ppm)'}
              value={freeSo2}
              onChangeText={setFreeSo2}
              placeholder="e.g. 18"
              editable={!saving}
            />

            <TextField
              label="pH"
              value={ph}
              onChangeText={setPh}
              placeholder="e.g. 3.4"
              editable={!saving}
            />
          </>
        )}

        <TextField
          label={t(language, 'observations')}
          value={notes}
          onChangeText={setNotes}
          placeholder={t(language, 'observationsPlaceholder')}
          editable={!saving}
          multiline
        />

        <PrimaryButton
          style={styles.button}
          onPress={handleSave}
          disabled={saving}
          loading={saving}
          label={t(language, 'saveEntry')}
        />

        </ScreenWrapper>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background },
  content:          { padding: 0, paddingBottom: 0 },
  backBtn:          { marginBottom: 16 },
  backText:         { color: colors.gold, fontSize: 14 },
  title:            { fontSize: 28, color: colors.gold, fontWeight: '700', marginBottom: 24 },
  label:            { fontSize: 12, color: colors.textMuted,
                      textTransform: 'uppercase', letterSpacing: 1,
                      marginBottom: 6, marginTop: 16 },
  typeRow:          { flexDirection: 'row', gap: 8 },
  typeBtn:          { flex: 1, backgroundColor: colors.surface, borderRadius: 8,
                      borderWidth: 1, borderColor: colors.border,
                      alignItems: 'center', paddingVertical: 10 },
  typeBtnActive:    { borderColor: colors.gold, backgroundColor: colors.surfaceDeep },
  typeIcon:         { fontSize: 20, marginBottom: 4 },
  typeLabel:        { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  typeLabelActive:  { color: colors.gold },
  input:            { backgroundColor: colors.surface, borderWidth: 1,
                      borderColor: colors.border, borderRadius: 8,
                      paddingHorizontal: 14, paddingVertical: 12,
                      color: colors.textPrimary, fontSize: 15 },
  textArea:         { height: 100, textAlignVertical: 'top' },
  button:           { marginTop: 32 },

  // Reminder modal
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
                      justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox:         { backgroundColor: colors.surface, borderRadius: 14,
                      width: '100%', borderWidth: 1, borderColor: colors.border,
                      overflow: 'hidden' },
  modalTitle:       { fontSize: 13, color: colors.textMuted,
                      textTransform: 'uppercase', letterSpacing: 1,
                      padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalMsg:         { fontSize: 14, color: colors.textPrimary,
                      padding: 16, paddingBottom: 8 },
  modalItem:        { paddingHorizontal: 16, paddingVertical: 16,
                      borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemText:    { fontSize: 16, color: colors.gold, fontWeight: '600' },
  modalCancel:      { padding: 16, alignItems: 'center' },
  modalCancelText:  { fontSize: 15, color: colors.textMuted },
});
