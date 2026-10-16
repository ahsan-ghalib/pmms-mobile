import { Text } from './Text';

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ImageBackground } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LiveProfileAvatar } from './LiveProfileAvatar';
import { useIsRTL } from '../hooks/useIsRTL';

interface VideoCardProps {
  title: string;
  subtitle?: string;
  image: string;
  avatar?: string | null;
  isLive?: boolean;
  onPress: () => void;
  onPlayPress?: () => void;
  onStorePress?: () => void;
  onProfilePress?: () => void;
}

export function VideoCard({
  title,
  subtitle,
  image,
  avatar,
  isLive,
  onPress,
  onPlayPress,
  onStorePress,
  onProfilePress,
}: VideoCardProps) {
  const isRTL = useIsRTL();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="w-full h-64 rounded-3xl overflow-hidden"
    >
      <ImageBackground source={{ uri: image }} style={{ flex: 1 }} contentFit="cover">
        {isLive ? (
          <View className="absolute top-3 left-3 z-10 flex-row items-center rounded-md bg-[#E11D48] px-2 py-1">
            <View className="mr-1 h-1.5 w-1.5 rounded-full bg-white" />
            <Text className="text-[10px] font-bold uppercase tracking-wide text-white">Live</Text>
          </View>
        ) : null}

        <View
          className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center"
          pointerEvents="box-none"
        >
          <TouchableOpacity
            onPress={onPlayPress || onPress}
            className="h-14 w-14 rounded-full border border-white/30 bg-black/20 items-center justify-center"
          >
            <Ionicons
              name="play"
              size={24}
              color="#FFFFFF"
              style={isRTL ? { marginRight: 2 } : { marginLeft: 2 }}
            />
          </TouchableOpacity>
        </View>

        <View className="absolute bottom-0 left-0 right-0">
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']}>
            <View className="min-h-[88px] flex-row items-center px-4 pt-7 pb-4">
              <TouchableOpacity
                onPress={onProfilePress || onPress}
                className="flex-row items-center flex-1 min-w-0"
              >
                <View style={{ marginRight: 12 }}>
                  <LiveProfileAvatar
                    uri={avatar}
                    size={40}
                    isLive={Boolean(isLive)}
                    showBadge={false}
                    inactiveBorderWidth={1}
                    inactiveBorderColor="rgba(255, 255, 255, 0.5)"
                  />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-bold text-white mb-0.5" numberOfLines={1}>
                    {title}
                  </Text>
                  {subtitle && (
                    <Text className="text-xs text-gray-300" numberOfLines={2}>
                      {subtitle}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              {onStorePress && (
                <TouchableOpacity
                  onPress={onStorePress}
                  className="h-8 w-8 rounded-full bg-white/20 items-center justify-center ml-2"
                >
                  <Ionicons name="storefront" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}
