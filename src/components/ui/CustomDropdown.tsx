import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, FlatList, TextInput, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from '../Text';

export interface DropdownOption {
  id: string | number;
  label: string;
  data?: any;
}

export interface CustomDropdownProps {
  icon?: string;
  label?: string;
  placeholder?: string;
  value?: string | number;
  options: DropdownOption[];
  onSelect: (option: DropdownOption) => void;
  disabled?: boolean;
  searchPlaceholder?: string;
}

export function CustomDropdown({
  icon,
  label,
  placeholder,
  value,
  options,
  onSelect,
  disabled,
  searchPlaceholder,
}: CustomDropdownProps) {
  const { t, i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isArabic = i18n.language === 'ar';
  const rowDirection = isArabic ? 'row-reverse' : 'row';
  const textAlign = isArabic ? 'right' : 'left';

  const selectedOption = options.find((opt) => opt.id === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const closeModal = () => {
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View className="mb-3" style={{ direction: 'ltr' }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => !disabled && setModalVisible(true)}
        className={`items-center rounded-[16px] border bg-white px-4 py-3 ${modalVisible ? 'border-purple-500' : 'border-gray-100'} ${disabled ? 'opacity-50' : ''}`}
        style={{ flexDirection: rowDirection }}
      >
        {icon ? <Ionicons name={icon as any} size={20} color="#8E54E9" /> : null}
        <View
          className="flex-1 justify-center"
          style={{
            marginLeft: isArabic ? 0 : icon ? 12 : 0,
            marginRight: isArabic ? (icon ? 12 : 0) : 0,
            alignItems: isArabic ? 'flex-end' : 'flex-start',
            width: '100%',
          }}
        >
          {label ? (
            <Text className="text-[12px] text-gray-500 mb-0.5 w-full" style={{ textAlign }}>
              {label}
            </Text>
          ) : null}
          {selectedOption ? (
            <Text className="text-[14px] text-gray-900 font-medium w-full" style={{ textAlign }}>
              {selectedOption.label}
            </Text>
          ) : (
            <Text className="text-[14px] text-gray-400 w-full" style={{ textAlign }}>
              {placeholder}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl h-[70%]" style={{ direction: 'ltr' }}>
            <View
              className="items-center justify-between p-4 border-b border-gray-100"
              style={{ flexDirection: rowDirection }}
            >
              <Text className="flex-1 text-lg font-semibold text-gray-900" style={{ textAlign }}>
                {placeholder}
              </Text>
              <TouchableOpacity onPress={closeModal} className="p-2">
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View className="p-4 border-b border-gray-100">
              <View
                className="items-center bg-gray-50 rounded-xl px-4 py-3"
                style={{ flexDirection: rowDirection }}
              >
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <TextInput
                  placeholder={searchPlaceholder || t('search', 'Search...')}
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 text-gray-900 text-base"
                  style={{
                    marginLeft: isArabic ? 0 : 8,
                    marginRight: isArabic ? 8 : 0,
                    textAlign,
                    fontFamily: isArabic ? 'PlaypenSansArabic_500Medium' : 'Inter_500Medium',
                  }}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingVertical: 8,
                paddingBottom: 40,
              }}
              renderItem={({ item }) => {
                const isSelected = item.id === value;
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    className={`items-center justify-between px-5 py-4 rounded-2xl mb-3 ${isSelected ? 'bg-[#F0F8FF]' : 'bg-[#F8FAFC]'}`}
                    style={{ flexDirection: rowDirection }}
                    onPress={() => {
                      onSelect(item);
                      closeModal();
                    }}
                  >
                    <Text
                      className={`text-[16px] flex-1 ${isSelected ? 'text-gray-900 font-bold' : 'text-gray-700 font-medium'}`}
                      style={{ textAlign }}
                    >
                      {item.label}
                    </Text>
                    <View
                      className="items-center justify-center"
                      style={{ marginLeft: isArabic ? 0 : 16, marginRight: isArabic ? 16 : 0 }}
                    >
                      {isSelected ? (
                        <Ionicons name="radio-button-on" size={24} color="#3B82F6" />
                      ) : (
                        <Ionicons name="radio-button-off" size={24} color="#E2E8F0" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View className="p-8 items-center justify-center">
                  <Text className="text-gray-500">{t('no_results', 'No results.')}</Text>
                </View>
              }
            />
            <SafeAreaView />
          </View>
        </View>
      </Modal>
    </View>
  );
}
