import React, { useRef } from 'react';
import { Animated, Platform, Pressable, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import MoneyAmount from './ui/MoneyAmount';
import { useProductCardMotion } from '../hooks/useProductCardMotion';

interface RestaurantProductCardProps {
  name: string;
  price: string;
  rating: string;
  reviewCount?: string | number;
  image: string;
  addLabel: string;
  onPress: () => void;
  onAdd: (event?: any) => void;
  index?: number;
}

export function RestaurantProductCard({
  name,
  price,
  rating,
  reviewCount = 0,
  image,
  addLabel,
  onPress,
  onAdd,
  index = 0,
}: RestaurantProductCardProps) {
  const showRating = Number(rating) > 0;
  const cardRef = useRef<View>(null);
  const addPulse = useRef(new Animated.Value(1)).current;
  const { containerStyle, onPressIn, onPressOut } = useProductCardMotion(index);

  const handleAdd = (event?: any) => {
    addPulse.setValue(1);
    Animated.sequence([
      Animated.timing(addPulse, { toValue: 1.1, duration: 90, useNativeDriver: true }),
      Animated.spring(addPulse, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
    ]).start();

    if (cardRef.current) {
      cardRef.current.measureInWindow((x, y, width, height) => {
        onAdd({
          ...event,
          nativeEvent: event?.nativeEvent,
          layout: { x, y, width, height },
        });
      });
      return;
    }

    onAdd(event);
  };

  return (
    <Animated.View
      className={`${Platform.isPad ? 'w-[31%]' : 'w-[48%]'} mb-4`}
      style={containerStyle}
    >
      <View
        ref={cardRef}
        className="bg-white rounded-[22px] overflow-hidden"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
          borderWidth: 1,
          borderColor: '#EEF2FF',
          minHeight: 236,
        }}
      >
        <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
          <View className="relative h-36 bg-[#F3F0F8] items-center justify-center overflow-hidden">
            <Image
              source={{ uri: image }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={image}
              transition={0}
            />
            {showRating ? (
              <View className="absolute bottom-2 right-2 bg-[#EEF2FF] px-2 py-1 rounded-full flex-row items-center">
                <Text className="text-[10px] font-bold text-[#4338CA]">{rating}</Text>
                <Ionicons name="star" size={9} color="#6366F1" style={{ marginHorizontal: 2 }} />
                <Text className="text-[10px] font-bold text-[#4338CA]">{reviewCount}</Text>
              </View>
            ) : null}
          </View>

          <View className="px-3 pt-2.5">
            <Text
              className="text-sm font-bold text-gray-900"
              numberOfLines={2}
              style={{ minHeight: 40, lineHeight: 20 }}
            >
              {name}
            </Text>
          </View>
        </Pressable>

        <View
          className="px-3 pb-3 flex-row items-center justify-between"
          style={{ marginTop: 8, minHeight: 36, gap: 8 }}
        >
          <View className="flex-1" style={{ minWidth: 0 }}>
            <MoneyAmount
              amount={price}
              size={12}
              color="#0F766E"
              textStyle={{ fontSize: 14, fontWeight: '800', color: '#0F766E' }}
              decimals={null}
            />
          </View>
          <Animated.View style={{ transform: [{ scale: addPulse }], flexShrink: 0 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAdd}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="bg-[#EEF2FF] px-3 py-1.5 rounded-xl border border-[#C7D2FE]"
            >
              <Text className="text-[12px] font-extrabold text-[#4F46E5]">{addLabel}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}
