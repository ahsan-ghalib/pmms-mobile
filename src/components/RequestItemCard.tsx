import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export type RequestType = 'Exchange' | 'Return';

export interface RequestItem {
  id: string;
  shopName: string;
  orderNumber: string;
  date: string;
  type: RequestType;
  status: string;
  imageUrl?: string;
}

interface RequestItemCardProps {
  request: RequestItem;
  onPress?: () => void;
}

export function RequestItemCard({ request, onPress }: RequestItemCardProps) {
  const { t } = useTranslation();

  const isReturn = request.type === 'Return';
  const typeBgColor = isReturn ? 'bg-red-400' : 'bg-[#5A8DFF]';

  let statusBgColor = 'bg-[#5A8DFF]'; // default blue
  if (request.status.toLowerCase().includes('completed')) {
    statusBgColor = 'bg-[#00B865]'; // green
  } else if (request.status.toLowerCase().includes('waiting')) {
    statusBgColor = 'bg-[#E38A36]'; // orange (matches vendor screenshot)
  } else if (
    request.status.toLowerCase().includes('approved') ||
    request.status.toLowerCase().includes('scheduled')
  ) {
    statusBgColor = 'bg-[#E38A36]'; // orange
  } else {
    statusBgColor = 'bg-[#E38A36]'; // default to orange
  }

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-2xl bg-white p-3 shadow-sm border border-gray-100"
    >
      {/* Image */}
      {request.imageUrl ? (
        <Image
          source={{ uri: request.imageUrl }}
          className="mr-3 h-[60px] w-[60px] rounded-xl bg-gray-100"
        />
      ) : (
        <View className="mr-3 h-[60px] w-[60px] items-center justify-center rounded-xl bg-gray-100 border border-gray-200">
          <Ionicons name="image-outline" size={24} color="#9CA3AF" />
        </View>
      )}

      {/* Info */}
      <View className="flex-1 justify-center">
        <Text className="font-bold text-[15px] text-gray-800" numberOfLines={1}>
          {request.shopName}
        </Text>
        <Text className="text-[13px] text-gray-500 mt-1">
          {t('order_label', 'Order')}: {request.orderNumber}
        </Text>
        <Text className="text-[12px] text-gray-400 mt-0.5">{request.date}</Text>
      </View>

      {/* Status Pills */}
      <View className="items-end justify-between h-[60px] py-1">
        <View className={`rounded-full px-3 py-1 ${typeBgColor}`}>
          <Text className="text-[11px] font-bold text-white">
            {t(request.type.toLowerCase(), request.type)}
          </Text>
        </View>
        <View className={`rounded-full px-3 py-1.5 ${statusBgColor}`}>
          <Text className="text-[10px] font-bold text-white">
            {t(request.status.toLowerCase().replace(/ /g, '_'), request.status)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
