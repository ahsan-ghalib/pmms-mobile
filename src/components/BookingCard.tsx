import { Text } from './Text';

import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StatusIcon } from './StatusIcon';

export interface BookingCardProps {
  booking: {
    id: string;
    name?: string;
    products?: number;
    tracking?: string;
    date: string;
    status: string;
    icon: keyof typeof Ionicons.glyphMap;
    imageSource?: any;
    pulse?: boolean;
  };
  theme: {
    cardBg?: string;
    bg?: string;
    icon: string;
    text: string;
    border?: string;
    gradient?: [string, string, string];
  };
  statusLabel?: string;
  onPress: () => void;
}

const DEFAULT_GRADIENT: [string, string, string] = ['#F3EEFF', '#FFF4E8', '#FFE9E4'];

export function BookingCard({ booking, theme, statusLabel, onPress }: BookingCardProps) {
  const { t } = useTranslation();
  const defaultStatusLabel = t('booking_status', 'Booking Status');
  const accent = theme.border || theme.icon;
  const gradient = theme.gradient || DEFAULT_GRADIENT;

  return (
    <Pressable
      onPress={onPress}
      className="mb-4 overflow-hidden rounded-[28px]"
      style={{
        borderColor: accent,
        borderWidth: 1.25,
        shadowColor: theme.icon,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
        elevation: 3,
      }}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        locations={[0, 0.48, 1]}
        style={{ borderRadius: 27 }}
      >
        <View className="flex-row items-center p-4">
          <View className="w-[112px] items-center me-3">
            <StatusIcon
              color={theme.icon}
              icon={booking.icon as any}
              imageSource={booking.imageSource}
              pulse={booking.pulse}
            />
            <Text className="mt-2 text-[10px] text-gray-400">
              {statusLabel || defaultStatusLabel}
            </Text>
            <Text
              className="text-base font-bold text-center capitalize"
              style={{ color: theme.text }}
            >
              {booking.status}
            </Text>
          </View>

          <View className="flex-1 items-end">
            <View
              className="rounded-full bg-white/90 px-3 py-1"
              style={{
                borderWidth: 1,
                borderColor: `${theme.icon}22`,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Text className="text-[11px] font-semibold text-gray-700">
                {booking.tracking || booking.id}
              </Text>
            </View>

            {booking.name ? (
              <View className="mt-3 flex-row items-center">
                <Ionicons name="business-outline" size={14} color="#9CA3AF" />
                <Text className="text-sm text-gray-700 ms-1.5">{booking.name}</Text>
              </View>
            ) : (
              <View className="mt-3 flex-row items-center">
                <Text className="text-sm font-bold text-[#8E54E9]">
                  {t('order_id', 'Order ID:')} {booking.id}
                </Text>
              </View>
            )}

            {booking.products !== undefined && (
              <View className="mt-2 flex-row items-center">
                <Ionicons name="cube-outline" size={14} color="#9CA3AF" />
                <Text className="text-sm text-gray-600 ms-1.5">
                  {booking.products} {t('products_count', 'Products')}
                </Text>
              </View>
            )}

            <View className="mt-2 flex-row items-center">
              <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
              <Text className="text-xs text-gray-500 ms-1">{booking.date}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
