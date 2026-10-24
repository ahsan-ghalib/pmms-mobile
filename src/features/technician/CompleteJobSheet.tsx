import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../i18n/LanguageContext';
import { PickedPhoto, PICKER_OPTIONS, toPicked } from '../create/PhotosStep';
import { Job } from './jobs';
import { issuedBalances } from './parts';
import { technicianCopy } from './technicianCopy';
import { currentCoordinates, useCompleteJob } from './useTechnician';

const MAX_PER_TYPE = 4;

type Props = {
  job: Job;
  visible: boolean;
  onClose: () => void;
  onCompleted: () => void;
};

export default function CompleteJobSheet({ job, visible, onClose, onCompleted }: Props) {
  const insets = useSafeAreaInsets();
  const { language, font, row, align } = useLanguage();
  const copy = technicianCopy[language].detail;
  const settings = job.company_settings;
  const complete = useCompleteJob(job.id);
  const [summary, setSummary] = useState(job.service_summary ?? '');
  const [before, setBefore] = useState<PickedPhoto[]>([]);
  const [after, setAfter] = useState<PickedPhoto[]>([]);
  const [locating, setLocating] = useState(false);

  const pick = (set: (fn: (prev: PickedPhoto[]) => PickedPhoto[]) => void) => {
    const add = (assets: ImagePicker.ImagePickerAsset[]) =>
      set((prev) => [...prev, ...assets.map(toPicked)].slice(0, MAX_PER_TYPE));
    const fromCamera = async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return Toast.show({ type: 'error', text1: copy.permissionDenied });
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      if (!result.canceled) add(result.assets);
    };
    const fromLibrary = async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Toast.show({ type: 'error', text1: copy.permissionDenied });
      const result = await ImagePicker.launchImageLibraryAsync({
        ...PICKER_OPTIONS,
        allowsMultipleSelection: true,
        selectionLimit: MAX_PER_TYPE,
      });
      if (!result.canceled) add(result.assets);
    };
    Alert.alert(copy.addPhoto, undefined, [
      { text: copy.camera, onPress: fromCamera },
      { text: copy.library, onPress: fromLibrary },
      { text: technicianCopy[language].cancel, style: 'cancel' },
    ]);
  };

  const submit = async () => {
    if (!summary.trim()) return Toast.show({ type: 'error', text1: copy.summaryRequired });
    if (settings?.require_before_photos && !before.length)
      return Toast.show({ type: 'error', text1: copy.beforeRequired });
    if (settings?.require_after_photos && !after.length)
      return Toast.show({ type: 'error', text1: copy.afterRequired });

    setLocating(true);
    const coords = await currentCoordinates().catch(() => null);
    setLocating(false);
    if (settings?.require_gps_checkout && !coords) {
      return Toast.show({
        type: 'error',
        text1: copy.locationNeeded,
        text2: copy.locationNeededBody,
      });
    }

    const form = new FormData();
    form.append('service_summary', summary.trim());
    if (coords) {
      form.append('latitude', String(coords.latitude));
      form.append('longitude', String(coords.longitude));
      if (coords.accuracy_meters != null)
        form.append('accuracy_meters', String(coords.accuracy_meters));
    }
    before.forEach((photo) => form.append('before_photos[]', photo as unknown as Blob));
    after.forEach((photo) => form.append('after_photos[]', photo as unknown as Blob));

    complete.mutate(form, {
      onSuccess: () => {
        Toast.show({ type: 'success', text1: copy.completed });
        onCompleted();
      },
      onError: (error) =>
        Toast.show({ type: 'error', text1: copy.actionFailed, text2: error.message }),
    });
  };

  const busy = locating || complete.isPending;
  const unrecordedParts = issuedBalances(job.part_requests).some((item) => item.available > 0);

  const photoRow = (
    label: string,
    required: boolean,
    photos: PickedPhoto[],
    set: (fn: (prev: PickedPhoto[]) => PickedPhoto[]) => void,
  ) => (
    <View className="mt-5">
      <View className={`${row} items-center justify-between`}>
        <Text className={`text-[14px] ${font.semibold} text-ink-900`}>{label}</Text>
        <Text
          className={`text-[12px] ${font.medium} ${required ? 'text-rose-500' : 'text-ink-400'}`}
        >
          {required ? copy.required : copy.optional}
        </Text>
      </View>
      <View className={`mt-2.5 ${row} flex-wrap gap-2.5`}>
        {photos.map((photo, index) => (
          <View key={photo.uri}>
            <Image
              source={{ uri: photo.uri }}
              contentFit="cover"
              style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: '#EEF2F7' }}
            />
            <Pressable
              onPress={() => set((prev) => prev.filter((_, i) => i !== index))}
              hitSlop={6}
              className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full bg-ink-900"
            >
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
        {photos.length < MAX_PER_TYPE ? (
          <Pressable
            onPress={() => pick(set)}
            className="h-[72px] w-[72px] items-center justify-center rounded-[14px] border border-dashed border-brand-300 bg-brand-50 active:opacity-80"
          >
            <Ionicons name="camera-outline" size={22} color="#1D6FE6" />
            <Text className={`mt-0.5 text-[11px] ${font.semibold} text-brand-600`}>
              {copy.addPhoto}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable className="flex-1 bg-black/30" onPress={onClose} />
        <View className="max-h-[88%] rounded-t-3xl bg-white pt-3">
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-slate-200" />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16 }}
          >
            <Text className={`text-[18px] ${font.bold} text-ink-900 ${align}`}>
              {copy.completeTitle}
            </Text>
            {unrecordedParts ? (
              <View className={`mt-3 ${row} items-start gap-2 rounded-xl bg-amber-50 p-3`}>
                <Ionicons name="cube-outline" size={16} color="#B45309" />
                <Text
                  className={`flex-1 text-[12.5px] leading-[18px] ${font.medium} text-amber-800 ${align}`}
                >
                  {copy.unrecordedParts}
                </Text>
              </View>
            ) : null}
            <Text className={`mt-4 text-[14px] ${font.semibold} text-ink-900 ${align}`}>
              {copy.summary}
            </Text>
            <TextInput
              value={summary}
              onChangeText={setSummary}
              placeholder={copy.summaryPlaceholder}
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              className={`mt-2.5 min-h-[110px] rounded-2xl border border-slate-200 bg-[#F8FAFD] p-4 text-[14px] ${font.regular} text-ink-900 ${align}`}
            />
            {photoRow(
              copy.beforePhotos,
              Boolean(settings?.require_before_photos),
              before,
              setBefore,
            )}
            {photoRow(copy.afterPhotos, Boolean(settings?.require_after_photos), after, setAfter)}
            <Pressable
              onPress={submit}
              disabled={busy}
              className={`mt-6 h-[52px] ${row} items-center justify-center gap-2 rounded-2xl bg-emerald-500 active:opacity-90`}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={19} color="#fff" />
                  <Text className={`text-[15px] ${font.semibold} text-white`}>
                    {copy.submitComplete}
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
