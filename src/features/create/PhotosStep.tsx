import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../i18n/LanguageContext';
import { createCopy } from './createCopy';
import { cardShadow } from './shared';

export const MAX_PHOTOS = 2;

export type PickedPhoto = { uri: string; name: string; type: string };

type Props = {
  photos: PickedPhoto[];
  onPhotos: (photos: PickedPhoto[]) => void;
  description: string;
  onDescription: (value: string) => void;
};

const UPLOAD_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function toPicked(asset: ImagePicker.ImagePickerAsset, index: number): PickedPhoto {
  const type = asset.mimeType && UPLOAD_TYPES[asset.mimeType] ? asset.mimeType : 'image/jpeg';
  return { uri: asset.uri, name: `photo-${Date.now()}-${index}.${UPLOAD_TYPES[type]}`, type };
}

export const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.6,
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

export default function PhotosStep({ photos, onPhotos, description, onDescription }: Props) {
  const { language, font, row, align } = useLanguage();
  const copy = createCopy[language];
  const remaining = MAX_PHOTOS - photos.length;

  const add = (assets: ImagePicker.ImagePickerAsset[]) =>
    onPhotos([...photos, ...assets.map(toPicked)].slice(0, MAX_PHOTOS));

  const fromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Toast.show({ type: 'error', text1: copy.permissionDenied });
    const result = await ImagePicker.launchImageLibraryAsync({
      ...PICKER_OPTIONS,
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
    });
    if (!result.canceled) add(result.assets);
  };

  const fromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Toast.show({ type: 'error', text1: copy.permissionDenied });
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (!result.canceled) add(result.assets);
  };

  const pick = () =>
    Alert.alert(copy.addPhotos, undefined, [
      { text: copy.camera, onPress: fromCamera },
      { text: copy.library, onPress: fromLibrary },
      { text: copy.cancel, style: 'cancel' },
    ]);

  return (
    <View className="gap-4">
      <View className="rounded-2xl bg-white p-4" style={cardShadow}>
        <View className={`${row} items-center justify-between`}>
          <Text className={`text-[15px] ${font.bold} text-ink-900`}>{copy.photos}</Text>
          <Text className={`text-[12px] ${font.medium} text-ink-400`}>
            {copy.photosOptional(MAX_PHOTOS)}
          </Text>
        </View>
        <View className={`mt-3 ${row} gap-3`}>
          {photos.map((photo, index) => (
            <View key={photo.uri}>
              <Image
                source={{ uri: photo.uri }}
                contentFit="cover"
                style={{ width: 92, height: 92, borderRadius: 14, backgroundColor: '#EEF2F7' }}
              />
              <Pressable
                onPress={() => onPhotos(photos.filter((_, i) => i !== index))}
                hitSlop={6}
                className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full bg-black/60"
              >
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
          {remaining > 0 ? (
            <Pressable
              onPress={pick}
              className="h-[92px] w-[92px] items-center justify-center rounded-[14px] border-2 border-dashed border-brand-200 bg-brand-50/50 active:opacity-80"
            >
              <Ionicons name="camera-outline" size={24} color="#1D6FE6" />
              <Text className={`mt-1 text-[12px] ${font.semibold} text-brand-600`}>
                {copy.addPhoto}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text className={`mt-2.5 text-[11.5px] ${font.regular} text-ink-400 ${align}`}>
          {copy.uploadHint}
        </Text>
      </View>

      <View className="rounded-2xl bg-white p-4" style={cardShadow}>
        <Text className={`text-[15px] ${font.bold} text-ink-900 ${align}`}>{copy.describe}</Text>
        <TextInput
          value={description}
          onChangeText={onDescription}
          placeholder={copy.describePlaceholder}
          placeholderTextColor="#94A3B8"
          multiline
          textAlignVertical="top"
          className={`mt-3 min-h-[110px] rounded-xl border border-slate-200 bg-[#F8FAFD] p-3.5 text-[14px] ${font.regular} text-ink-900 ${align}`}
        />
        {description.length > 0 && description.trim().length < 5 ? (
          <Text className={`mt-1.5 text-[12px] ${font.regular} text-rose-600 ${align}`}>
            {copy.describeMin}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
