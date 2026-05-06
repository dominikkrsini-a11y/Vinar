import { useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { getUserProfile, getWines, getEntries } from '../firebase/firestore';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';

export default function DashboardScreen({ navigation }) {
  const [profile,         setProfile]         = useState(null);
  const [wines,           setWines]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [showWinePicker,  setShowWinePicker]  = useState(false);
  const [entryCount,      setEntryCount]      = useState(0);
  const { language } = useContext(LanguageContext);

  const loadData = async () => {
    try {
      const [profileData, winesData] = await Promise.all([
        getUserProfile(auth.currentUser.uid),
        getWines(auth.currentUser.uid),
      ]);
      setProfile(profileData);
      setWines(winesData);
      // Count all entries across all wines
      const counts = await Promise.all(
        winesData.map(w => getEntries(auth.currentUser.uid, w.id))
      );
      setEntryCount(counts.reduce((sum, e) => sum + e.length, 0));
    } catch (e) {
      console.log('Dashboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
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
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>{t(language, 'tasks')}</Text>
        </View>
      </View>

      {wines.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t(language, 'yourWines')}</Text>
          {wines.map(wine => (
            <TouchableOpacity
              key={wine.id}
              style={styles.wineCard}
              onPress={() => navigation.navigate('WineDetail', { wine })}
            >
              <View style={styles.wineLeft}>
                <Text style={styles.wineName}>{wine.name}</Text>
                <Text style={styles.wineMeta}>
                  {[wine.type, wine.grape, wine.vintage].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Text style={styles.wineYear}>{wine.vintage || ''}</Text>
            </TouchableOpacity>
          ))}
        </>
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
  wineYear:        { fontSize: 18, color: colors.gold, fontWeight: '700' },
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
