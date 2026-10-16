import { Text } from '../Text';

import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function Checkbox({ label, checked, onChange, className = '' }: CheckboxProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onChange(!checked)}
      className={`flex-row items-center ${className}`}
    >
      <View
        className={`mr-3 h-6 w-6 items-center justify-center rounded-[6px] ${
          checked ? 'bg-[#8E54E9]' : 'border-[1.5px] border-gray-400 bg-white'
        }`}
      >
        {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
      <Text className="text-[16px] font-medium text-gray-500">{label}</Text>
    </TouchableOpacity>
  );
}
