import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';

import { CustomInput as Input } from '../../components/ui/CustomInput';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { DocumentSourceSheet } from '../../components/ui/DocumentSourceSheet';
import { CustomDropdown, DropdownOption } from '../../components/ui/CustomDropdown';
import { RegistrationHeader } from '../../components/ui/RegistrationHeader';
import { AuthService } from '../../api/services/auth.service';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { digitsOnly, NUMERIC_KEYBOARD_PROPS } from '../../utils/numericKeyboard';

const DOC_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'];

function isPdfAsset(asset: any) {
  const mime = (asset?.mimeType || asset?.type || '').toLowerCase();
  const name = (asset?.name || asset?.fileName || asset?.uri || '').toLowerCase();
  return mime.includes('pdf') || name.endsWith('.pdf');
}

function buildUploadPart(asset: any, fallbackName: string) {
  const uri = asset.uri;
  const name = asset.name || asset.fileName || fallbackName;
  const mimeType = asset.mimeType || (isPdfAsset(asset) ? 'application/pdf' : 'image/jpeg');
  return { uri, name, type: mimeType } as any;
}

export default function JoinUsBusinessStep({ onNext }: { onNext: () => void }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const router = useRouter();
  const { login, user } = useAuth();

  const [crNumber, setCrNumber] = useState('');
  const [isVatRegistered, setIsVatRegistered] = useState(false);
  const [vatNumber, setVatNumber] = useState('');

  const [banks, setBanks] = useState<DropdownOption[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string | number>('');
  const [ibanNumber, setIbanNumber] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const [commercialLicense, setCommercialLicense] = useState<any>(null);
  const [nationalIdFront, setNationalIdFront] = useState<any>(null);
  const [nationalIdBack, setNationalIdBack] = useState<any>(null);
  const [vatCertificate, setVatCertificate] = useState<any>(null);
  const [ibanCertificate, setIbanCertificate] = useState<any>(null);
  const [uploadSetter, setUploadSetter] = useState<((file: any) => void) | null>(null);
  const uploadSetterRef = useRef<((file: any) => void) | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const response = await apiClient.get(ENDPOINTS.DISCOVER.BANKS);
      const items = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];
      setBanks(
        items.map((b: any) => ({
          id: b.id,
          label: isArabic
            ? b.name_ar || b.name_arabic || b.name
            : b.name || b.name_ar || b.name_arabic,
        })),
      );
    } catch (error) {
      console.error('Failed to fetch banks:', error);
    }
  };

  const applyPickedAsset = (setFile: (file: any) => void, asset: any) => {
    const mime = (asset.mimeType || asset.type || '').toLowerCase();
    const name = (asset.name || asset.fileName || asset.uri || '').toLowerCase();
    const allowed =
      mime.startsWith('image/') ||
      mime === 'application/pdf' ||
      name.endsWith('.pdf') ||
      /\.(jpe?g|png|gif|webp|heic)$/i.test(name);

    if (!allowed) {
      Alert.alert(
        t('error', 'Error'),
        t('invalid_document_type', 'Please select an image or PDF file.'),
      );
      return;
    }

    setFile({
      ...asset,
      name: asset.name || asset.fileName || (isPdfAsset(asset) ? 'document.pdf' : 'image.jpg'),
      mimeType: asset.mimeType || (isPdfAsset(asset) ? 'application/pdf' : 'image/jpeg'),
    });
  };

  const pickFromGallery = async (setFile: (file: any) => void) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(t('permission_required', 'Permission to access gallery is required!'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        applyPickedAsset(setFile, result.assets[0]);
      }
    } catch (error) {
      console.error('Failed to pick gallery image:', error);
      Alert.alert(
        t('error', 'Error'),
        t('document_pick_failed', 'Unable to open file picker. Please try again.'),
      );
    }
  };

  const pickDocument = async (setFile: (file: any) => void) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: DOC_MIME_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        applyPickedAsset(setFile, result.assets[0]);
      }
    } catch (error) {
      console.error('Failed to pick document:', error);
      Alert.alert(
        t('error', 'Error'),
        t('document_pick_failed', 'Unable to open file picker. Please try again.'),
      );
    }
  };

  const handleNext = async () => {
    if (!crNumber) {
      Alert.alert(
        t('error'),
        t('cr_number_required', 'Commercial Registration Number is required'),
      );
      return;
    }
    if (!selectedBankId || !ibanNumber) {
      Alert.alert(t('error'), t('bank_iban_required', 'Bank and IBAN details are required'));
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('commercial_registration_number', crNumber);
      formData.append('is_vat_registered', isVatRegistered ? '1' : '0');
      if (isVatRegistered && vatNumber) {
        formData.append('vat_number', vatNumber);
      }
      formData.append('bank_id', selectedBankId.toString());
      formData.append('iban_number', ibanNumber);
      formData.append('account_title', accountTitle);
      formData.append('account_number', accountNumber);

      if (commercialLicense) {
        formData.append(
          'commercial_license_file',
          buildUploadPart(commercialLicense, 'license.jpg'),
        );
      }
      if (nationalIdFront) {
        formData.append('national_id_front_file', buildUploadPart(nationalIdFront, 'id_front.jpg'));
      }
      if (nationalIdBack) {
        formData.append('national_id_back_file', buildUploadPart(nationalIdBack, 'id_back.jpg'));
      }
      if (vatCertificate) {
        formData.append('vat_certificate_file', buildUploadPart(vatCertificate, 'vat.jpg'));
      }
      if (ibanCertificate) {
        formData.append('iban_certificate_file', buildUploadPart(ibanCertificate, 'iban.jpg'));
      }

      const response: any = await AuthService.updateBusinessInfo(formData);
      if (response && response.vendor) {
        const storageObj = require('../../storage/storage').default;
        const token = await storageObj.getToken();

        if (user && token) {
          const updatedUser = { ...user, vendor: response.vendor };
          await login(token, updatedUser);
        } else if (token) {
          await login(token);
        }
        onNext();
      }
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || t('error_occurred', 'An error occurred');
      Alert.alert(t('error'), message);
    } finally {
      setLoading(false);
    }
  };

  const renderUploadBox = (label: string, state: any, setState: any) => (
    <View className="mb-6">
      <Text
        className="font-semibold text-[#111827] mb-2"
        style={{ fontFamily: isArabic ? 'PlaypenSansArabic_600SemiBold' : 'Inter_600SemiBold' }}
      >
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => {
          uploadSetterRef.current = setState;
          setUploadSetter(() => setState);
        }}
        activeOpacity={0.8}
        className="h-32 border-2 border-dashed border-gray-300 rounded-2xl items-center justify-center bg-gray-50"
      >
        {state ? (
          <View className="w-full h-full relative">
            {isPdfAsset(state) ? (
              <View className="flex-1 items-center justify-center px-4">
                <Ionicons name="document-text" size={36} color="#8E54E9" />
                <Text
                  className="text-xs font-medium text-gray-600 mt-2 text-center"
                  numberOfLines={2}
                >
                  {state.name || 'document.pdf'}
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: state.uri }}
                className="w-full h-full rounded-2xl"
                resizeMode="cover"
              />
            )}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setState(null);
              }}
              className="absolute top-2 right-2 bg-black/50 w-8 h-8 rounded-full items-center justify-center"
            >
              <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="items-center">
            <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />
            <Text className="text-sm font-medium text-gray-500 mt-2">
              {t('tap_to_upload', 'Tap to upload or drag')}
            </Text>
            <Text className="text-xs text-gray-400 mt-1">
              {t('gallery_or_files', 'Gallery or Files · PDF or image')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

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
            {t('business_info', 'Commercial Information')}
          </Text>
          <Text
            className="text-sm text-gray-500 mb-6"
            style={{ fontFamily: isArabic ? 'PlaypenSansArabic_400Regular' : 'Inter_400Regular' }}
          >
            {t('step_3_desc', 'Provide your legal and banking details.')}
          </Text>

          {/* Registration Info Card */}
          <View
            className="mb-6 rounded-[24px] bg-white p-5"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            <View className="mb-4">
              <Input
                label={t('cr_number', 'Commercial Registration Number *')}
                placeholder={t('enter_cr_number', 'Enter CR Number')}
                icon="briefcase-outline"
                value={crNumber}
                onChangeText={setCrNumber}
              />
            </View>

            <View className="mb-4 mt-2">
              <Checkbox
                label={t('is_vat_registered', 'Are you VAT Registered?')}
                checked={isVatRegistered}
                onChange={setIsVatRegistered}
              />
              <Text
                className="text-xs text-gray-400 mt-1"
                style={{ [isArabic ? 'marginRight' : 'marginLeft']: 32 }}
              >
                {t('vat_desc', 'Turn on if you have a VAT Number')}
              </Text>
            </View>

            {isVatRegistered && (
              <View className="mb-2">
                <Input
                  label={t('vat_number', 'VAT Number *')}
                  placeholder={t('enter_vat_number', 'Enter VAT Number')}
                  icon="document-text-outline"
                  value={vatNumber}
                  onChangeText={setVatNumber}
                />
              </View>
            )}
          </View>

          {/* Bank Details Card */}
          <View
            className="mb-6 rounded-[24px] bg-white p-5"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            <Text
              className="text-lg font-bold text-[#111827] mb-4"
              style={{ fontFamily: isArabic ? 'PlaypenSansArabic_700Bold' : 'Inter_700Bold' }}
            >
              {t('bank_details', 'Bank Details')}
            </Text>
            <View className="space-y-4">
              <CustomDropdown
                label={t('bank_id', 'Bank *')}
                placeholder={t('select_bank', 'Select Bank')}
                value={selectedBankId}
                options={banks}
                onSelect={(opt) => setSelectedBankId(opt.id)}
              />
              <Input
                label={t('iban_number', 'IBAN Number *')}
                placeholder={t('iban_number', 'Enter IBAN Number')}
                icon="card-outline"
                value={ibanNumber}
                onChangeText={setIbanNumber}
              />
              <Input
                label={t('account_title', 'Account Title (Optional)')}
                placeholder={t('enter_account_title', 'Enter Account Title')}
                icon="person-outline"
                value={accountTitle}
                onChangeText={setAccountTitle}
              />
              <Input
                label={t('account_number', 'Account Number (Optional)')}
                placeholder={t('enter_account_number', 'Enter Account Number')}
                icon="calculator-outline"
                value={accountNumber}
                onChangeText={(text) => setAccountNumber(digitsOnly(text))}
                {...NUMERIC_KEYBOARD_PROPS}
              />
            </View>
          </View>

          {/* Documents Card */}
          <View
            className="mb-6 rounded-[24px] bg-white p-5"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            <Text
              className="text-lg font-bold text-[#111827] mb-4"
              style={{ fontFamily: isArabic ? 'PlaypenSansArabic_700Bold' : 'Inter_700Bold' }}
            >
              {t('documents', 'Documents')}
            </Text>
            {renderUploadBox(
              t('commercial_license', 'Commercial License'),
              commercialLicense,
              setCommercialLicense,
            )}
            {renderUploadBox(
              t('national_id_front', 'National ID (Front)'),
              nationalIdFront,
              setNationalIdFront,
            )}
            {renderUploadBox(
              t('national_id_back', 'National ID (Back)'),
              nationalIdBack,
              setNationalIdBack,
            )}
            {isVatRegistered &&
              renderUploadBox(
                t('vat_certificate', 'VAT Certificate'),
                vatCertificate,
                setVatCertificate,
              )}
            {renderUploadBox(
              t('iban_certificate', 'IBAN Certificate'),
              ibanCertificate,
              setIbanCertificate,
            )}
          </View>

          <View className="mt-2">
            <Button
              title={t('next_step', 'Next Step')}
              onPress={handleNext}
              loading={loading}
              disabled={loading}
            />
          </View>
        </ScrollView>
      </View>

      <DocumentSourceSheet
        visible={!!uploadSetter}
        onClose={() => setUploadSetter(null)}
        onPickGallery={() => {
          const setFile = uploadSetterRef.current;
          uploadSetterRef.current = null;
          setUploadSetter(null);
          if (setFile) void pickFromGallery(setFile);
        }}
        onPickFiles={() => {
          const setFile = uploadSetterRef.current;
          uploadSetterRef.current = null;
          setUploadSetter(null);
          if (setFile) void pickDocument(setFile);
        }}
      />
    </View>
  );
}
