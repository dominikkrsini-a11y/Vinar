import { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { t } from '../../i18n/translations';
import { addListing, uploadImage } from '../../firebase/firestore';
import { reportError } from '../../utils/reportError';
import { pickImageFromLibrary, takePhotoWithCamera } from './imageHelpers';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { TextField } from '../../components/ui/TextField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';

export function PostListingModal({
  visible,
  onClose,
  language,
  profile,
  userId,
  userEmail,
  onPosted,
}) {
  const categories = useMemo(
    () => [
      { key: 'grapes', label: t(language, 'grapes'), icon: '🍇' },
      { key: 'bulk_wine', label: t(language, 'bulkWine'), icon: '🍷' },
      { key: 'equipment', label: t(language, 'equipment'), icon: '⚙️' },
      { key: 'chemicals', label: t(language, 'chemicals'), icon: '🧪' },
      { key: 'other', label: t(language, 'other'), icon: '📦' },
    ],
    [language]
  );

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('grapes');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [showPhone, setShowPhone] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  const resetForm = () => {
    setTitle('');
    setCategory('grapes');
    setDescription('');
    setPrice('');
    setShowPhone(true);
    setShowEmail(false);
    setImage(null);
  };

  const handlePickImage = async () => {
    const uri = await pickImageFromLibrary({ language, Alert });
    if (uri) setImage(uri);
  };

  const handleTakePhoto = async () => {
    const uri = await takePhotoWithCamera({ language, Alert });
    if (uri) setImage(uri);
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
        const path = `listings/${userId}/${Date.now()}.jpg`;
        imageUrl = await uploadImage(image, path);
        setUploadingImg(false);
      }

      await addListing({
        title: title.trim(),
        category,
        description: description.trim(),
        price: price.trim(),
        showPhone,
        showEmail,
        phone: showPhone ? profile?.phone || '' : null,
        email: showEmail ? userEmail : null,
        sellerName: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(),
        wineryName: profile?.wineryName || '',
        region: profile?.region || '',
        userId,
        imageUrl,
      });

      resetForm();
      onClose?.();
      await onPosted?.();
    } catch (e) {
      reportError(e, { screen: 'Marketplace', action: 'postListing' });
      Alert.alert(t(language, 'error'), 'Could not post listing.');
    } finally {
      setSaving(false);
      setUploadingImg(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.modal}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenWrapper style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t(language, 'postListing')}</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextField
              label={`${t(language, 'title')} *`}
              value={title}
              onChangeText={setTitle}
              placeholder={t(language, 'titlePlaceholder')}
              editable={!saving}
            />

            <Text style={styles.label}>{t(language, 'category')}</Text>
            <View style={styles.categoryRow}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.categoryBtn, category === c.key && styles.categoryBtnActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text style={styles.categoryIcon}>{c.icon}</Text>
                  <Text style={[styles.categoryLabel, category === c.key && styles.categoryLabelActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextField
              label={t(language, 'description')}
              value={description}
              onChangeText={setDescription}
              placeholder={t(language, 'descriptionPlaceholder')}
              editable={!saving}
              multiline
            />

            <TextField
              label={t(language, 'price')}
              value={price}
              onChangeText={setPrice}
              placeholder={t(language, 'pricePlaceholder')}
              editable={!saving}
            />

            <Text style={styles.label}>{language === 'hr' ? 'Fotografija' : 'Photo'}</Text>
            <View style={styles.photoRow}>
              <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage} disabled={saving}>
                <Text style={styles.photoBtnText}>🖼️ {language === 'hr' ? 'Galerija' : 'Gallery'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto} disabled={saving}>
                <Text style={styles.photoBtnText}>📷 {language === 'hr' ? 'Kamera' : 'Camera'}</Text>
              </TouchableOpacity>
            </View>

            {image && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: image }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImage} onPress={() => setImage(null)} disabled={saving}>
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
                {t(language, 'showPhone')}{' '}
                {profile?.phone ? `(${profile.phone})` : `(${t(language, 'notSet')})`}
              </Text>
              <Switch
                value={showPhone}
                onValueChange={setShowPhone}
                trackColor={{ true: colors.gold }}
                thumbColor="#fff"
                disabled={saving}
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {t(language, 'showEmail')} ({userEmail})
              </Text>
              <Switch
                value={showEmail}
                onValueChange={setShowEmail}
                trackColor={{ true: colors.gold }}
                thumbColor="#fff"
                disabled={saving}
              />
            </View>

            {!profile?.phone && showPhone && (
              <Text style={styles.phoneWarning}>{t(language, 'phoneWarning')}</Text>
            )}

            <PrimaryButton
              style={styles.button}
              onPress={handlePost}
              disabled={saving}
              loading={saving}
              label={t(language, 'postListing')}
            />

            <TouchableOpacity style={styles.resetBtn} onPress={resetForm} disabled={saving}>
              <Text style={styles.resetText}>{t(language, 'reset')}</Text>
            </TouchableOpacity>
          </ScreenWrapper>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: colors.background },
  modalContent: { padding: 0, paddingBottom: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, color: colors.gold, fontWeight: '700' },
  modalClose: { fontSize: 20, color: colors.textMuted, padding: 4 },
  label: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary, fontSize: 15 },
  textArea: { height: 90, textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  photoBtn: { flex: 1, backgroundColor: colors.surfaceDeep, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  photoBtnText: { color: colors.textPrimary, fontSize: 13 },
  imagePreview: { position: 'relative', marginBottom: 8 },
  previewImage: { width: '100%', height: 180, borderRadius: 8 },
  removeImage: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  removeImageText: { color: '#fff', fontSize: 14 },
  uploadingText: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginBottom: 8 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.surfaceDeep, borderWidth: 1, borderColor: colors.border, minWidth: 70 },
  categoryBtnActive: { borderColor: colors.gold },
  categoryIcon: { fontSize: 20, marginBottom: 2 },
  categoryLabel: { fontSize: 11, color: colors.textMuted },
  categoryLabelActive: { color: colors.gold },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8 },
  toggleLabel: { fontSize: 13, color: colors.textPrimary, flex: 1 },
  phoneWarning: { fontSize: 12, color: '#c8902a', marginTop: 4 },
  button: { marginTop: 24 },
  resetBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  resetText: { color: colors.textMuted, fontSize: 14 },
});

