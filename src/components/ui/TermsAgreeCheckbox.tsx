import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '../Text';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

export function TermsAgreeCheckbox({ checked, onChange, className = '' }: Props) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isArabic = (i18n.language || '').startsWith('ar');

  return (
    <View
      className={`items-start ${className}`}
      style={{
        flexDirection: isArabic ? 'row-reverse' : 'row',
        direction: 'ltr',
      }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onChange(!checked)}
        className={`h-6 w-6 items-center justify-center rounded-[6px] ${
          checked ? 'bg-[#8E54E9]' : 'border-[1.5px] border-gray-400 bg-white'
        }`}
        style={{
          marginRight: isArabic ? 0 : 12,
          marginLeft: isArabic ? 12 : 0,
          marginTop: 2,
          flexShrink: 0,
        }}
      >
        {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
      </TouchableOpacity>
      <Text
        className="flex-1 text-[16px] font-medium text-gray-500"
        style={{ textAlign: isArabic ? 'right' : 'left' }}
      >
        {t('i_accept_the', 'I Accept the')}{' '}
        <Text
          className="font-bold text-[#8E54E9]"
          style={{ textDecorationLine: 'underline' }}
          onPress={() => router.push('/profile/TermsAndConditionsScreen')}
        >
          {t('terms_conditions', 'Terms & Conditions')}
        </Text>{' '}
        {t('and_conjunction', 'and')}{' '}
        <Text
          className="font-bold text-[#8E54E9]"
          style={{ textDecorationLine: 'underline' }}
          onPress={() => router.push('/profile/PrivacyPolicyScreen')}
        >
          {t('privacy_policy', 'Privacy Policy')}
        </Text>
      </Text>
    </View>
  );
}
