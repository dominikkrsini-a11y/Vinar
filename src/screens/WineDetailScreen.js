import { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
  Alert,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { subscribeToEntries, deleteWine, deleteEntry } from '../firebase/firestore';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import { reportError } from '../utils/reportError';
import { buildWinePdfHtml } from './wine-detail/buildWinePdfHtml';
import { FermentationChart } from './wine-detail/FermentationChart';

const ENTRY_ICONS = {
  fermentation: '🌡️',
  sulfur:       '🧪',
  note:         '📝',
};

export default function WineDetailScreen({ route, navigation }) {
  const { wine } = route.params;
  const { language } = useContext(LanguageContext);
  const [entries,    setEntries]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [exporting,  setExporting]  = useState(false);

  // Live entries list — serves cached data immediately offline and updates
  // automatically as entries are added/deleted (including once queued
  // offline writes sync back to the server).
  useEffect(() => {
    const unsubscribe = subscribeToEntries(auth.currentUser.uid, wine.id, (data) => {
      setEntries(data);
      setLoading(false);
    }, (e) => {
      reportError(e, { screen: 'WineDetail', action: 'subscribeToEntries' });
      Alert.alert(
        language === 'hr' ? 'Greška' : 'Error',
        language === 'hr' ? 'Ne mogu učitati unose.' : 'Could not load entries.'
      );
      setLoading(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional — subscribe once for the screen's lifetime
  }, []);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('hr-HR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const getEntryTypeLabel = (type) => {
    if (type === 'fermentation') return t(language, 'fermentation');
    if (type === 'sulfur')       return t(language, 'sulfur');
    return t(language, 'note');
  };

  // ─── PDF Export ───────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    try {
      const { uri } = await Print.printToFileAsync({
        html: buildWinePdfHtml({ wine, entries, language }),
        base64: false,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${wine.name} — Logbook`,
        UTI: 'com.adobe.pdf',
      });
    } catch (e) {
      Alert.alert(
        language === 'hr' ? 'Greška' : 'Error',
        language === 'hr' ? 'Nije moguće izvesti PDF.' : 'Could not export PDF.'
      );
      reportError(e, { screen: 'WineDetail', action: 'exportPdf' });
    } finally {
      setExporting(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const renderEntryDetail = (entry) => {
    if (entry.type === 'fermentation') {
      return (
        <View style={styles.entryDetails}>
          {entry.temperature ? <Text style={styles.detailText}>🌡 {entry.temperature}°C</Text> : null}
          {entry.density     ? <Text style={styles.detailText}>⚖️ {entry.density} g/L</Text> : null}
          {entry.sugar       ? <Text style={styles.detailText}>🍬 {entry.sugar} g/L</Text> : null}
          {entry.ph          ? <Text style={styles.detailText}>🔬 pH {entry.ph}</Text> : null}
          {entry.yeast       ? <Text style={styles.detailText}>🦠 {entry.yeast}</Text> : null}
          {entry.notes       ? <Text style={styles.noteText}>{entry.notes}</Text> : null}
        </View>
      );
    }
    if (entry.type === 'sulfur') {
      return (
        <View style={styles.entryDetails}>
          {entry.amount  ? <Text style={styles.detailText}>💊 {entry.amount} g/hL SO₂</Text> : null}
          {entry.product ? <Text style={styles.detailText}>📦 {entry.product}</Text> : null}
          {entry.freeSo2 ? <Text style={styles.detailText}>📊 Free SO₂ before: {entry.freeSo2} ppm</Text> : null}
          {entry.ph      ? <Text style={styles.detailText}>🔬 pH {entry.ph}</Text> : null}
          {entry.notes   ? <Text style={styles.noteText}>{entry.notes}</Text> : null}
        </View>
      );
    }
    return (
      <View style={styles.entryDetails}>
        {entry.notes ? <Text style={styles.noteText}>{entry.notes}</Text> : null}
      </View>
    );
  };

  const handleDeleteWine = () => {
    Alert.alert(
      language === 'hr' ? 'Obriši vino' : 'Delete wine',
      language === 'hr' ? 'Jeste li sigurni? Svi unosi će biti obrisani.' : 'Are you sure? All entries will be deleted.',
      [
        { text: language === 'hr' ? 'Odustani' : 'Cancel', style: 'cancel' },
        {
          text: language === 'hr' ? 'Obriši' : 'Delete',
          style: 'destructive',
          onPress: () => {
            // Don't await — the delete is applied to the local cache
            // immediately (latency compensation) and queued to sync when
            // back online; awaiting would hang the UI offline until the
            // write reaches the server.
            deleteWine(auth.currentUser.uid, wine.id).catch((e) => {
              reportError(e, { screen: 'WineDetail', action: 'deleteWine' });
            });
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleDeleteEntry = (entry) => {
    Alert.alert(
      language === 'hr' ? 'Obriši unos' : 'Delete entry',
      language === 'hr' ? 'Obrisati ovaj unos?' : 'Delete this entry?',
      [
        { text: language === 'hr' ? 'Odustani' : 'Cancel', style: 'cancel' },
        {
          text: language === 'hr' ? 'Obriši' : 'Delete',
          style: 'destructive',
          onPress: () => {
            // Don't await — the live entries subscription above already
            // reflects the deletion via the local cache; awaiting the
            // promise would hang offline until the write reaches the server.
            deleteEntry(auth.currentUser.uid, wine.id, entry.id).catch((e) => {
              reportError(e, { screen: 'WineDetail', action: 'deleteEntry' });
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>{t(language, 'back')}</Text>
          </TouchableOpacity>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={handleExport}
              style={[styles.exportBtn, exporting && { opacity: 0.5 }]}
              disabled={exporting}>
              {exporting
                ? <ActivityIndicator color={colors.gold} size="small" />
                : <Text style={styles.exportBtnText}>PDF</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditWine', { wine })}
              style={styles.editBtn}>
              <Text style={styles.editBtnText}>
                {language === 'hr' ? 'Uredi' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.wineName}>{wine.name}</Text>
        <Text style={styles.wineMeta}>
          {[wine.type, wine.grape, wine.vintage].filter(Boolean).join(' · ')}
          {wine.volume ? `  ·  ${wine.volume} L` : ''}
        </Text>
        <TouchableOpacity onPress={handleDeleteWine} style={styles.deleteWineBtn}>
          <Text style={styles.deleteWineBtnText}>
            {language === 'hr' ? 'Obriši vino' : 'Delete wine'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>

          <FermentationChart entries={entries} language={language} />

          {entries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t(language, 'noEntries')}</Text>
              <Text style={styles.emptySubText}>{t(language, 'noEntriesSub')}</Text>
            </View>
          ) : (
            entries.map(entry => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryCard}
                onLongPress={() => handleDeleteEntry(entry)}
                delayLongPress={400}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryIcon}>{ENTRY_ICONS[entry.type] || '📝'}</Text>
                  <View style={styles.entryMeta}>
                    <Text style={styles.entryType}>{getEntryTypeLabel(entry.type)}</Text>
                    <Text style={styles.entryDate}>{formatDate(entry.createdAt)}</Text>
                  </View>
                </View>
                {renderEntryDetail(entry)}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEntry', { wine })}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: colors.background },
  header:            { padding: 24, paddingTop: 52, backgroundColor: colors.surface,
                       borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTop:         { flexDirection: 'row', justifyContent: 'space-between',
                       alignItems: 'center', marginBottom: 12 },
  backBtn:           {},
  backText:          { color: colors.gold, fontSize: 14 },
  headerButtons:     { flexDirection: 'row', gap: 8, alignItems: 'center' },
  exportBtn:         { borderWidth: 1, borderColor: colors.gold,
                       paddingHorizontal: 14, paddingVertical: 6,
                       borderRadius: 16, minWidth: 48, alignItems: 'center' },
  exportBtnText:     { color: colors.gold, fontSize: 13, fontWeight: '600' },
  editBtn:           { backgroundColor: colors.gold, paddingHorizontal: 16,
                       paddingVertical: 6, borderRadius: 16 },
  editBtnText:       { color: colors.background, fontSize: 13, fontWeight: '600' },
  wineName:          { fontSize: 24, color: colors.textPrimary, fontWeight: '700' },
  wineMeta:          { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  deleteWineBtn:     { marginTop: 10, alignSelf: 'flex-start' },
  deleteWineBtnText: { color: '#e07070', fontSize: 13 },
  center:            { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:              { flex: 1 },
  listContent:       { padding: 16, paddingBottom: 100 },
  empty:             { alignItems: 'center', paddingTop: 60 },
  emptyText:         { fontSize: 18, color: colors.textMuted, fontWeight: '600' },
  emptySubText:      { fontSize: 13, color: colors.textMuted, marginTop: 8 },
  entryCard:         { backgroundColor: colors.surface, borderRadius: 10,
                       borderWidth: 1, borderColor: colors.border,
                       padding: 14, marginBottom: 10 },
  entryHeader:       { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  entryIcon:         { fontSize: 24, marginRight: 10 },
  entryMeta:         { flex: 1 },
  entryType:         { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  entryDate:         { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  entryDetails:      { paddingLeft: 34 },
  detailText:        { fontSize: 14, color: colors.textPrimary, marginBottom: 4 },
  noteText:          { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  fab:               { position: 'absolute', bottom: 30, right: 24,
                       width: 56, height: 56, borderRadius: 28,
                       backgroundColor: colors.gold, alignItems: 'center',
                       justifyContent: 'center', elevation: 4 },
  fabText:           { fontSize: 28, color: colors.background,
                       fontWeight: '300', lineHeight: 32 },
});
