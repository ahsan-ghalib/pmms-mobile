import React from 'react';
import { View } from 'react-native';

const SHAPE = '#E8E4F0';
const SURFACE = '#F5F3F8';

export function VideoCardSkeleton() {
  return (
    <View
      className="w-full h-64 rounded-3xl overflow-hidden bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: SURFACE }}>
        <View className="h-14 w-14 rounded-full" style={{ backgroundColor: SHAPE }} />
      </View>
      <View className="px-4 py-4 flex-row items-center bg-white">
        <View className="h-10 w-10 rounded-full mr-3" style={{ backgroundColor: SHAPE }} />
        <View className="flex-1">
          <View className="h-3 rounded-full mb-2 w-[85%]" style={{ backgroundColor: SHAPE }} />
          <View className="h-3 rounded-full w-[55%]" style={{ backgroundColor: SHAPE }} />
        </View>
      </View>
    </View>
  );
}
