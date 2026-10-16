import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Toast, { BaseToastProps, ToastConfig } from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { playNotificationSound } from '../utils/playToastSound';
import type { NotificationSoundKey } from '../utils/notificationSounds';
import { DEFAULT_NOTIFICATION_SOUND } from '../utils/notificationSounds';

type Tone = 'success' | 'info' | 'error';

const TONE: Record<
  Tone,
  {
    bg: string;
    border: string;
    iconBg: string;
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
  }
> = {
  success: {
    bg: '#FFFFFF',
    border: '#E2E8F0',
    iconBg: '#16A34A',
    icon: 'checkmark-circle',
    accent: '#15803D',
  },
  info: {
    bg: '#FFFFFF',
    border: '#E2E8F0',
    iconBg: '#6D2DE2',
    icon: 'notifications',
    accent: '#5B21B6',
  },
  error: {
    bg: '#FFFFFF',
    border: '#E2E8F0',
    iconBg: '#E11D48',
    icon: 'close-circle',
    accent: '#BE123C',
  },
};

const ICON_SIZE = 44;
const PILL_PAD = 6;
const COLLAPSED_WIDTH = ICON_SIZE + PILL_PAD * 2;
const TEXT_SLOT_WIDTH = 270;
const MAX_PILL_WIDTH = COLLAPSED_WIDTH + TEXT_SLOT_WIDTH;

/** Icon stays as a circle in the center this long, then the pill opens */
const ICON_HOLD_MS = 650;
const OPEN_MS = 480;

function WhatsAppStyleToast({
  tone,
  text1,
  text2,
  isVisible,
  animKey,
}: {
  tone: Tone;
  text1?: string;
  text2?: string;
  isVisible?: boolean;
  animKey?: number | string;
}) {
  const theme = TONE[tone];
  const iconPop = useSharedValue(0);
  const expand = useSharedValue(0);
  const textReveal = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(iconPop);
    cancelAnimation(expand);
    cancelAnimation(textReveal);

    // Reset every time toast becomes visible / remounts
    iconPop.value = 0;
    expand.value = 0;
    textReveal.value = 0;

    if (!isVisible) return;

    // 1) Icon pops into center
    iconPop.value = withSpring(1, {
      damping: 11,
      stiffness: 170,
      mass: 0.65,
    });

    // 2) Hold as a circle, then open the pill
    expand.value = withDelay(
      ICON_HOLD_MS,
      withTiming(1, {
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // 3) Text fades in mid-open
    textReveal.value = withDelay(
      ICON_HOLD_MS + 140,
      withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [isVisible, animKey, text1, text2]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(iconPop.value, [0, 1], [0.15, 1]) },
      { rotate: `${interpolate(iconPop.value, [0, 1], [-28, 0])}deg` },
    ],
    opacity: interpolate(iconPop.value, [0, 0.4, 1], [0, 1, 1]),
  }));

  const pillStyle = useAnimatedStyle(() => {
    const width = COLLAPSED_WIDTH + (MAX_PILL_WIDTH - COLLAPSED_WIDTH) * expand.value;
    return {
      width,
      opacity: interpolate(iconPop.value, [0, 0.2, 1], [0, 1, 1]),
      transform: [
        {
          translateY: interpolate(iconPop.value, [0, 1], [-22, 0]),
        },
      ],
    };
  });

  const textSlotStyle = useAnimatedStyle(() => ({
    width: TEXT_SLOT_WIDTH * expand.value,
    opacity: textReveal.value,
    transform: [
      {
        translateX: interpolate(textReveal.value, [0, 1], [-10, 0]),
      },
    ],
  }));

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: theme.bg,
            borderColor: theme.border,
            width: COLLAPSED_WIDTH,
          },
          pillStyle,
        ]}
      >
        <Animated.View style={[styles.iconWrap, { backgroundColor: theme.iconBg }, iconStyle]}>
          <Ionicons name={theme.icon} size={24} color="#FFFFFF" />
        </Animated.View>

        <Animated.View style={[styles.textSlot, textSlotStyle]}>
          <View style={styles.copy}>
            <Text style={[styles.title, { color: theme.accent }]} numberOfLines={1}>
              {text1}
            </Text>
            {!!text2 && (
              <Text style={styles.subtitle} numberOfLines={2}>
                {text2}
              </Text>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function makeToast(tone: Tone) {
  return ({ text1, text2, isVisible, props }: BaseToastProps) => (
    <WhatsAppStyleToast
      key={String(props?.animKey ?? `${tone}-${text1}`)}
      tone={tone}
      text1={text1}
      text2={text2}
      isVisible={isVisible}
      animKey={props?.animKey}
    />
  );
}

export const orderStatusToastConfig: ToastConfig = {
  success: makeToast('success'),
  info: makeToast('info'),
  error: makeToast('error'),
  orderSuccess: makeToast('success'),
  orderInfo: makeToast('info'),
  orderError: makeToast('error'),
};

export function showOrderStatusToast(input: {
  type: Tone;
  title: string;
  message: string;
  sound?: NotificationSoundKey;
}) {
  playNotificationSound(input.sound ?? DEFAULT_NOTIFICATION_SOUND);
  Toast.show({
    type: input.type,
    text1: input.title,
    text2: input.message,
    position: 'top',
    visibilityTime: 4800,
    topOffset: 52,
    // Instant container show so OUR center→open animation is what you see
    animationConfig: {
      enter: { type: 'timing', duration: 1 },
      exit: { type: 'timing', duration: 220 },
    },
    props: { animKey: Date.now() },
  });
}

export function OrderStatusToastHost() {
  const insets = useSafeAreaInsets();
  return (
    <Toast
      config={orderStatusToastConfig}
      position="top"
      topOffset={Math.max(insets.top + 8, 52)}
      visibilityTime={4800}
      animationConfig={{
        enter: { type: 'timing', duration: 1 },
        exit: { type: 'timing', duration: 220 },
      }}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: '100%',
    zIndex: 9999,
  },
  pill: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: 1,
    elevation: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    paddingHorizontal: PILL_PAD,
    paddingVertical: PILL_PAD,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: ICON_SIZE / 2,
    height: ICON_SIZE,
    justifyContent: 'center',
    width: ICON_SIZE,
  },
  textSlot: {
    overflow: 'hidden',
  },
  copy: {
    paddingEnd: 12,
    paddingStart: 10,
    paddingVertical: 2,
    width: TEXT_SLOT_WIDTH,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 1,
  },
});
