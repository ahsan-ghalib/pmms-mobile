import React from 'react';
import { InteractionManager, Modal, Platform, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPickGallery: () => void;
  onPickFiles: () => void;
};

function afterSheetDismiss(action: () => void) {
  const delay = Platform.OS === 'ios' ? 450 : 80;
  InteractionManager.runAfterInteractions(() => {
    setTimeout(action, delay);
  });
}

export function DocumentSourceSheet({ visible, onClose, onPickGallery, onPickFiles }: Props) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isArabic = (i18n.language || '').startsWith('ar');

  const handleSelect = (action: () => void) => {
    onClose();
    afterSheetDismiss(action);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
        <View
          className="bg-white rounded-t-3xl px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16), direction: 'ltr' }}
        >
          <View className="w-10 h-1.5 bg-gray-200 rounded-full self-center mb-4" />
          <Text
            className="text-[18px] font-extrabold text-gray-900 mb-4"
            style={{ textAlign: isArabic ? 'right' : 'left' }}
          >
            {t('choose_upload_source', 'Upload from')}
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSelect(onPickGallery)}
            className="items-center bg-[#F9F5FF] rounded-2xl px-4 py-4 mb-3"
            style={{ flexDirection: isArabic ? 'row-reverse' : 'row' }}
          >
            <View className="w-11 h-11 rounded-full bg-white items-center justify-center">
              <Ionicons name="images-outline" size={22} color="#8E54E9" />
            </View>
            <View className="flex-1" style={{ marginHorizontal: 12 }}>
              <Text
                className="text-[15px] font-bold text-gray-900"
                style={{ textAlign: isArabic ? 'right' : 'left' }}
              >
                {t('choose_from_gallery', 'Gallery')}
              </Text>
              <Text
                className="text-[12px] text-gray-500 mt-0.5"
                style={{ textAlign: isArabic ? 'right' : 'left' }}
              >
                {t('choose_from_gallery_hint', 'Photos from your camera roll')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSelect(onPickFiles)}
            className="items-center bg-gray-50 rounded-2xl px-4 py-4 mb-2"
            style={{ flexDirection: isArabic ? 'row-reverse' : 'row' }}
          >
            <View className="w-11 h-11 rounded-full bg-white items-center justify-center">
              <Ionicons name="document-outline" size={22} color="#6B7280" />
            </View>
            <View className="flex-1" style={{ marginHorizontal: 12 }}>
              <Text
                className="text-[15px] font-bold text-gray-900"
                style={{ textAlign: isArabic ? 'right' : 'left' }}
              >
                {t('choose_from_files', 'Files')}
              </Text>
              <Text
                className="text-[12px] text-gray-500 mt-0.5"
                style={{ textAlign: isArabic ? 'right' : 'left' }}
              >
                {t('choose_from_files_hint', 'PDF or image from Files')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
