import { View, Image, TouchableOpacity, Text } from 'react-native';

export function PendingImagePreview({ pendingImage, styles, onRemove }) {
  if (!pendingImage?.uri) return null;

  return (
    <View style={styles.pendingImageContainer}>
      <Image source={{ uri: pendingImage.uri }} style={styles.pendingImage} />
      <TouchableOpacity style={styles.removePending} onPress={onRemove}>
        <Text style={styles.removePendingText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

