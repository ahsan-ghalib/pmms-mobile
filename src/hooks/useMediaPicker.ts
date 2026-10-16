import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

/** Keep under the API chat attachment limit (20 MB) so nginx/PHP do not return 413. */
const CHAT_MAX_BYTES = 20 * 1024 * 1024;

function prepareChatAttachment(asset: any): any | null {
  const size = Number(asset?.fileSize || asset?.size || 0);
  if (size > CHAT_MAX_BYTES) {
    Alert.alert('File too large', 'Please choose a smaller image or a shorter video (max 20 MB).');
    return null;
  }

  const isVideo = asset?.type === 'video' || String(asset?.mimeType || '').startsWith('video');
  return {
    ...asset,
    name:
      asset.fileName ||
      asset.name ||
      asset.uri?.split('/').pop() ||
      (isVideo ? 'video.mp4' : 'image.jpg'),
    mimeType:
      asset.mimeType ||
      (isVideo ? 'video/mp4' : asset?.type === 'image' ? 'image/jpeg' : 'application/octet-stream'),
  };
}

export const useMediaPicker = (onAttachmentSelected: (attachment: any) => void) => {
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        quality: 0.7,
        videoMaxDuration: 60,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const attachment = prepareChatAttachment(result.assets[0]);
        if (attachment) {
          onAttachmentSelected(attachment);
        }
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert('Error', 'Unable to open image gallery. Please try again.');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const attachment = prepareChatAttachment(result.assets[0]);
        if (attachment) {
          onAttachmentSelected(attachment);
        }
      }
    } catch (error) {
      console.error('Failed to pick document:', error);
      Alert.alert('Error', 'Unable to open document picker. Please try again.');
    }
  };

  return { pickImage, pickDocument };
};
