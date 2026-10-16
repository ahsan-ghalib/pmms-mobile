import React from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import MoneyAmount from './ui/MoneyAmount';
import { useProductCardMotion } from '../hooks/useProductCardMotion';

const RANK_COLORS = ['#0D9488', '#6366F1', '#0EA5E9', '#8E54E9', '#06B6D4', '#3B82F6'];

interface TopSellingProductCardProps {
  name: string;
  price: string;
  image: string;
  rank: number;
  soldLabel?: string;
  onPress: () => void;
  index?: number;
}

export function TopSellingProductCard({
  name,
  price,
  image,
  rank,
  soldLabel,
  onPress,
  index = 0,
}: TopSellingProductCardProps) {
  const badgeColor = RANK_COLORS[(Math.max(rank, 1) - 1) % RANK_COLORS.length];
  const { containerStyle, onPressIn, onPressOut } = useProductCardMotion(index);

  return (
    <Animated.View className="w-[176px] mr-3" style={containerStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        className="rounded-[22px] overflow-hidden bg-white"
        style={{
          shadowColor: badgeColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.14,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        <View className="h-[220px] relative bg-[#F3F0F8] overflow-hidden">
          <Image
            source={{ uri: image }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={image}
            transition={0}
          />
          <LinearGradient
            colors={['transparent', 'rgba(15,10,28,0.35)', 'rgba(15,10,28,0.88)']}
            locations={[0, 0.45, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '58%',
            }}
          />
          <View
            className="absolute top-2.5 left-2.5 flex-row items-center px-2 py-1 rounded-full"
            style={{ backgroundColor: badgeColor }}
          >
            <Ionicons name="flame" size={11} color="#FFFFFF" />
            <Text className="text-[10px] font-extrabold text-white ml-1">#{rank}</Text>
          </View>
          <View className="absolute bottom-3 left-2.5 right-2.5">
            <Text
              className="text-white text-[14px] font-extrabold"
              numberOfLines={2}
              style={{
                textShadowColor: 'rgba(0,0,0,0.45)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              {name}
            </Text>
            <View className="mt-1">
              <MoneyAmount
                amount={price}
                size={12}
                color="#A5F3FC"
                textStyle={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: '#A5F3FC',
                  textShadowColor: 'rgba(0,0,0,0.45)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                }}
                decimals={null}
              />
            </View>
            {soldLabel ? (
              <Text className="text-white/85 text-[10px] font-medium mt-0.5">{soldLabel}</Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
