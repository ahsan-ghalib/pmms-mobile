import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '../Text';

import { CustomInput as Input } from '../../components/ui/CustomInput';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { TermsAgreeCheckbox } from '../../components/ui/TermsAgreeCheckbox';
import { CustomDropdown, DropdownOption } from '../../components/ui/CustomDropdown';
import { RegistrationHeader } from '../../components/ui/RegistrationHeader';
import { AuthService } from '../../api/services/auth.service';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { correctArabicLabel } from '../../utils/arabicLabels';

export default function JoinUsActivityStep({ onNext }: { onNext: () => void }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const router = useRouter();
  const { login, user } = useAuth();

  const [accountTypes, setAccountTypes] = useState<DropdownOption[]>([]);
  const [rawActivityTypes, setRawActivityTypes] = useState<any[]>([]);

  const [selectedAccountTypeId, setSelectedAccountTypeId] = useState<string | number>('');
  const [selectedActivityTypeId, setSelectedActivityTypeId] = useState<string | number>('');
  const [storeName, setStoreName] = useState('');
  const [isFoodVendor, setIsFoodVendor] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [logo, setLogo] = useState<any>(null);
  const [coverPhoto, setCoverPhoto] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    fetchDropdowns();
  }, []);

  const fetchDropdowns = async () => {
    try {
      const [accountRes, activityRes] = await Promise.all([
        apiClient.get(ENDPOINTS.DISCOVER.ACCOUNT_TYPES, { active: 1 }),
        apiClient.get(ENDPOINTS.DISCOVER.ACTIVITY_TYPES, { active: 1 }),
      ]);
      const accList = Array.isArray(accountRes)
        ? accountRes
        : Array.isArray(accountRes?.data)
          ? accountRes.data
          : Array.isArray(accountRes?.data?.data)
            ? accountRes.data.data
            : [];
      const actList = Array.isArray(activityRes)
        ? activityRes
        : Array.isArray(activityRes?.data)
          ? activityRes.data
          : Array.isArray(activityRes?.data?.data)
            ? activityRes.data.data
            : [];

      setAccountTypes(
        accList.map((a: any) => ({
          id: a.id,
          label: isArabic
            ? correctArabicLabel(a.name_ar || a.name_arabic) || a.name
            : a.name || a.name_ar || a.name_arabic,
        })),
      );
      setRawActivityTypes(actList);
    } catch (error) {
      console.error('Failed to fetch dropdowns:', error);
    }
  };

  const pickImage = async (setImage: (image: any) => void) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(t('permission_required', 'Permission to access gallery is required!'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
      if (setImage === setLogo) setErrors((prev: any) => ({ ...prev, logo: null }));
      if (setImage === setCoverPhoto) setErrors((prev: any) => ({ ...prev, cover_photo: null }));
    }
  };

  const handleNext = async () => {
    if (!selectedAccountTypeId || !selectedActivityTypeId || !storeName) {
      Alert.alert(t('error'), t('fill_all_fields', 'Please fill all required fields'));
      return;
    }
    if (!acceptedTerms) {
      Alert.alert(t('error'), t('accept_terms_error', 'Please accept terms and conditions'));
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const formData = new FormData();
      formData.append('account_type_id', selectedAccountTypeId.toString());
      formData.append('activity_type_id', selectedActivityTypeId.toString());
      formData.append('is_food_vendor', isFoodVendor ? '1' : '0');
      formData.append('store_name', storeName);
      formData.append('terms_accepted', '1');

      if (logo) {
        formData.append('logo', {
          uri: logo.uri,
          name: 'logo.jpg',
          type: 'image/jpeg',
        } as any);
      }

      if (coverPhoto) {
        formData.append('cover_photo', {
          uri: coverPhoto.uri,
          name: 'cover.jpg',
          type: 'image/jpeg',
        } as any);
      }

      const response: any = await AuthService.updateActivityInfo(formData);
      if (response && response.vendor) {
        const storageObj = require('../../storage/storage').default;
        const token = await storageObj.getToken();

        if (user && token) {
          const updatedUser = {
            ...user,
            ...(response.user || {}),
            avatar: response.user?.avatar || response.vendor?.logo || user.avatar,
            vendor: response.vendor,
          };
          await login(token, updatedUser);
        } else if (token) {
          await login(token);
        }

        onNext();
      }
    } catch (error: any) {
      console.error(error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        let message =
          error.response?.data?.message ||
          error.message ||
          t('error_occurred', 'An error occurred');
        if (error.response?.data) {
          message += ' - ' + JSON.stringify(error.response.data);
        }
        Alert.alert(t('error'), message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <View className="flex-1">
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow px-6 pb-8 pt-6"
        >
          <Text
            className="text-2xl font-bold text-[#111827] mb-2"
            style={{ fontFamily: isArabic ? 'PlaypenSansArabic_700Bold' : 'Inter_700Bold' }}
          >
            {t('activity_info', 'Basic Information')}
          </Text>
          <Text
            className="text-sm text-gray-500 mb-6"
            style={{ fontFamily: isArabic ? 'PlaypenSansArabic_400Regular' : 'Inter_400Regular' }}
          >
            {t('step_1_desc', "Let's start with your store's basic details.")}
          </Text>

          {/* Form Card */}
          <View
            className="bg-white rounded-3xl p-5 mb-6 border border-gray-100 shadow-sm"
            style={{
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            }}
          >
            <CustomDropdown
              label={t('account_type', 'Account Type')}
              placeholder={t('select_account_type', 'Select Account Type')}
              value={selectedAccountTypeId}
              options={accountTypes}
              onSelect={(item) => {
                setSelectedAccountTypeId(item.id);
                setSelectedActivityTypeId(''); // Reset activity type when account type changes
                setErrors((prev: any) => ({
                  ...prev,
                  account_type_id: null,
                  activity_type_id: null,
                }));
              }}
            />

            <CustomDropdown
              label={t('activity_type', 'Activity Type')}
              placeholder={t('select_activity_type', 'Select Activity Type')}
              value={selectedActivityTypeId}
              options={rawActivityTypes
                .filter((a) => a.account_type_id == selectedAccountTypeId)
                .map((a: any) => ({
                  id: a.id,
                  label: isArabic
                    ? correctArabicLabel(a.name_ar || a.name_arabic) || a.name
                    : a.name || a.name_ar || a.name_arabic,
                }))}
              disabled={!selectedAccountTypeId}
              onSelect={(item) => {
                setSelectedActivityTypeId(item.id);
                setErrors((prev: any) => ({ ...prev, activity_type_id: null }));
              }}
            />

            <View className="mb-4 mt-2">
              <Checkbox
                label={t('is_food_vendor', 'Are you a food vendor?')}
                checked={isFoodVendor}
                onChange={setIsFoodVendor}
              />
              <Text
                className="text-xs text-gray-400 mt-1"
                style={{ [isArabic ? 'marginRight' : 'marginLeft']: 32 }}
              >
                {t('food_vendor_desc', 'Turn on if you sell food products')}
              </Text>
            </View>

            <View className="mb-4 mt-2">
              <Input
                label={t('store_name', 'Store Name *')}
                placeholder={t('enter_store_name', 'Enter your store name')}
                icon="storefront-outline"
                value={storeName}
                onChangeText={(val) => {
                  setStoreName(val);
                  setErrors((prev: any) => ({ ...prev, store_name: null }));
                }}
              />
              {errors?.store_name && (
                <Text className="mt-1 text-xs text-red-500">{errors.store_name[0]}</Text>
              )}
            </View>
          </View>

          {/* Media Card */}
          <View
            className="bg-white rounded-3xl p-5 mb-6 border border-gray-100 shadow-sm"
            style={{
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            }}
          >
            <View className="mb-4">
              <Text className="font-semibold text-[#111827] mb-2">{t('logo', 'Store Logo')}</Text>
              <TouchableOpacity
                onPress={() => pickImage(setLogo)}
                activeOpacity={0.8}
                className={`h-32 border-2 border-dashed rounded-2xl items-center justify-center bg-gray-50 ${errors?.logo ? 'border-red-500' : 'border-gray-300'}`}
              >
                {logo ? (
                  <View className="w-full h-full relative">
                    <Image
                      source={{ uri: logo.uri }}
                      className="w-full h-full rounded-2xl"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setLogo(null);
                      }}
                      className="absolute top-2 right-2 bg-black/50 w-8 h-8 rounded-full items-center justify-center"
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="items-center">
                    <Ionicons name="cloud-upload-outline" size={32} color="#9CA3AF" />
                    <Text className="text-sm font-medium text-gray-500 mt-2">
                      {t('tap_to_upload', 'Tap to upload or drag')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {errors?.logo && <Text className="mt-1 text-xs text-red-500">{errors.logo[0]}</Text>}
            </View>

            <View className="mb-6">
              <Text className="font-semibold text-[#111827] mb-2">
                {t('cover_photo', 'Store Cover Photo')}
              </Text>
              <TouchableOpacity
                onPress={() => pickImage(setCoverPhoto)}
                activeOpacity={0.8}
                className="h-32 border-2 border-dashed border-gray-300 rounded-2xl items-center justify-center bg-gray-50"
              >
                {coverPhoto ? (
                  <View className="w-full h-full relative">
                    <Image
                      source={{ uri: coverPhoto.uri }}
                      className="w-full h-full rounded-2xl"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setCoverPhoto(null);
                      }}
                      className="absolute top-2 right-2 bg-black/50 w-8 h-8 rounded-full items-center justify-center"
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="items-center">
                    <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                    <Text className="text-sm font-medium text-gray-500 mt-2">
                      {t('tap_to_upload', 'Tap to upload or drag')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {errors?.cover_photo && (
                <Text className="mt-1 text-xs text-red-500">{errors.cover_photo[0]}</Text>
              )}
            </View>
          </View>

          <View className="flex-row items-center mb-8 mt-2">
            <TermsAgreeCheckbox checked={acceptedTerms} onChange={setAcceptedTerms} />
          </View>

          <Button
            title={t('next_step', 'Next Step')}
            onPress={handleNext}
            loading={loading}
            disabled={loading}
          />
        </ScrollView>
      </View>
    </View>
  );
}
