import { useState, useCallback, useContext } from 'react';
import {
  View, Text, ScrollView,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { getListings, deleteListing, getUserProfile } from '../firebase/firestore';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import { reportError } from '../utils/reportError';
import { Button } from '../components/ui/Button';
import { marketplaceStyles as styles } from '../features/marketplace/components/MarketplaceStyles';
import { MarketplaceTabs } from '../features/marketplace/components/MarketplaceTabs';
import { ListingCard } from '../features/marketplace/components/ListingCard';
import { SupplierCard } from '../features/marketplace/components/SupplierCard';
import { PostListingModal } from '../features/marketplace/components/PostListingModal';
import { SUPPLIERS } from '../features/marketplace/data/suppliers';
import { formatMarketplaceDate, getCategoryIcon } from '../features/marketplace/utils';

const TABS = ['listings', 'suppliers'];
const CATEGORY_LABEL_KEYS = {
  grapes: 'grapes',
  bulk_wine: 'bulkWine',
  equipment: 'equipment',
  chemicals: 'chemicals',
  other: 'other',
};

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

  const getCategoryLabel = (key) => t(language, CATEGORY_LABEL_KEYS[key] || key);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛒 {t(language, 'marketplace')}</Text>
        <Button title={t(language, 'postBtn')} onPress={() => setShowForm(true)} />
      </View>

      <MarketplaceTabs
        styles={styles}
        tabs={TABS}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        renderLabel={(tab) => (tab === 'listings' ? t(language, 'listings') : t(language, 'suppliers'))}
      />

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
              <ListingCard
                key={listing.id}
                styles={styles}
                listing={listing}
                isOwner={listing.userId === auth.currentUser.uid}
                categoryIcon={getCategoryIcon(listing.category)}
                categoryLabel={getCategoryLabel(listing.category)}
                formattedDate={formatMarketplaceDate(listing.createdAt)}
                contactForPriceLabel={t(language, 'contactForPrice')}
                onDelete={() => handleDelete(listing)}
                onCall={() => Linking.openURL(`tel:${listing.phone}`)}
                onEmail={() => Linking.openURL(`mailto:${listing.email}`)}
              />
            ))
          )}
        </ScrollView>
      )}

      {activeTab === 'suppliers' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.supplierIntro}>{t(language, 'supplierIntro')}</Text>
          {SUPPLIERS.map((s, i) => (
            <SupplierCard
              key={i}
              styles={styles}
              supplier={s}
              language={language}
              onPress={() => Linking.openURL(s.website)}
            />
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
