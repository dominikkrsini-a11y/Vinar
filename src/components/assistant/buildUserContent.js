import { imageUriToBase64 } from './imageBase64';
import { Alert } from 'react-native';

// Naming the wine in the message is what makes the assistant focus on it — the
// server prompt already prefers "the wine the user named" (see the LOGBOOK rules
// in server/services/promptBuilder.js). So a pinned wine is stated in the text
// sent upstream rather than only shown in the UI, and the bubble keeps displaying
// what the winemaker actually typed.
function withWineContext(text, focusWine, language) {
  if (!focusWine?.name) return text;
  const label = [focusWine.name, focusWine.vintage].filter(Boolean).join(' ');
  return language === 'hr' ? `Vino: ${label}. ${text}` : `Wine: ${label}. ${text}`;
}

export async function buildUserContent({
  language,
  inputText,
  pendingImage,
  focusWine,
  reportError,
}) {
  const userContent = [];
  let displayImage = null;

  if (pendingImage?.uri) {
    displayImage = pendingImage.uri;
    try {
      const base64data = await imageUriToBase64(pendingImage.uri);
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: base64data,
        },
      });
    } catch (e) {
      reportError?.(e, { screen: 'Assistant', action: 'imageUriToBase64' });
      Alert.alert(
        language === 'hr' ? 'Greška' : 'Error',
        language === 'hr'
          ? 'Ne mogu priložiti fotografiju. Pokušajte ponovno.'
          : 'Could not attach the photo. Please try again.'
      );
    }
  }

  const trimmed = (inputText || '').trim();
  const imageOnlyPrompt = language === 'hr'
    ? 'Što možete reći o ovoj slici?'
    : 'What can you tell me about this image?';
  const displayText = trimmed || (pendingImage ? imageOnlyPrompt : '');

  if (displayText) {
    userContent.push({
      type: 'text',
      text: withWineContext(displayText, focusWine, language),
    });
  }

  return { userContent, displayImage, displayText };
}

