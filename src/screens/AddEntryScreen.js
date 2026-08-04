import { useState, useContext, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { deleteField } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { addEntry, getEntries, updateEntry } from '../firebase/firestore';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import { reportError } from '../utils/reportError';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { TextField } from '../components/ui/TextField';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { normalizeDecimal, toNumber } from '../utils/numbers';
import {
  daysSince, formatDayCount, formatDaysAgo, formatTypedDate,
  isoForDaysAgo, parseTypedDate,
} from '../utils/dates';
import {
  ALL_ENTRY_FIELD_NAMES,
  ENTRY_TYPES,
  chipGroupsForType,
  fieldLabel,
  fieldsForType,
  isWithinRanges,
} from '../logbook/entrySchema';

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

const DATE_CHOICES = [
  { offset: 0, labelKey: 'today' },
  { offset: 1, labelKey: 'yesterday' },
  { offset: 2, labelKey: 'dayBefore' },
];

// Yeast and SO₂ product almost never change between entries, so the last one is
// offered again instead of being retyped in the cellar.
const REMEMBERED_FIELDS = ['yeast', 'product'];

// A numeric pad with a separator, so a typed date needs no letters. Android has
// no punctuation pad, and its decimal key is what parseTypedDate splits on.
const DATE_KEYBOARD = Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad';

function initialDateState(entry) {
  if (!entry?.createdAt) return { dateChoice: 0, manualDate: '' };
  const age = daysSince(entry.createdAt);
  if (age === 0 || age === 1 || age === 2) {
    return { dateChoice: age, manualDate: '' };
  }
  return { dateChoice: 'other', manualDate: formatTypedDate(entry.createdAt) };
}

function initialValuesFromEntry(entry) {
  if (!entry) return {};
  const next = {};
  for (const name of ALL_ENTRY_FIELD_NAMES) {
    if (name === 'notes') continue;
    if (entry[name] !== undefined && entry[name] !== '') next[name] = String(entry[name]);
  }
  return next;
}

export default function AddEntryScreen({ route, navigation }) {
  const { wine, entry: existingEntry } = route.params;
  const isEditing = Boolean(existingEntry?.id);
  const { language } = useContext(LanguageContext);

  const initialDate = initialDateState(existingEntry);

  const [type,         setType]         = useState(existingEntry?.type || 'fermentation');
  const [values,       setValues]       = useState(() => initialValuesFromEntry(existingEntry));
  const [notes,        setNotes]        = useState(existingEntry?.notes || '');
  const [dateChoice,   setDateChoice]   = useState(initialDate.dateChoice);
  const [manualDate,   setManualDate]   = useState(initialDate.manualDate);
  const [history,      setHistory]      = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  // Previous entries are read once so the form can show the last reading next to
  // each field and reuse the yeast and SO₂ product the winemaker already used.
  // The form stays usable if this fails — it is a convenience, not a dependency.
  useEffect(() => {
    let active = true;
    getEntries(auth.currentUser.uid, wine.id)
      .then((data) => {
        if (!active) return;
        setHistory(data);
        if (isEditing) return;
        setValues((prev) => {
          const next = { ...prev };
          for (const field of REMEMBERED_FIELDS) {
            if (next[field]) continue;
            const previous = data.find((e) => e[field])?.[field];
            if (previous) next[field] = previous;
          }
          return next;
        });
      })
      .catch((e) => reportError(e, { screen: 'AddEntry', action: 'loadHistory' }));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional — load once for the screen's lifetime
  }, []);

  const fields = fieldsForType(type);
  const chipGroups = chipGroupsForType(type);

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  // The newest earlier entry that recorded this field, whatever its type — pH and
  // free SO₂ are logged from several types and the most recent one is what counts.
  // When editing, skip this entry so the "last" hint is the previous real reading.
  const lastReadingFor = (field) => {
    if (!field.numeric) return null;
    const previous = history.find((e) => {
      if (isEditing && e.id === existingEntry.id) return false;
      return e[field.name] !== undefined && e[field.name] !== '';
    });
    if (!previous) return null;
    return { value: previous[field.name], days: daysSince(previous.createdAt) };
  };

  const resolveCreatedAt = () => {
    if (dateChoice !== 'other') return isoForDaysAgo(dateChoice);
    return parseTypedDate(manualDate);
  };

  const collectEntryData = () => {
    const data = { type };
    const kept = new Set(['type']);

    for (const field of fields) {
      const raw = values[field.name];
      if (raw === undefined || String(raw).trim() === '') continue;
      data[field.name] = field.numeric ? normalizeDecimal(raw) : String(raw).trim();
      kept.add(field.name);
    }
    for (const group of chipGroups) {
      if (values[group.name]) {
        data[group.name] = values[group.name];
        kept.add(group.name);
      }
    }
    if (notes.trim()) {
      data.notes = notes.trim();
      kept.add('notes');
    }

    // Type changes must not leave a stale density (etc.) on the document.
    if (isEditing) {
      for (const name of ALL_ENTRY_FIELD_NAMES) {
        if (!kept.has(name)) data[name] = deleteField();
      }
    }

    return data;
  };

  // Bounds are a nudge, not a rule — a real reading outside them still saves.
  const outOfRangeField = () => {
    for (const field of fields) {
      if (!field.numeric) continue;
      const n = toNumber(values[field.name]);
      if (n === null) continue;
      if (!isWithinRanges(n, field.ranges)) return field;
    }
    return null;
  };

  const persist = (entryData) => {
    setSaving(true);
    // Don't await — write promises don't resolve until the backend
    // acknowledges the write, so awaiting would hang the UI indefinitely
    // while offline. The entry is written to the local cache immediately.
    const write = isEditing
      ? updateEntry(auth.currentUser.uid, wine.id, existingEntry.id, entryData)
      : addEntry(auth.currentUser.uid, wine.id, entryData);

    write.catch((e) => {
      reportError(e, {
        screen: 'AddEntry',
        action: isEditing ? 'updateEntry' : 'saveEntry',
        type,
      });
    });

    setSaving(false);
    if (!isEditing && type === 'sulfur') {
      setShowReminder(true);
    } else {
      navigation.goBack();
    }
  };

  const handleSave = () => {
    const createdAt = resolveCreatedAt();
    if (!createdAt) {
      Alert.alert(t(language, 'checkValueTitle'), t(language, 'invalidDate'));
      return;
    }

    const entryData = { ...collectEntryData(), createdAt };
    const hasContent = Object.keys(entryData).some((k) => {
      if (k === 'type' || k === 'createdAt') return false;
      // deleteField sentinels are objects — they clear keys, they are not content.
      return typeof entryData[k] !== 'object';
    });
    if (!hasContent) {
      Alert.alert(t(language, 'emptyEntryTitle'), t(language, 'emptyEntryMsg'));
      return;
    }

    const suspect = outOfRangeField();
    if (suspect) {
      const [min, max] = suspect.ranges[suspect.ranges.length - 1];
      Alert.alert(
        t(language, 'checkValueTitle'),
        `${fieldLabel(suspect, t, language)}: ${values[suspect.name]}\n\n` +
          `${t(language, 'usualRange')}: ${min}–${max}`,
        [
          { text: t(language, 'cancel'), style: 'cancel' },
          { text: t(language, 'saveAnyway'), onPress: () => persist(entryData) },
        ]
      );
      return;
    }

    persist(entryData);
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
                  {formatDayCount(language, days)}
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

        <Text style={styles.title}>
          {t(language, isEditing ? 'editEntry' : 'newEntry')}
        </Text>

        <Text style={styles.label}>{t(language, 'entryType')}</Text>
        <View style={styles.typeRow}>
          {ENTRY_TYPES.map(et => (
            <TouchableOpacity key={et.key}
              style={[styles.typeBtn, type === et.key && styles.typeBtnActive]}
              onPress={() => setType(et.key)}>
              <Text style={styles.typeIcon}>{et.icon}</Text>
              <Text style={[styles.typeLabel, type === et.key && styles.typeLabelActive]}>
                {t(language, et.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t(language, 'entryDate')}</Text>
        <View style={styles.chipRow}>
          {DATE_CHOICES.map(choice => (
            <TouchableOpacity key={choice.offset}
              style={[styles.chip, dateChoice === choice.offset && styles.chipActive]}
              onPress={() => setDateChoice(choice.offset)}>
              <Text style={[styles.chipText, dateChoice === choice.offset && styles.chipTextActive]}>
                {t(language, choice.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.chip, dateChoice === 'other' && styles.chipActive]}
            onPress={() => setDateChoice('other')}>
            <Text style={[styles.chipText, dateChoice === 'other' && styles.chipTextActive]}>
              {t(language, 'otherDate')}
            </Text>
          </TouchableOpacity>
        </View>

        {dateChoice === 'other' && (
          <TextField
            style={styles.field}
            value={manualDate}
            onChangeText={setManualDate}
            placeholder={t(language, 'datePlaceholder')}
            keyboardType={DATE_KEYBOARD}
            editable={!saving}
          />
        )}

        {fields.map(field => {
          const last = lastReadingFor(field);
          return (
            <View key={`${type}-${field.name}`} style={styles.field}>
              <TextField
                label={fieldLabel(field, t, language)}
                value={values[field.name] ?? ''}
                onChangeText={(v) => setValue(field.name, v)}
                placeholder={t(language, field.placeholderKey)}
                keyboardType={field.numeric ? 'decimal-pad' : undefined}
                editable={!saving}
              />
              {last ? (
                <Text style={styles.hint}>
                  {t(language, 'lastValue')}: {last.value}
                  {field.unit ? ` ${field.unit}` : ''} · {formatDaysAgo(language, last.days)}
                </Text>
              ) : null}
            </View>
          );
        })}

        {chipGroups.map(group => (
          <View key={`${type}-${group.name}`} style={styles.field}>
            <Text style={styles.label}>{t(language, group.labelKey)}</Text>
            <View style={styles.chipRow}>
              {group.options.map(option => {
                const active = values[group.name] === option.value;
                return (
                  <TouchableOpacity key={option.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setValue(group.name, active ? '' : option.value)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {t(language, option.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.field}>
          <TextField
            label={t(language, 'observations')}
            value={notes}
            onChangeText={setNotes}
            placeholder={t(language, 'observationsPlaceholder')}
            editable={!saving}
            multiline
          />
        </View>

        <PrimaryButton
          style={styles.button}
          onPress={handleSave}
          disabled={saving}
          loading={saving}
          label={t(language, isEditing ? 'saveChanges' : 'saveEntry')}
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
  typeRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn:          { minWidth: '30%', flexGrow: 1,
                      backgroundColor: colors.surface, borderRadius: 8,
                      borderWidth: 1, borderColor: colors.border,
                      alignItems: 'center', paddingVertical: 10,
                      paddingHorizontal: 4 },
  typeBtnActive:    { borderColor: colors.gold, backgroundColor: colors.surfaceDeep },
  typeIcon:         { fontSize: 20, marginBottom: 4 },
  typeLabel:        { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  typeLabelActive:  { color: colors.gold },
  chipRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:             { backgroundColor: colors.surface, borderRadius: 16,
                      borderWidth: 1, borderColor: colors.border,
                      paddingHorizontal: 14, paddingVertical: 8 },
  chipActive:       { borderColor: colors.gold, backgroundColor: colors.surfaceDeep },
  chipText:         { fontSize: 13, color: colors.textMuted },
  chipTextActive:   { color: colors.gold, fontWeight: '600' },
  field:            { marginTop: 16 },
  hint:             { fontSize: 12, color: colors.textMuted, marginTop: 5 },
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
