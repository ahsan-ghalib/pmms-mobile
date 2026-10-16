import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface CustomNumpadProps {
  onPress: (val: string) => void;
  onBackspace: () => void;
}

export function CustomNumpad({ onPress, onBackspace }: CustomNumpadProps) {
  const padRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'backspace'],
  ];

  return (
    <View className="items-center w-full mt-4" style={{ direction: 'ltr' }}>
      {padRows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          className="flex-row justify-between w-[250px] mb-4"
          style={{ flexDirection: 'row', direction: 'ltr' }}
        >
          {row.map((item, colIndex) => {
            if (item === '') {
              return <View key={`empty-${colIndex}`} className="w-[60px] h-[60px]" />;
            }
            if (item === 'backspace') {
              return (
                <TouchableOpacity
                  key={`action-${colIndex}`}
                  onPress={onBackspace}
                  activeOpacity={0.7}
                  className="w-[60px] h-[60px] rounded-full items-center justify-center bg-gray-50 border border-gray-100"
                >
                  <Ionicons name="backspace-outline" size={24} color="#111827" />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={`btn-${item}`}
                onPress={() => onPress(item)}
                activeOpacity={0.7}
                className="w-[60px] h-[60px] rounded-full items-center justify-center bg-white border border-gray-100 shadow-sm"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 1,
                }}
              >
                <Text className="text-2xl text-gray-900 font-medium">{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}
