import { Text } from '../Text';

import React from 'react';
import { View } from 'react-native';

interface InfoRowProps {
  label: string;
  value: string;
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text className="text-sm text-gray-700">{label}</Text>
      <Text className="text-sm font-semibold text-gray-800">{value}</Text>
    </View>
  );
}
