import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export async function captureCameraImage({ language }) {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      language === 'hr' ? 'Dozvola odbijena' : 'Permission denied',
      language === 'hr' ? 'Trebamo pristup kameri.' : 'We need access to your camera.'
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 0.6,
  });

  if (result.canceled) return null;
  return result.assets?.[0] || null;
}

