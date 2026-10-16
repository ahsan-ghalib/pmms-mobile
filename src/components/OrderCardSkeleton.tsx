import React from 'react';
import { View } from 'react-native';

export function OrderCardSkeleton() {
  return (
    <View className="mb-4 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4">
      <View className="flex-row items-center">
        <View className="w-[112px] items-center">
          <View className="h-[76px] w-[76px] rounded-full bg-violet-100" />
          <View className="mt-2 h-2.5 w-16 rounded bg-sky-100" />
          <View className="mt-2 h-4 w-20 rounded bg-violet-200/70" />
        </View>
        <View className="flex-1 items-end">
          <View className="h-6 w-24 rounded-full bg-sky-100" />
          <View className="mt-4 h-4 w-32 rounded bg-violet-200/70" />
          <View className="mt-3 h-3 w-20 rounded bg-indigo-100" />
          <View className="mt-3 h-3 w-28 rounded bg-sky-100" />
        </View>
      </View>
      <View className="mt-4 h-px bg-slate-100" />
      <View className="mt-4 flex-row gap-3">
        <View className="h-12 flex-1 rounded-xl bg-indigo-100" />
        <View className="h-12 flex-1 rounded-xl bg-violet-100" />
      </View>
    </View>
  );
}
