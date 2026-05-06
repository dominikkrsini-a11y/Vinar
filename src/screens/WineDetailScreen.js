import { useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
  Alert, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { getEntries, deleteWine, deleteEntry } from '../firebase/firestore';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';

const ENTRY_ICONS = {
  fermentation: '🌡️',
  sulfur:       '🧪',
  note:         '📝',
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function WineDetailScreen({ route, navigation }) {
  const { wine } = route.params;
  const { language } = useContext(LanguageContext);
  const [entries,    setEntries]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [exporting,  setExporting]  = useState(false);

  const loadEntries = async () => {
    try {
      const data = await getEntries(auth.currentUser.uid, wine.id);
      setEntries(data);
    } catch (e) {
      console.log('Error loading entries:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('hr-HR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatShortDate = (iso) => {
    const d = new Date(iso);
    return `${d.getDate()}.${d.getMonth() + 1}.`;
  };

  const getEntryTypeLabel = (type) => {
    if (type === 'fermentation') return t(language, 'fermentation');
    if (type === 'sulfur')       return t(language, 'sulfur');
    return t(language, 'note');
  };

  // ─── PDF Export ───────────────────────────────────────────────────────────
  const buildHtml = () => {
    const hr = language === 'hr';
    const fermEntries   = entries.filter(e => e.type === 'fermentation');
    const sulfurEntries = entries.filter(e => e.type === 'sulfur');
    const noteEntries   = entries.filter(e => e.type === 'note');

    const fermRows = fermEntries.map(e => `
      <tr>
        <td>${formatDate(e.createdAt)}</td>
        <td>${e.temperature ? e.temperature + ' °C' : '—'}</td>
        <td>${e.density     ? e.density              : '—'}</td>
        <td>${e.sugar       ? e.sugar + ' g/L'       : '—'}</td>
        <td>${e.ph          ? e.ph                   : '—'}</td>
        <td>${e.yeast       ? e.yeast                : '—'}</td>
        <td>${e.notes       ? e.notes                : '—'}</td>
      </tr>`).join('');

    const sulfurRows = sulfurEntries.map(e => `
      <tr>
        <td>${formatDate(e.createdAt)}</td>
        <td>${e.amount  ? e.amount + ' g/hL' : '—'}</td>
        <td>${e.product ? e.product          : '—'}</td>
        <td>${e.freeSo2 ? e.freeSo2 + ' ppm' : '—'}</td>
        <td>${e.ph      ? e.ph               : '—'}</td>
        <td>${e.notes   ? e.notes            : '—'}</td>
      </tr>`).join('');

    const noteRows = noteEntries.map(e => `
      <tr>
        <td>${formatDate(e.createdAt)}</td>
        <td>${e.notes || '—'}</td>
      </tr>`).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Georgia, serif; color: #1a0a00; padding: 32px; font-size: 13px; }
        h1   { font-size: 26px; color: #8B6914; margin-bottom: 4px; }
        h2   { font-size: 13px; color: #8B6914; text-transform: uppercase;
               letter-spacing: 1px; margin: 28px 0 10px; border-bottom: 1px solid #c9a84c; padding-bottom: 4px; }
        .meta      { font-size: 13px; color: #666; margin-bottom: 6px; }
        .generated { font-size: 11px; color: #999; margin-top: 4px; }
        table  { width: 100%; border-collapse: collapse; margin-top: 4px; }
        th     { background: #f5ead0; color: #8B6914; font-size: 11px;
                 text-transform: uppercase; letter-spacing: 0.5px;
                 padding: 8px 10px; text-align: left; border-bottom: 2px solid #c9a84c; }
        td     { padding: 8px 10px; border-bottom: 1px solid #e8dcc8;
                 font-size: 12px; vertical-align: top; }
        tr:last-child td { border-bottom: none; }
        tr:nth-child(even) td { background: #fdf8f0; }
        .empty { color: #999; font-style: italic; font-size: 12px; margin-top: 6px; }
        .footer { margin-top: 40px; font-size: 11px; color: #999;
                  text-align: center; border-top: 1px solid #e8dcc8; padding-top: 12px; }
      </style>
    </head>
    <body>

      <h1>${wine.name}</h1>
      <p class="meta">
        ${[wine.type, wine.grape, wine.vintage].filter(Boolean).join(' · ')}
        ${wine.volume ? ' · ' + wine.volume + ' L' : ''}
      </p>
      <p class="generated">
        ${hr ? 'Izvezeno' : 'Exported'}: ${new Date().toLocaleDateString('hr-HR')}
      </p>

      <!-- Fermentation -->
      <h2>${hr ? 'Fermentacija' : 'Fermentation'}</h2>
      ${fermEntries.length === 0
        ? `<p class="empty">${hr ? 'Nema unosa fermentacije.' : 'No fermentation entries.'}</p>`
        : `<table>
            <thead><tr>
              <th>${hr ? 'Datum' : 'Date'}</th>
              <th>${hr ? 'Temp.' : 'Temp.'}</th>
              <th>${hr ? 'Gustoća' : 'Density'}</th>
              <th>${hr ? 'Šećer' : 'Sugar'}</th>
              <th>pH</th>
              <th>${hr ? 'Kvasac' : 'Yeast'}</th>
              <th>${hr ? 'Bilješka' : 'Note'}</th>
            </tr></thead>
            <tbody>${fermRows}</tbody>
          </table>`
      }

      <!-- Sulfur -->
      <h2>${hr ? 'Sumpor (SO₂)' : 'Sulfur (SO₂)'}</h2>
      ${sulfurEntries.length === 0
        ? `<p class="empty">${hr ? 'Nema unosa sumpora.' : 'No sulfur entries.'}</p>`
        : `<table>
            <thead><tr>
              <th>${hr ? 'Datum' : 'Date'}</th>
              <th>${hr ? 'Količina' : 'Amount'}</th>
              <th>${hr ? 'Proizvod' : 'Product'}</th>
              <th>${hr ? 'Slobodni SO₂' : 'Free SO₂'}</th>
              <th>pH</th>
              <th>${hr ? 'Bilješka' : 'Note'}</th>
            </tr></thead>
            <tbody>${sulfurRows}</tbody>
          </table>`
      }

      <!-- Notes -->
      ${noteEntries.length > 0 ? `
      <h2>${hr ? 'Bilješke' : 'Notes'}</h2>
      <table>
        <thead><tr>
          <th>${hr ? 'Datum' : 'Date'}</th>
          <th>${hr ? 'Bilješka' : 'Note'}</th>
        </tr></thead>
        <tbody>${noteRows}</tbody>
      </table>` : ''}

      <div class="footer">Vinar App · ${wine.name} · ${new Date().getFullYear()}</div>

    </body>
    </html>`;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { uri } = await Print.printToFileAsync({
        html: buildHtml(),
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
      console.log('Export error:', e);
    } finally {
      setExporting(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ─── Fermentation Chart ───────────────────────────────────────────────────
  const renderFermentationChart = () => {
    const fermEntries = [...entries]
      .filter(e => e.type === 'fermentation' && e.density && !isNaN(parseFloat(e.density)))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (fermEntries.length < 2) return null;

    const CHART_H    = 140;
    const PAD_TOP    = 12;
    const PAD_BOTTOM = 28;
    const PAD_LEFT   = 48;
    const PAD_RIGHT  = 16;
    const chartW     = SCREEN_WIDTH - 32 - PAD_LEFT - PAD_RIGHT;

    const densities = fermEntries.map(e => parseFloat(e.density));
    const rawMin    = Math.min(...densities);
    const rawMax    = Math.max(...densities);
    const padding   = (rawMax - rawMin) * 0.15 || 5;
    const minD      = rawMin - padding;
    const maxD      = rawMax + padding;
    const rangeD    = maxD - minD;

    const toX = (i) => (i / (fermEntries.length - 1)) * chartW;
    const toY = (d) => PAD_TOP + ((maxD - d) / rangeD) * (CHART_H - PAD_TOP - PAD_BOTTOM);

    const points = fermEntries.map((e, i) => ({
      x:    toX(i),
      y:    toY(parseFloat(e.density)),
      d:    parseFloat(e.density),
      date: formatShortDate(e.createdAt),
    }));

    const yLabels = [rawMax, (rawMax + rawMin) / 2, rawMin].map(v => ({
      value: v.toFixed(3),
      y:     toY(v),
    }));

    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>
          {language === 'hr' ? 'Gustoća — fermentacija' : 'Density — fermentation'}
        </Text>
        <View style={{ height: CHART_H, flexDirection: 'row' }}>
          <View style={{ width: PAD_LEFT, height: CHART_H }}>
            {yLabels.map((label, i) => (
              <Text key={i} style={[styles.chartAxisLabel, {
                position: 'absolute', top: label.y - 7, right: 6,
              }]}>
                {label.value}
              </Text>
            ))}
          </View>
          <View style={{ width: chartW + PAD_RIGHT, height: CHART_H }}>
            {yLabels.map((label, i) => (
              <View key={i} style={[styles.chartGridLine, { top: label.y, width: chartW }]} />
            ))}
            {points.slice(0, -1).map((p, i) => {
              const next  = points[i + 1];
              const dx    = next.x - p.x;
              const dy    = next.y - p.y;
              const len   = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              return (
                <View key={`line_${i}`} style={{
                  position: 'absolute', left: p.x, top: p.y - 1,
                  width: len, height: 2, backgroundColor: colors.gold,
                  transform: [{ rotate: `${angle}deg` }], transformOrigin: '0 50%',
                }} />
              );
            })}
            {points.map((p, i) => (
              <View key={`dot_${i}`}>
                <View style={[styles.chartDot, { left: p.x - 5, top: p.y - 5 }]} />
                <Text style={[styles.chartDotLabel, { left: p.x - 20, top: p.y - 20 }]}>
                  {p.d.toFixed(3)}
                </Text>
                <Text style={[styles.chartAxisLabel, {
                  position: 'absolute', left: p.x - 14,
                  top: CHART_H - PAD_BOTTOM + 4, width: 28, textAlign: 'center',
                }]}>
                  {p.date}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
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
          onPress: async () => {
            try {
              await deleteWine(auth.currentUser.uid, wine.id);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', 'Could not delete wine.');
            }
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
          onPress: async () => {
            try {
              await deleteEntry(auth.currentUser.uid, wine.id, entry.id);
              setEntries(prev => prev.filter(e => e.id !== entry.id));
            } catch (e) {
              Alert.alert('Error', 'Could not delete entry.');
            }
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

          {renderFermentationChart()}

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
  chartCard:         { backgroundColor: colors.surface, borderRadius: 10,
                       borderWidth: 1, borderColor: colors.border,
                       padding: 16, marginBottom: 16, overflow: 'hidden' },
  chartTitle:        { fontSize: 12, color: colors.textMuted,
                       textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  chartGridLine:     { position: 'absolute', height: 1,
                       backgroundColor: colors.border, opacity: 0.5 },
  chartDot:          { position: 'absolute', width: 10, height: 10,
                       borderRadius: 5, backgroundColor: colors.gold,
                       borderWidth: 2, borderColor: colors.background },
  chartDotLabel:     { position: 'absolute', width: 40, fontSize: 9,
                       color: colors.gold, textAlign: 'center', fontWeight: '600' },
  chartAxisLabel:    { fontSize: 9, color: colors.textMuted },
});
