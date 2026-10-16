import { Text } from './Text';

import React from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';

interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
  selectedLanguage?: string;
  onSelectLanguage?: (lang: string) => void;
}

export function LanguageModal({
  visible,
  onClose,
  selectedLanguage,
  onSelectLanguage,
}: LanguageModalProps) {
  const { i18n } = useTranslation();
  const isArabic = (i18n.language || 'en').startsWith('ar');
  const rowDirection = isArabic ? 'row-reverse' : 'row';
  const textAlign = isArabic ? 'right' : 'left';

  const languages = [
    { code: 'en', label: 'English', subLabel: 'English (US)', iconType: 'text' as const },
    { code: 'ar', label: 'العربية', subLabel: 'Arabic (KSA)', iconType: 'icon' as const },
  ];

  const currentLanguage = i18n.language || 'en';

  const handleSelect = (code: string) => {
    changeLanguage(code);
    if (onSelectLanguage) {
      onSelectLanguage(code === 'en' ? 'English' : 'Arabic');
    }
    onClose();
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 justify-end bg-black/30"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="bg-white rounded-t-[32px] pt-3 pb-8"
          style={{ direction: 'ltr' }}
        >
          <View className="items-center pb-2">
            <View className="h-1.5 w-12 bg-gray-200 rounded-full mb-2" />
          </View>

          <View className="px-6 py-2">
            {languages.map((lang) => {
              const isSelected = currentLanguage === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  activeOpacity={0.8}
                  className={`items-center justify-between px-4 py-4 rounded-2xl mb-3 ${isSelected ? 'bg-[#F0F8FF]' : 'bg-[#F8FAFC]'}`}
                  style={{ flexDirection: rowDirection }}
                  onPress={() => handleSelect(lang.code)}
                >
                  <View className="items-center flex-1" style={{ flexDirection: rowDirection }}>
                    <View className="w-10 h-10 items-center justify-center">
                      {lang.iconType === 'text' ? (
                        <Text
                          className={`text-[20px] ${isSelected ? 'text-[#3B82F6]' : 'text-gray-400'}`}
                        >
                          Aa
                        </Text>
                      ) : (
                        <Ionicons
                          name="language-outline"
                          size={24}
                          color={isSelected ? '#3B82F6' : '#94A3B8'}
                        />
                      )}
                    </View>
                    <View
                      className="flex-1"
                      style={{
                        marginLeft: isArabic ? 0 : 12,
                        marginRight: isArabic ? 12 : 0,
                        alignItems: isArabic ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Text
                        className={`text-[16px] font-bold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}
                        style={{ textAlign }}
                      >
                        {lang.label}
                      </Text>
                      <Text
                        className={`text-[13px] mt-0.5 ${isSelected ? 'text-gray-500' : 'text-gray-400'}`}
                        style={{ textAlign }}
                      >
                        {lang.subLabel}
                      </Text>
                    </View>
                  </View>

                  <View className="items-center justify-center">
                    {isSelected ? (
                      <Ionicons name="radio-button-on" size={24} color="#3B82F6" />
                    ) : (
                      <Ionicons name="radio-button-off" size={24} color="#E2E8F0" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
