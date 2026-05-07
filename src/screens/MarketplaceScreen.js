import { useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { getListings, deleteListing, getUserProfile } from '../firebase/firestore';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import { reportError } from '../utils/reportError';
import { PostListingModal } from './marketplace/PostListingModal';
import { Button } from '../components/ui/Button';

const SUPPLIERS = [
  {
    name: 'Pa-vin d.o.o.',
    specialty: { en: 'Equipment, enology, education — Lallemand yeasts, DIAM corks, tractors', hr: 'Oprema, enologija, edukacija — Lallemand kvasci, DIAM čepovi, traktori' },
    region: 'Jastrebarsko',
    website: 'https://www.pavin.hr',
  },
  {
    name: 'Horvat Univerzal d.o.o.',
    specialty: { en: 'Processing lines, filtration, lab analysis, closures', hr: 'Linije za preradu, filtracija, laboratorijska analiza, zatvarači' },
    region: 'Varaždin',
    website: 'https://vinarska-oprema.com',
  },
  {
    name: 'Kokot Eno d.o.o.',
    specialty: { en: 'Enological agents, barrels, cellar tools, Lamothe-Abiet products', hr: 'Enološka sredstva, bačve, oprema za podrum, Lamothe-Abiet proizvodi' },
    region: 'Jastrebarsko',
    website: 'https://kokoteno.hr',
  },
  {
    name: 'Vinoartis d.o.o.',
    specialty: { en: 'Enology, viticulture, lab analysis — Istria and Dalmatia specialist', hr: 'Enologija, vinogradarstvo, laboratorijska analiza — specijalist za Istru i Dalmaciju' },
    region: 'Višnjan (Istra)',
    website: 'https://www.vinoartis.hr',
  },
  {
    name: 'Letina Inox d.o.o.',
    specialty: { en: 'Stainless steel tanks — all sizes, cooling jackets, temperature probes', hr: 'Inox tankovi — sve veličine, rashladni plašt, temperaturne sonde' },
    region: 'Čakovec',
    website: 'https://letina.com',
  },
  {
    name: 'Poljocentar d.o.o.',
    specialty: { en: 'Retail supplies, hobbyist equipment, national network', hr: 'Maloprodaja, oprema za kućne vinare, nacionalna mreža' },
    region: 'Križevci (nacionalno)',
    website: 'https://www.poljocentar.hr',
  },
  {
    name: 'Grapak A1 d.o.o.',
    specialty: { en: 'Heavy machinery, tractors, harvesting equipment', hr: 'Teška mehanizacija, traktori, berači grožđa' },
    region: 'Varaždin',
    website: 'https://grapak.com',
  },
  {
    name: 'Messis d.o.o.',
    specialty: { en: 'Viticulture mechanization, mulchers, vineyard tools', hr: 'Mehanizacija vinograda, malčeri, alati za vinograd' },
    region: 'Zagreb',
    website: 'https://messis.hr',
  },
];

const TABS = ['listings', 'suppliers'];

export default function MarketplaceScreen() {
  const { language } = useContext(LanguageContext);
  const [activeTab,   setActiveTab]   = useState('listings');
  const [listings,    setListings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [profile,     setProfile]     = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadMarketplaceData();
    }, [])
  );

  const loadMarketplaceData = async () => {
    try {
      const [listingsData, profileData] = await Promise.all([
        getListings(),
        getUserProfile(auth.currentUser.uid),
      ]);
      setListings(listingsData);
      setProfile(profileData);
    } catch (e) {
      reportError(e, { screen: 'Marketplace', action: 'loadMarketplaceData' });
      Alert.alert(
        language === 'hr' ? 'Greška' : 'Error',
        language === 'hr'
          ? 'Ne mogu učitati Marketplace podatke.'
          : 'Could not load marketplace data.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (listing) => {
    if (listing.userId !== auth.currentUser.uid) return;
    Alert.alert(t(language, 'deleteListingTitle'), t(language, 'deleteListingMsg'), [
      { text: t(language, 'cancel'), style: 'cancel' },
      { text: t(language, 'delete'), style: 'destructive', onPress: async () => {
        await deleteListing(listing.id);
        await loadMarketplaceData();
      }},
    ]);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('hr-HR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const getCategoryIcon  = (key) => {
    if (key === 'grapes') return '🍇';
    if (key === 'bulk_wine') return '🍷';
    if (key === 'equipment') return '⚙️';
    if (key === 'chemicals') return '🧪';
    return '📦';
  };
  const getCategoryLabel = (key) => {
    if (key === 'grapes') return t(language, 'grapes');
    if (key === 'bulk_wine') return t(language, 'bulkWine');
    if (key === 'equipment') return t(language, 'equipment');
    if (key === 'chemicals') return t(language, 'chemicals');
    if (key === 'other') return t(language, 'other');
    return key;
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛒 {t(language, 'marketplace')}</Text>
        <Button title={t(language, 'postBtn')} onPress={() => setShowForm(true)} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'listings' ? t(language, 'listings') : t(language, 'suppliers')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── LISTINGS TAB ── */}
      {activeTab === 'listings' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
          ) : listings.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t(language, 'noListings')}</Text>
              <Text style={styles.emptySubText}>{t(language, 'noListingsSub')}</Text>
            </View>
          ) : (
            listings.map(listing => (
              <View key={listing.id} style={styles.listingCard}>
                <View style={styles.listingHeader}>
                  <Text style={styles.listingIcon}>{getCategoryIcon(listing.category)}</Text>
                  <View style={styles.listingMeta}>
                    <Text style={styles.listingTitle}>{listing.title}</Text>
                    <Text style={styles.listingCategory}>{getCategoryLabel(listing.category)}</Text>
                  </View>
                  {listing.userId === auth.currentUser.uid && (
                    <TouchableOpacity onPress={() => handleDelete(listing)}>
                      <Text style={styles.deleteBtn}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {listing.imageUrl && (
                  <Image source={{ uri: listing.imageUrl }} style={styles.listingImage} />
                )}
                {listing.description ? (
                  <Text style={styles.listingDesc}>{listing.description}</Text>
                ) : null}
                <View style={styles.listingFooter}>
                  <View>
                    {listing.price
                      ? <Text style={styles.listingPrice}>{listing.price}</Text>
                      : <Text style={styles.listingPriceMuted}>{t(language, 'contactForPrice')}</Text>
                    }
                    <Text style={styles.listingSeller}>
                      {listing.wineryName || listing.sellerName} · {listing.region}
                    </Text>
                    <Text style={styles.listingDate}>{formatDate(listing.createdAt)}</Text>
                  </View>
                  <View style={styles.contactBtns}>
                    {listing.phone ? (
                      <TouchableOpacity style={styles.contactBtn}
                        onPress={() => Linking.openURL(`tel:${listing.phone}`)}>
                        <Text style={styles.contactBtnText}>📞</Text>
                      </TouchableOpacity>
                    ) : null}
                    {listing.email ? (
                      <TouchableOpacity style={styles.contactBtn}
                        onPress={() => Linking.openURL(`mailto:${listing.email}`)}>
                        <Text style={styles.contactBtnText}>✉️</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ── SUPPLIERS TAB ── */}
      {activeTab === 'suppliers' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.supplierIntro}>{t(language, 'supplierIntro')}</Text>
          {SUPPLIERS.map((s, i) => (
            <TouchableOpacity key={i} style={styles.supplierCard}
              onPress={() => Linking.openURL(s.website)}>
              <View style={styles.supplierHeader}>
                <Text style={styles.supplierName}>{s.name}</Text>
                <Text style={styles.supplierLink}>→</Text>
              </View>
              <Text style={styles.supplierRegion}>📍 {s.region}</Text>
              <Text style={styles.supplierSpecialty}>{s.specialty[language] || s.specialty.en}</Text>
              <Text style={styles.supplierUrl}>{s.website}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <PostListingModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        language={language}
        profile={profile}
        userId={auth.currentUser.uid}
        userEmail={auth.currentUser?.email}
        onPosted={loadMarketplaceData}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.background },
  header:             { flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', padding: 20, paddingTop: 52,
                        backgroundColor: colors.surface,
                        borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:        { fontSize: 20, color: colors.gold, fontWeight: '700' },
  tabs:               { flexDirection: 'row', backgroundColor: colors.surface,
                        borderBottomWidth: 1, borderBottomColor: colors.border },
  tab:                { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:          { borderBottomWidth: 2, borderBottomColor: colors.gold },
  tabText:            { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  tabTextActive:      { color: colors.gold },
  scroll:             { flex: 1 },
  scrollContent:      { padding: 16, paddingBottom: 60 },
  empty:              { alignItems: 'center', paddingTop: 60 },
  emptyText:          { fontSize: 18, color: colors.textMuted, fontWeight: '600' },
  emptySubText:       { fontSize: 13, color: colors.textMuted, marginTop: 8 },
  listingCard:        { backgroundColor: colors.surface, borderRadius: 10,
                        borderWidth: 1, borderColor: colors.border,
                        padding: 14, marginBottom: 12 },
  listingHeader:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  listingIcon:        { fontSize: 24, marginRight: 10 },
  listingMeta:        { flex: 1 },
  listingTitle:       { fontSize: 15, color: colors.textPrimary, fontWeight: '700' },
  listingCategory:    { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  deleteBtn:          { color: colors.textMuted, fontSize: 16, padding: 4 },
  listingDesc:        { fontSize: 13, color: colors.textMuted,
                        lineHeight: 19, marginBottom: 10 },
  listingFooter:      { flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'flex-end' },
  listingPrice:       { fontSize: 15, color: colors.gold, fontWeight: '700' },
  listingPriceMuted:  { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  listingSeller:      { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  listingDate:        { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  contactBtns:        { flexDirection: 'row', gap: 8 },
  contactBtn:         { width: 38, height: 38, borderRadius: 19,
                        backgroundColor: colors.surfaceDeep, borderWidth: 1,
                        borderColor: colors.border, alignItems: 'center',
                        justifyContent: 'center' },
  contactBtnText:     { fontSize: 18 },
  supplierIntro:      { fontSize: 13, color: colors.textMuted,
                        marginBottom: 16, lineHeight: 19 },
  supplierCard:       { backgroundColor: colors.surface, borderRadius: 10,
                        borderWidth: 1, borderColor: colors.border,
                        padding: 16, marginBottom: 12 },
  supplierHeader:     { flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: 6 },
  supplierName:       { fontSize: 15, color: colors.textPrimary,
                        fontWeight: '700', flex: 1 },
  supplierLink:       { fontSize: 18, color: colors.gold },
  supplierRegion:     { fontSize: 12, color: colors.gold, marginBottom: 6 },
  supplierSpecialty:  { fontSize: 13, color: colors.textMuted,
                        lineHeight: 19, marginBottom: 4 },
  supplierUrl:        { fontSize: 11, color: colors.textMuted, fontStyle: 'italic' },
  listingImage:       { width: '100%', height: 160, borderRadius: 8,
                        marginBottom: 10 },
});
