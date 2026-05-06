import { useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Linking, Switch, Image,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { getListings, addListing, deleteListing, getUserProfile, uploadImage } from '../firebase/firestore';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';

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

  // Form state
  const [title,       setTitle]       = useState('');
  const [category,    setCategory]    = useState('grapes');
  const [description, setDescription] = useState('');
  const [price,       setPrice]       = useState('');
  const [showPhone,   setShowPhone]   = useState(true);
  const [showEmail,   setShowEmail]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [image,       setImage]       = useState(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  const CATEGORIES = [
    { key: 'grapes',    label: t(language, 'grapes'),    icon: '🍇' },
    { key: 'bulk_wine', label: t(language, 'bulkWine'),  icon: '🍷' },
    { key: 'equipment', label: t(language, 'equipment'), icon: '⚙️' },
    { key: 'chemicals', label: t(language, 'chemicals'), icon: '🧪' },
    { key: 'other',     label: t(language, 'other'),     icon: '📦' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [listingsData, profileData] = await Promise.all([
        getListings(),
        getUserProfile(auth.currentUser.uid),
      ]);
      setListings(listingsData);
      setProfile(profileData);
    } catch (e) {
      console.log('Marketplace error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        language === 'hr' ? 'Dozvola odbijena' : 'Permission denied',
        language === 'hr' ? 'Trebamo pristup vašim fotografijama.' : 'We need access to your photos.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        language === 'hr' ? 'Dozvola odbijena' : 'Permission denied',
        language === 'hr' ? 'Trebamo pristup kameri.' : 'We need access to your camera.'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!title.trim()) {
      Alert.alert(t(language, 'required'), t(language, 'titlePlaceholder'));
      return;
    }
    if (!showPhone && !showEmail) {
      Alert.alert(t(language, 'required'), t(language, 'contactMethods'));
      return;
    }
    setSaving(true);
    try {
      let imageUrl = null;
      if (image) {
        setUploadingImg(true);
        const path = `listings/${auth.currentUser.uid}/${Date.now()}.jpg`;
        imageUrl = await uploadImage(image, path);
        setUploadingImg(false);
      }
      await addListing({
        title:      title.trim(),
        category,
        description: description.trim(),
        price:      price.trim(),
        showPhone,
        showEmail,
        phone:      showPhone ? profile?.phone || '' : null,
        email:      showEmail ? auth.currentUser.email : null,
        sellerName: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(),
        wineryName: profile?.wineryName || '',
        region:     profile?.region || '',
        userId:     auth.currentUser.uid,
        imageUrl,
      });
      setTitle(''); setCategory('grapes'); setDescription('');
      setPrice(''); setShowPhone(true); setShowEmail(false);
      setImage(null);
      setShowForm(false);
      await loadData();
    } catch (e) {
      Alert.alert(t(language, 'error'), 'Could not post listing.');
      console.log(e);
    } finally {
      setSaving(false);
      setUploadingImg(false);
    }
  };

  const handleDelete = (listing) => {
    if (listing.userId !== auth.currentUser.uid) return;
    Alert.alert(t(language, 'deleteListingTitle'), t(language, 'deleteListingMsg'), [
      { text: t(language, 'cancel'), style: 'cancel' },
      { text: t(language, 'delete'), style: 'destructive', onPress: async () => {
        await deleteListing(listing.id);
        await loadData();
      }},
    ]);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('hr-HR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const getCategoryIcon  = (key) => CATEGORIES.find(c => c.key === key)?.icon  || '📦';
  const getCategoryLabel = (key) => CATEGORIES.find(c => c.key === key)?.label || key;

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛒 {t(language, 'marketplace')}</Text>
        <TouchableOpacity style={styles.postBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.postBtnText}>{t(language, 'postBtn')}</Text>
        </TouchableOpacity>
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

      {/* ── POST FORM MODAL ── */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled">

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t(language, 'postListing')}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{t(language, 'title')} *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle}
              placeholder={t(language, 'titlePlaceholder')}
              placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>{t(language, 'category')}</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c.key}
                  style={[styles.categoryBtn, category === c.key && styles.categoryBtnActive]}
                  onPress={() => setCategory(c.key)}>
                  <Text style={styles.categoryIcon}>{c.icon}</Text>
                  <Text style={[styles.categoryLabel, category === c.key && styles.categoryLabelActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t(language, 'description')}</Text>
            <TextInput style={[styles.input, styles.textArea]}
              value={description} onChangeText={setDescription}
              placeholder={t(language, 'descriptionPlaceholder')}
              placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />

            <Text style={styles.label}>{t(language, 'price')}</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice}
              placeholder={t(language, 'pricePlaceholder')}
              placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>
              {language === 'hr' ? 'Fotografija' : 'Photo'}
            </Text>
            <View style={styles.photoRow}>
              <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage}>
                <Text style={styles.photoBtnText}>🖼️ {language === 'hr' ? 'Galerija' : 'Gallery'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
                <Text style={styles.photoBtnText}>📷 {language === 'hr' ? 'Kamera' : 'Camera'}</Text>
              </TouchableOpacity>
            </View>
            {image && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: image }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImage} onPress={() => setImage(null)}>
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {uploadingImg && (
              <Text style={styles.uploadingText}>
                {language === 'hr' ? 'Učitavanje fotografije...' : 'Uploading photo...'}
              </Text>
            )}

            <Text style={styles.label}>{t(language, 'contactMethods')}</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {t(language, 'showPhone')} {profile?.phone
                  ? `(${profile.phone})`
                  : `(${t(language, 'notSet')})`}
              </Text>
              <Switch value={showPhone} onValueChange={setShowPhone}
                trackColor={{ true: colors.gold }} thumbColor="#fff" />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {t(language, 'showEmail')} ({auth.currentUser?.email})
              </Text>
              <Switch value={showEmail} onValueChange={setShowEmail}
                trackColor={{ true: colors.gold }} thumbColor="#fff" />
            </View>

            {!profile?.phone && showPhone && (
              <Text style={styles.phoneWarning}>{t(language, 'phoneWarning')}</Text>
            )}

            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handlePost} disabled={saving}>
              {saving
                ? <ActivityIndicator color={colors.background} />
                : <Text style={styles.buttonText}>{t(language, 'postListing')}</Text>
              }
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

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
  postBtn:            { backgroundColor: colors.gold, borderRadius: 8,
                        paddingVertical: 6, paddingHorizontal: 14 },
  postBtnText:        { color: colors.background, fontWeight: '700', fontSize: 14 },
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
  modal:              { flex: 1, backgroundColor: colors.background },
  modalContent:       { padding: 24, paddingBottom: 60 },
  modalHeader:        { flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: 24 },
  modalTitle:         { fontSize: 22, color: colors.gold, fontWeight: '700' },
  modalClose:         { fontSize: 20, color: colors.textMuted, padding: 4 },
  label:              { fontSize: 12, color: colors.textMuted,
                        textTransform: 'uppercase', letterSpacing: 1,
                        marginBottom: 6, marginTop: 16 },
  input:              { backgroundColor: colors.surface, borderWidth: 1,
                        borderColor: colors.border, borderRadius: 8,
                        paddingHorizontal: 14, paddingVertical: 12,
                        color: colors.textPrimary, fontSize: 15 },
  textArea:           { height: 90, textAlignVertical: 'top' },
  photoRow:           { flexDirection: 'row', gap: 10, marginBottom: 8 },
  photoBtn:           { flex: 1, backgroundColor: colors.surfaceDeep, borderWidth: 1,
                        borderColor: colors.border, borderRadius: 8,
                        paddingVertical: 10, alignItems: 'center' },
  photoBtnText:       { color: colors.textPrimary, fontSize: 13 },
  imagePreview:       { position: 'relative', marginBottom: 8 },
  previewImage:       { width: '100%', height: 180, borderRadius: 8 },
  removeImage:        { position: 'absolute', top: 8, right: 8,
                        backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
                        width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  removeImageText:    { color: '#fff', fontSize: 14 },
  uploadingText:      { color: colors.textMuted, fontSize: 12,
                        fontStyle: 'italic', marginBottom: 8 },
  categoryRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn:        { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10,
                        borderRadius: 8, backgroundColor: colors.surfaceDeep,
                        borderWidth: 1, borderColor: colors.border, minWidth: 70 },
  categoryBtnActive:  { borderColor: colors.gold },
  categoryIcon:       { fontSize: 20, marginBottom: 2 },
  categoryLabel:      { fontSize: 11, color: colors.textMuted },
  categoryLabelActive:{ color: colors.gold },
  toggleRow:          { flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', backgroundColor: colors.surface,
                        borderRadius: 8, borderWidth: 1, borderColor: colors.border,
                        padding: 12, marginBottom: 8 },
  toggleLabel:        { fontSize: 13, color: colors.textPrimary, flex: 1 },
  phoneWarning:       { fontSize: 12, color: '#c8902a', marginTop: 4 },
  button:             { backgroundColor: colors.gold, borderRadius: 8,
                        paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  buttonDisabled:     { opacity: 0.6 },
  buttonText:         { color: colors.background, fontWeight: '700', fontSize: 16 },
  listingImage:       { width: '100%', height: 160, borderRadius: 8,
                        marginBottom: 10 },
});
