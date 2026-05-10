import * as ImagePicker from 'expo-image-picker';

export async function pickImageFromLibrary({ language, Alert }) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      language === 'hr' ? 'Dozvola odbijena' : 'Permission denied',
      language === 'hr' ? 'Trebamo pristup vašim fotografijama.' : 'We need access to your photos.'
    );
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.7,
  });
  if (result.canceled) return null;
  return result.assets?.[0]?.uri || null;
}

export async function takePhotoWithCamera({ language, Alert }) {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      language === 'hr' ? 'Dozvola odbijena' : 'Permission denied',
      language === 'hr' ? 'Trebamo pristup kameri.' : 'We need access to your camera.'
    );
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.7,
  });
  if (result.canceled) return null;
  return result.assets?.[0]?.uri || null;
}

