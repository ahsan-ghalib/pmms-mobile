import { Text } from './Text';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  Platform,
  Pressable,
  Text as RNText,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import MoneyAmount from './ui/MoneyAmount';
import { buildVendorAccent, VendorAccent } from '../utils/vendorAccent';
import { usePopScale, useProductCardMotion } from '../hooks/useProductCardMotion';
import { useIsRTL } from '../hooks/useIsRTL';

/** Matches frontend product crop: cropWidth={1248} cropHeight={798} */
const PRODUCT_IMAGE_ASPECT = 1248 / 798;
const ADD_BTN_SIZE = 32;

interface ProductCardProps {
  name: string;
  price: string;
  rating: string;
  customizable: boolean;
  image: string;
  onPress: () => void;
  cartQuantity?: number;
  onIncrement?: (event?: any) => void;
  onDecrement?: () => void;
  accent?: VendorAccent;
  index?: number;
  /** Hex color swatches for color variants (e.g. ["#111827", "#EF4444"]) */
  colors?: string[];
}

export function ProductCard({
  name,
  price,
  rating,
  customizable,
  image,
  onPress,
  cartQuantity = 0,
  onIncrement,
  onDecrement,
  accent: accentProp,
  index = 0,
  colors = [],
}: ProductCardProps) {
  const accent = useMemo(() => accentProp ?? buildVendorAccent(null), [accentProp]);
  const isRTL = useIsRTL();
  const showRating = Number(rating) > 0;
  const [isExpanded, setIsExpanded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<View>(null);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const addPulse = useRef(new Animated.Value(1)).current;
  const flyAway = useRef(new Animated.Value(1)).current;
  const qtyPop = usePopScale(cartQuantity);
  const { containerStyle, onPressIn, onPressOut } = useProductCardMotion(index);

  const emitIncrement = (event?: any) => {
    flyAway.setValue(1);
    Animated.sequence([
      Animated.timing(flyAway, { toValue: 0.92, duration: 90, useNativeDriver: true }),
      Animated.spring(flyAway, { toValue: 1, useNativeDriver: true, speed: 28, bounciness: 7 }),
    ]).start();

    if (cardRef.current) {
      cardRef.current.measureInWindow((x, y, width, height) => {
        onIncrement?.({
          ...event,
          nativeEvent: event?.nativeEvent,
          layout: { x, y, width, height },
        });
      });
      return;
    }

    onIncrement?.(event);
  };

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [expandAnim, isExpanded]);

  const startCollapseTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 3000);
  };

  useEffect(() => {
    if (cartQuantity === 0 && isExpanded) {
      setIsExpanded(false);
    }
  }, [cartQuantity]);

  useEffect(() => {
    if (isExpanded) {
      startCollapseTimer();
    } else if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isExpanded, cartQuantity]);

  const pulseAddControl = () => {
    addPulse.setValue(1);
    Animated.sequence([
      Animated.timing(addPulse, { toValue: 1.12, duration: 90, useNativeDriver: true }),
      Animated.spring(addPulse, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
    ]).start();
  };

  const handleExpand = (event?: any) => {
    pulseAddControl();
    if (cartQuantity === 0) {
      emitIncrement(event);
    }
    setIsExpanded(true);
  };

  const handleIncrement = (event?: any) => {
    pulseAddControl();
    startCollapseTimer();
    emitIncrement(event);
  };

  const handleDecrement = () => {
    startCollapseTimer();
    onDecrement?.();
  };

  const containerWidth = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [ADD_BTN_SIZE, 92],
  });

  const collapsedOpacity = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const addControl = (
    <Animated.View
      style={{
        width: containerWidth,
        height: ADD_BTN_SIZE,
        borderRadius: ADD_BTN_SIZE / 2,
        backgroundColor: accent.primary,
        overflow: 'hidden',
        shadowColor: accent.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.28,
        shadowRadius: 5,
        elevation: 4,
        flexShrink: 0,
      }}
    >
      <Animated.View style={{ flex: 1, transform: [{ scale: addPulse }] }}>
        <Animated.View
          style={{
            opacity: expandAnim,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 2,
          }}
          pointerEvents={isExpanded ? 'auto' : 'none'}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleDecrement}
            hitSlop={6}
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.15)',
            }}
          >
            <Ionicons
              name={cartQuantity === 1 ? 'trash-outline' : 'remove'}
              size={14}
              color="#fff"
            />
          </TouchableOpacity>
          <View
            style={{
              flex: 1,
              height: ADD_BTN_SIZE,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.View style={{ transform: [{ scale: qtyPop }] }}>
              <RNText
                style={{
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: '800',
                  fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium' }),
                  textAlign: 'center',
                  lineHeight: 16,
                  includeFontPadding: false,
                  textAlignVertical: 'center',
                  ...(Platform.OS === 'android' ? { marginTop: 1 } : { paddingTop: 1 }),
                }}
              >
                {cartQuantity}
              </RNText>
            </Animated.View>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleIncrement}
            hitSlop={6}
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.15)',
            }}
          >
            <Ionicons name="add" size={14} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={{
            opacity: collapsedOpacity,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          pointerEvents={isExpanded ? 'none' : 'auto'}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleExpand}
            className="h-full w-full items-center justify-center"
          >
            {cartQuantity > 0 ? (
              <Animated.View style={{ transform: [{ scale: qtyPop }] }}>
                <RNText
                  style={{
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: '800',
                    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium' }),
                    textAlign: 'center',
                    lineHeight: 16,
                    includeFontPadding: false,
                    textAlignVertical: 'center',
                    ...(Platform.OS === 'android' ? { marginTop: 1 } : { paddingTop: 1 }),
                  }}
                >
                  {cartQuantity}
                </RNText>
              </Animated.View>
            ) : (
              <Ionicons name="add" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );

  return (
    <Animated.View
      ref={cardRef}
      className={`${Platform.isPad ? 'w-[31%]' : 'w-[48%]'} mb-3.5`}
      style={containerStyle}
    >
      <Animated.View style={{ transform: [{ scale: flyAway }] }}>
        <View
          className="overflow-hidden rounded-[22px] bg-white"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
            <View
              className="relative w-full overflow-hidden"
              style={{ aspectRatio: PRODUCT_IMAGE_ASPECT, backgroundColor: '#F3F0F8' }}
            >
              <Image
                source={{ uri: image }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={image}
                transition={0}
              />

              {showRating ? (
                <View
                  className="absolute flex-row items-center rounded-full px-2 py-0.5"
                  style={{
                    top: 10,
                    ...(isRTL ? { left: 10 } : { right: 10 }),
                    backgroundColor: accent.primarySoft,
                    direction: 'ltr',
                  }}
                >
                  <Ionicons name="star" size={10} color={accent.primary} />
                  <Text
                    className="ml-0.5 text-[10px] font-bold"
                    style={{ color: accent.primaryDark }}
                  >
                    {rating}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="pt-2" style={{ paddingHorizontal: 12 }}>
              <Text
                className="text-[13px] font-bold text-[#1A1A1A]"
                numberOfLines={2}
                style={{
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                  lineHeight: 17,
                  height: 34,
                }}
              >
                {name}
              </Text>

              {customizable ? (
                <Text
                  className="mt-0.5 text-[10px] font-semibold"
                  style={{ color: accent.primary, textAlign: isRTL ? 'right' : 'left' }}
                  numberOfLines={1}
                >
                  Customizable
                </Text>
              ) : null}

              {colors.length > 0 ? (
                <View
                  className="mt-1 flex-row items-center"
                  style={{
                    direction: 'ltr',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignSelf: isRTL ? 'flex-end' : 'flex-start',
                  }}
                >
                  {colors.slice(0, 6).map((hex, colorIndex) => {
                    const isLight =
                      hex.toUpperCase() === '#FFFFFF' ||
                      hex.toUpperCase() === '#FFFDD0' ||
                      hex.toUpperCase() === '#FFFFF0' ||
                      hex.toUpperCase() === '#F5F5DC';

                    return (
                      <View
                        key={`${hex}-${colorIndex}`}
                        style={{
                          width: 15,
                          height: 15,
                          borderRadius: 8,
                          backgroundColor: hex,
                          borderWidth: 1.5,
                          borderColor: isLight ? '#D1D5DB' : '#FFFFFF',
                          marginLeft: isRTL ? 0 : colorIndex === 0 ? 0 : -4,
                          marginRight: isRTL ? (colorIndex === 0 ? 0 : -4) : 0,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.14,
                          shadowRadius: 1.5,
                          elevation: 1,
                          zIndex: colors.length - colorIndex,
                        }}
                      />
                    );
                  })}
                  {colors.length > 6 ? (
                    <Text
                      className="text-[10px] font-bold"
                      style={{
                        color: accent.primaryDark,
                        marginLeft: isRTL ? 0 : 6,
                        marginRight: isRTL ? 6 : 0,
                      }}
                    >
                      +{colors.length - 6}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          </Pressable>

          {/* Card end: price + add/qty control */}
          <View
            style={{
              direction: 'ltr',
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 12,
              paddingTop: 8,
              paddingBottom: 10,
              gap: 8,
            }}
          >
            <View style={{ flex: 1, minWidth: 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <MoneyAmount
                amount={price}
                size={12}
                color={accent.primary}
                textStyle={{ fontSize: 15, fontWeight: '800', color: accent.primaryDark }}
                decimals={null}
              />
            </View>
            {addControl}
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
