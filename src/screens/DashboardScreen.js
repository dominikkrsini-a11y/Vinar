import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { getUserProfile, getRecentEntries, subscribeToWines, refreshWineDashboardSnapshot } from '../firebase/firestore';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import { reportError } from '../utils/reportError';
import { getWineStatus, STATUS_TONES } from '../utils/wineStatus';
import { formatDaysAgo } from '../utils/dates';
import { hasDashboardSnapshot, statusEntriesForWine } from '../utils/wineDashboardSnapshot';

export default function DashboardScreen({ navigation }) {
  const [profile,         setProfile]         = useState(null);
  const [wines,           setWines]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [showWinePicker,  setShowWinePicker]  = useState(false);
  const [entriesByWine,   setEntriesByWine]   = useState({});
  const { language } = useContext(LanguageContext);
  const fetchGenRef = useRef(0);

  // Live wines list — paint immediately from the cache, then backfill badges
  // only for wines that do not yet have a denormalized dashboard snapshot.
  useEffect(() => {
    const uid = auth.currentUser.uid;
    const unsubscribe = subscribeToWines(uid, (winesData) => {
      setWines(winesData);
      setLoading(false);
    }, (e) => {
      reportError(e, { screen: 'Dashboard', action: 'subscribeToWines' });
      Alert.alert(
        language === 'hr' ? 'Greška' : 'Error',
        language === 'hr'
          ? 'Ne mogu učitati podatke na naslovnoj.'
          : 'Could not load dashboard data.'
      );
      setLoading(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional — subscribe once for the screen's lifetime
  }, []);

  useEffect(() => {
    const missing = wines.filter((w) => !hasDashboardSnapshot(w));
    if (missing.length === 0) return undefined;

    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;

    const gen = ++fetchGenRef.current;
    Promise.all(missing.map((w) => getRecentEntries(uid, w.id, 10)))
      .then((lists) => {
        if (gen !== fetchGenRef.current) return;
        setEntriesByWine((prev) => {
          const next = { ...prev };
          missing.forEach((w, i) => {
            next[w.id] = lists[i];
          });
          return next;
        });
        missing.forEach((w) => {
          refreshWineDashboardSnapshot(uid, w.id).catch((e) => {
            reportError(e, { screen: 'Dashboard', action: 'backfillSnapshot', wineId: w.id });
          });
        });
      })
      .catch((e) => {
        if (gen !== fetchGenRef.current) return;
        reportError(e, { screen: 'Dashboard', action: 'loadRecentEntries' });
      });
    return undefined;
  }, [wines]);

  useFocusEffect(
    useCallback(() => {
      const uid = auth.currentUser.uid;
      getUserProfile(uid)
        .then(setProfile)
        .catch((e) => reportError(e, { screen: 'Dashboard', action: 'loadProfile' }));
    }, [])
  );

  const handleLogbook = () => {
    if (wines.length === 0) {
      // No wines yet — nothing to log
      return;
    }
    if (wines.length === 1) {
      // Only one wine — go straight to AddEntry
      navigation.navigate('AddEntry', { wine: wines[0] });
    } else {
      // Multiple wines — show picker
      setShowWinePicker(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  const firstName  = profile?.firstName || '';
  const wineryName = profile?.wineryName || '';
  const entryCount = wines.reduce((sum, wine) => {
    if (hasDashboardSnapshot(wine)) {
      return sum + (wine.dashboard.lastEntryAt ? 1 : 0);
    }
    return sum + (entriesByWine[wine.id]?.length || 0);
  }, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Wine picker modal */}
      <Modal visible={showWinePicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWinePicker(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {language === 'hr' ? 'Odaberi vino' : 'Select wine'}
            </Text>
            {wines.map(w => (
              <TouchableOpacity
                key={w.id}
                style={styles.modalItem}
                onPress={() => {
                  setShowWinePicker(false);
                  navigation.navigate('AddEntry', { wine: w });
                }}>
                <Text style={styles.modalItemText}>{w.name}</Text>
                <Text style={styles.modalItemMeta}>
                  {[w.type, w.grape, w.vintage].filter(Boolean).join(' · ')}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowWinePicker(false)}>
              <Text style={styles.modalCancelText}>
                {language === 'hr' ? 'Odustani' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.greeting}>{t(language, 'welcome')}</Text>
        <Text style={styles.name}>{firstName} 🍷</Text>
        {wineryName ? <Text style={styles.winery}>{wineryName}</Text> : null}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{wines.length}</Text>
          <Text style={styles.statLabel}>{t(language, 'wines')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{entryCount}</Text>
          <Text style={styles.statLabel}>{t(language, 'entries')}</Text>
        </View>
      </View>

      {wines.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{t(language, 'yourWines')}</Text>
          {wines.map(wine => {
            const status = getWineStatus(wine, statusEntriesForWine(wine, entriesByWine[wine.id]));
            const tone = STATUS_TONES[status.tone];
            return (
              <TouchableOpacity
                key={wine.id}
                style={styles.wineCard}
                onPress={() => navigation.navigate('WineDetail', { wine })}
              >
                <View style={styles.wineLeft}>
                  <Text style={styles.wineName}>{wine.name}</Text>
                  <Text style={styles.wineMeta}>
                    {[wine.type, wine.grape, wine.vintage, wine.vessel].filter(Boolean).join(' · ')}
                  </Text>
                  <View style={styles.wineStatusRow}>
                    <Text style={[styles.wineStatus, tone && { color: tone }]}>
                      {t(language, status.key)}
                    </Text>
                    {status.daysSinceEntry !== null ? (
                      <Text style={styles.wineStatusAge}>
                        · {formatDaysAgo(language, status.daysSinceEntry)}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.wineYear}>{wine.vintage || ''}</Text>
              </TouchableOpacity>
            );
          })}
        </>
      ) : (
        <View style={styles.emptyWines}>
          <Text style={styles.emptyWinesIcon}>🍇</Text>
          <Text style={styles.emptyWinesTitle}>{t(language, 'noWinesTitle')}</Text>
          <Text style={styles.emptyWinesSub}>{t(language, 'noWinesSub')}</Text>
          <TouchableOpacity
            style={styles.emptyWinesBtn}
            onPress={() => navigation.navigate('AddWine')}>
            <Text style={styles.emptyWinesBtnText}>{t(language, 'noWinesCta')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>{t(language, 'quickActions')}</Text>

      <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('AddWine')}>
        <Text style={styles.actionIcon}>🍇</Text>
        <View>
          <Text style={styles.actionTitle}>{t(language, 'addWine')}</Text>
          <Text style={styles.actionSub}>{t(language, 'addWineSub')}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCard} onPress={handleLogbook}>
        <Text style={styles.actionIcon}>📋</Text>
        <View>
          <Text style={styles.actionTitle}>{t(language, 'logbook')}</Text>
          <Text style={styles.actionSub}>{t(language, 'logbookSub')}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Calculator')}>
        <Text style={styles.actionIcon}>🧪</Text>
        <View>
          <Text style={styles.actionTitle}>{t(language, 'calculator')}</Text>
          <Text style={styles.actionSub}>{t(language, 'calculatorSub')}</Text>
        </View>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  content:         { padding: 24, paddingBottom: 60 },
  center:          { flex: 1, backgroundColor: colors.background,
                     alignItems: 'center', justifyContent: 'center' },
  header:          { marginBottom: 28 },
  greeting:        { fontSize: 14, color: colors.textMuted, marginTop: 12 },
  name:            { fontSize: 30, color: colors.gold, fontWeight: '700' },
  winery:          { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  statsRow:        { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statCard:        { flex: 1, backgroundColor: colors.surface, borderRadius: 10,
                     borderWidth: 1, borderColor: colors.border,
                     alignItems: 'center', paddingVertical: 16 },
  statNumber:      { fontSize: 28, fontWeight: '700', color: colors.gold },
  statLabel:       { fontSize: 11, color: colors.textMuted,
                     textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  sectionTitle:    { fontSize: 12, color: colors.textMuted,
                     textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  wineCard:        { backgroundColor: colors.surface, borderRadius: 10,
                     borderWidth: 1, borderColor: colors.border,
                     flexDirection: 'row', alignItems: 'center',
                     justifyContent: 'space-between',
                     padding: 16, marginBottom: 10 },
  wineLeft:        { flex: 1 },
  wineName:        { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  wineMeta:        { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  wineStatusRow:   { flexDirection: 'row', alignItems: 'center',
                     flexWrap: 'wrap', marginTop: 6 },
  wineStatus:      { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  wineStatusAge:   { fontSize: 12, color: colors.textMuted, marginLeft: 4 },
  wineYear:        { fontSize: 18, color: colors.gold, fontWeight: '700' },
  emptyWines:      { backgroundColor: colors.surface, borderRadius: 10,
                     borderWidth: 1, borderColor: colors.border,
                     padding: 24, marginBottom: 32, alignItems: 'center' },
  emptyWinesIcon:  { fontSize: 40, marginBottom: 10 },
  emptyWinesTitle: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  emptyWinesSub:   { fontSize: 13, color: colors.textMuted,
                     marginTop: 6, textAlign: 'center' },
  emptyWinesBtn:   { backgroundColor: colors.gold, borderRadius: 20,
                     paddingVertical: 10, paddingHorizontal: 24, marginTop: 16 },
  emptyWinesBtnText: { color: colors.background, fontSize: 14, fontWeight: '700' },
  actionCard:      { backgroundColor: colors.surface, borderRadius: 10,
                     borderWidth: 1, borderColor: colors.border,
                     flexDirection: 'row', alignItems: 'center',
                     padding: 16, gap: 14, marginBottom: 10 },
  actionIcon:      { fontSize: 28 },
  actionTitle:     { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  actionSub:       { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  // Modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
                     justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox:        { backgroundColor: colors.surface, borderRadius: 14,
                     width: '100%', overflow: 'hidden',
                     borderWidth: 1, borderColor: colors.border },
  modalTitle:      { fontSize: 13, color: colors.textMuted,
                     textTransform: 'uppercase', letterSpacing: 1,
                     padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItem:       { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemText:   { fontSize: 16, color: colors.textPrimary, fontWeight: '600' },
  modalItemMeta:   { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  modalCancel:     { padding: 16, alignItems: 'center' },
  modalCancelText: { fontSize: 15, color: '#e07070' },
});
