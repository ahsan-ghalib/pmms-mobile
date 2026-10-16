import React from 'react';
import { Alert, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Text } from '../Text';

interface Props {
  step: number;
  totalSteps?: number;
  onBack?: () => void;
  showBack?: boolean;
}

export function RegistrationHeader({ step, totalSteps = 3, onBack, showBack = false }: Props) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { logout } = useAuth();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };
  const confirmLogout = () =>
    Alert.alert(
      t('logout_confirm_title', 'Logout'),
      t('logout_confirm_message', 'Are you sure you want to logout of your account?'),
      [
        { text: t('cancel', 'Cancel'), style: 'cancel' },
        { text: t('yes', 'Yes'), style: 'destructive', onPress: logout },
      ],
    );

  return (
    <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
      <View className="flex-row items-center gap-3">
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.8}
            className="w-10 h-10 items-center justify-center rounded-xl bg-gray-50"
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
        )}
        <View>
          <Text
            className="text-sm font-semibold text-gray-500"
            style={{ fontFamily: isArabic ? 'PlaypenSansArabic_600SemiBold' : 'Inter_600SemiBold' }}
          >
            {t('step_x_of_y', { step, totalSteps, defaultValue: `Step ${step} of ${totalSteps}` })}
          </Text>
          <View className="flex-row gap-1 mt-1">
            {[...Array(totalSteps)].map((_, i) => (
              <View
                key={i}
                className={`h-1.5 w-8 rounded-full ${i < step ? 'bg-[#8E54E9]' : 'bg-gray-200'}`}
              />
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={confirmLogout}
        activeOpacity={0.8}
        className="flex-row items-center gap-1 px-3 py-2 rounded-xl bg-red-50"
      >
        <Ionicons name="log-out-outline" size={16} color="#EF4444" />
        <Text
          className="text-xs font-semibold text-red-500"
          style={{ fontFamily: isArabic ? 'PlaypenSansArabic_600SemiBold' : 'Inter_600SemiBold' }}
        >
          {t('logout', 'Logout')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
