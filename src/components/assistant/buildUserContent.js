import { imageUriToBase64 } from './imageBase64';

export async function buildUserContent({ language, inputText, pendingImage, reportError }) {
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
    }
  }

  const trimmed = (inputText || '').trim();
  if (trimmed) {
    userContent.push({ type: 'text', text: trimmed });
  } else if (pendingImage) {
    userContent.push({
      type: 'text',
      text: language === 'hr' ? 'Što možete reći o ovoj slici?' : 'What can you tell me about this image?',
    });
  }

  return { userContent, displayImage };
}

