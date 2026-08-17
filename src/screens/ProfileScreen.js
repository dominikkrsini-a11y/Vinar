import { useState, useEffect, useContext } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { auth } from '../firebase/config';
import { getUserProfile, saveUserProfile, uploadImage } from '../firebase/firestore';
import { logout, deleteCurrentUserAccount } from '../firebase/auth';
import { LanguageContext } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import { reportError } from '../utils/reportError';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { TextField } from '../components/ui/TextField';
import { PrimaryButton } from '../components/ui/PrimaryButton';

const REGIONS = [
  'Slavonija', 'Baranja', 'Podunavlje', 'Pokuplje',
  'Prigorje-Bilogora', 'Plešivica', 'Moslavina',
  'Istra', 'Kvarner', 'Dalmatinska zagora',
  'Srednja i Južna Dalmacija', 'Sjeverna Dalmacija',
];

export default function ProfileScreen({ navigation }) {
  const { language, setLanguage } = useContext(LanguageContext);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [profile,     setProfile]     = useState(null);
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [wineryName,  setWineryName]  = useState('');
  const [phone,       setPhone]       = useState('');
  const [region,      setRegion]      = useState('');
  const [photo, setPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showRegions, setShowRegions] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional — load-once pattern, adding dependency causes infinite loop
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        setProfile(profile);
        setFirstName(profile.firstName  || '');
        setLastName(profile.lastName    || '');
        setWineryName(profile.wineryName || '');
        setPhone(profile.phone          || '');
        setRegion(profile.region        || '');
        if (profile.photoUrl) setPhoto(profile.photoUrl);
      }
    } catch (e) {
      reportError(e, { screen: 'Profile', action: 'loadProfile' });
      Alert.alert(
        language === 'hr' ? 'Greška' : 'Error',
        language === 'hr'
          ? 'Ne mogu učitati profil.'
          : 'Could not load your profile.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        language === 'hr' ? 'Dozvola odbijena' : 'Permission denied',
        language === 'hr' ? 'Trebamo pristup vašim fotografijama.' : 'We need access to your photos.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert(t(language, 'required'), t(language, 'firstNameRequired'));
      return;
    }
    setSaving(true);
    try {
      let photoUrl = profile?.photoUrl || null;
      if (photo && photo !== profile?.photoUrl) {
        setUploadingPhoto(true);
        const path = `profiles/${user.uid}/photo.jpg`;
        photoUrl = await uploadImage(photo, path);
        setUploadingPhoto(false);
      }
      await saveUserProfile(user.uid, {
        firstName:  firstName.trim(),
        lastName:   lastName.trim(),
        wineryName: wineryName.trim(),
        phone:      phone.trim(),
        region,
        email:      user.email,
        language,
        photoUrl,
        updatedAt:  new Date().toISOString(),
      });
      Alert.alert(t(language, 'done'), t(language, 'profileSaved'));
    } catch (_e) {
      Alert.alert(t(language, 'error'), t(language, 'profileError'));
    } finally {
      setSaving(false);
      setUploadingPhoto(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(t(language, 'logoutTitle'), t(language, 'logoutMsg'), [
      { text: t(language, 'cancel'), style: 'cancel' },
      { text: t(language, 'logout'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t(language, 'deleteAccountTitle'), t(language, 'deleteAccountMsg'), [
      { text: t(language, 'cancel'), style: 'cancel' },
      {
        text: t(language, 'deleteAccount'),
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await deleteCurrentUserAccount();
          } catch (e) {
            reportError(e, { screen: 'Profile', action: 'deleteAccount' });
            const needsReauth = e?.code === 'auth/requires-recent-login';
            Alert.alert(
              t(language, 'error'),
              needsReauth
                ? t(language, 'deleteAccountReauth')
                : t(language, 'deleteAccountError')
            );
            setSaving(false);
          }
        },
      },
    ]);
  };

  const handleLanguageChange = async (lang) => {
    setLanguage(lang);
    try {
      await saveUserProfile(user.uid, { language: lang });
    } catch (e) {
      reportError(e, { screen: 'Profile', action: 'saveLanguage', lang });
      Alert.alert(
        language === 'hr' ? 'Greška' : 'Error',
        language === 'hr'
          ? 'Ne mogu spremiti jezik.'
          : 'Could not save language.'
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ScreenWrapper style={styles.content}>
      <Text style={styles.title}>{t(language, 'profileTitle')}</Text>

      {/* Profile photo */}
      <TouchableOpacity style={styles.photoContainer} onPress={handlePickPhoto}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.profilePhoto} />
        ) : (
          <View style={styles.profilePhotoPlaceholder}>
            <Text style={styles.profilePhotoIcon}>👤</Text>
          </View>
        )}
        <Text style={styles.changePhotoText}>
          {language === 'hr' ? 'Promijeni fotografiju' : 'Change photo'}
        </Text>
      </TouchableOpacity>
      {uploadingPhoto && (
        <Text style={styles.uploadingText}>
          {language === 'hr' ? 'Učitavanje...' : 'Uploading...'}
        </Text>
      )}

      <Text style={styles.email}>{user.email}</Text>

      <TextField
        label={`${t(language, 'firstName')} *`}
        value={firstName}
        onChangeText={setFirstName}
        placeholder={t(language, 'firstNamePlaceholder')}
        editable={!saving}
      />

      <TextField
        label={`${t(language, 'lastName')} *`}
        value={lastName}
        onChangeText={setLastName}
        placeholder={t(language, 'lastNamePlaceholder')}
        editable={!saving}
      />

      <TextField
        label={t(language, 'wineryName')}
        value={wineryName}
        onChangeText={setWineryName}
        placeholder={t(language, 'wineryPlaceholder')}
        editable={!saving}
      />

      <TextField
        label={t(language, 'phone')}
        value={phone}
        onChangeText={setPhone}
        placeholder={t(language, 'phonePlaceholder')}
        editable={!saving}
      />

      <Text style={styles.label}>{t(language, 'region')}</Text>
      <TouchableOpacity style={styles.input}
        onPress={() => setShowRegions(!showRegions)}>
        <Text style={{ color: region ? colors.textPrimary : colors.textMuted }}>
          {region || t(language, 'selectRegion')}
        </Text>
      </TouchableOpacity>
      {showRegions && (
        <View style={styles.dropdown}>
          {REGIONS.map(r => (
            <TouchableOpacity key={r} style={styles.dropdownItem}
              onPress={() => { setRegion(r); setShowRegions(false); }}>
              <Text style={[styles.dropdownText, r === region && { color: colors.gold }]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Language selector */}
      <Text style={styles.label}>{t(language, 'language')}</Text>
      <View style={styles.langRow}>
        <TouchableOpacity
          style={[styles.langBtn, language === 'hr' && styles.langBtnActive]}
          onPress={() => handleLanguageChange('hr')}>
          <Text style={styles.langFlag}>🇭🇷</Text>
          <Text style={[styles.langLabel, language === 'hr' && styles.langLabelActive]}>
            Hrvatski
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
          onPress={() => handleLanguageChange('en')}>
          <Text style={styles.langFlag}>🇬🇧</Text>
          <Text style={[styles.langLabel, language === 'en' && styles.langLabelActive]}>
            English
          </Text>
        </TouchableOpacity>
      </View>

      <PrimaryButton
        style={styles.button}
        onPress={handleSave}
        disabled={saving}
        loading={saving}
        label={t(language, 'saveProfile')}
      />

      <TouchableOpacity
        style={styles.linkCard}
        onPress={() => navigation.navigate('Marketplace')}>
        <Text style={styles.linkIcon}>🛒</Text>
        <View>
          <Text style={styles.linkTitle}>{t(language, 'marketplace')}</Text>
          <Text style={styles.linkSub}>{t(language, 'marketplaceSub')}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t(language, 'logout')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDeleteAccount}
        disabled={saving}>
        <Text style={styles.deleteText}>{t(language, 'deleteAccount')}</Text>
      </TouchableOpacity>
      </ScreenWrapper>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  content:        { padding: 0, paddingBottom: 0 },
  center:         { flex: 1, backgroundColor: colors.background,
                    alignItems: 'center', justifyContent: 'center' },
  title:          { fontSize: 28, color: colors.gold, fontWeight: '700', marginBottom: 4 },
  photoContainer:          { alignItems: 'center', marginBottom: 24 },
  profilePhoto:            { width: 90, height: 90, borderRadius: 45,
                             borderWidth: 2, borderColor: colors.gold },
  profilePhotoPlaceholder: { width: 90, height: 90, borderRadius: 45,
                             backgroundColor: colors.surface, borderWidth: 2,
                             borderColor: colors.border, alignItems: 'center',
                             justifyContent: 'center' },
  profilePhotoIcon:        { fontSize: 36 },
  changePhotoText:         { color: colors.gold, fontSize: 13, marginTop: 8 },
  uploadingText:           { color: colors.textMuted, fontSize: 12,
                             fontStyle: 'italic', textAlign: 'center',
                             marginBottom: 8 },
  email:          { fontSize: 13, color: colors.textMuted, marginBottom: 28 },
  label:          { fontSize: 12, color: colors.textMuted,
                    textTransform: 'uppercase', letterSpacing: 1,
                    marginBottom: 6, marginTop: 16 },
  input:          { backgroundColor: colors.surface, borderWidth: 1,
                    borderColor: colors.inputBorder, borderRadius: 8,
                    paddingHorizontal: 14, paddingVertical: 12,
                    color: colors.textPrimary, fontSize: 15 },
  dropdown:       { backgroundColor: colors.surface, borderWidth: 1,
                    borderColor: colors.border, borderRadius: 8,
                    marginTop: 4, overflow: 'hidden' },
  dropdownItem:   { paddingHorizontal: 14, paddingVertical: 12,
                    borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownText:   { color: colors.textPrimary, fontSize: 15 },
  langRow:        { flexDirection: 'row', gap: 12, marginTop: 4 },
  langBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center',
                    gap: 8, backgroundColor: colors.surface, borderRadius: 8,
                    borderWidth: 1, borderColor: colors.border,
                    paddingVertical: 10, paddingHorizontal: 14 },
  langBtnActive:  { borderColor: colors.gold },
  langFlag:       { fontSize: 20 },
  langLabel:      { fontSize: 14, color: colors.textMuted },
  langLabelActive:{ color: colors.gold },
  button:         { marginTop: 32 },
  linkCard:       { flexDirection: 'row', alignItems: 'center', gap: 14,
                    backgroundColor: colors.surface, borderRadius: 10,
                    borderWidth: 1, borderColor: colors.border,
                    padding: 16, marginTop: 28 },
  linkIcon:       { fontSize: 26 },
  linkTitle:      { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  linkSub:        { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  logoutButton:   { alignItems: 'center', marginTop: 20, paddingVertical: 12 },
  logoutText:     { color: colors.textMuted, fontSize: 14 },
  deleteButton:   { alignItems: 'center', marginTop: 4, marginBottom: 24, paddingVertical: 12 },
  deleteText:     { color: colors.burgundy, fontSize: 14 },
});
