import React, { useEffect } from 'react';
import { View, Modal, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Text } from '../Text';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// A simple particle component for the confetti effect
const Particle = ({ angle, delay, color }: { angle: number; delay: number; color: string }) => {
  const distance = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    distance.value = withDelay(
      delay,
      withTiming(80, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
    opacity.value = withDelay(
      delay,
      withSequence(withTiming(1, { duration: 100 }), withTiming(0, { duration: 500 })),
    );
    scale.value = withDelay(
      delay,
      withSequence(withTiming(1, { duration: 200 }), withTiming(0.5, { duration: 400 })),
    );
  }, [delay]);

  const style = useAnimatedStyle(() => {
    const rad = (angle * Math.PI) / 180;
    const tx = Math.cos(rad) * distance.value;
    const ty = Math.sin(rad) * distance.value;
    return {
      opacity: opacity.value,
      transform: [{ translateX: tx }, { translateY: ty }, { scale: scale.value }],
    };
  });

  return <Animated.View style={[styles.particle, { backgroundColor: color }, style]} />;
};

interface ThankYouPopupProps {
  visible: boolean;
}

export default function ThankYouPopup({ visible }: ThankYouPopupProps) {
  const { t } = useTranslation();

  const bgOpacity = useSharedValue(0);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);
  const iconScale = useSharedValue(0);

  // Text stagger animation
  const textTitleY = useSharedValue(20);
  const textTitleOpacity = useSharedValue(0);
  const textSubY = useSharedValue(20);
  const textSubOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Reset values
      bgOpacity.value = 0;
      translateY.value = SCREEN_HEIGHT;
      iconScale.value = 0;
      pulseScale.value = 1;
      pulseOpacity.value = 0.6;
      textTitleY.value = 20;
      textTitleOpacity.value = 0;
      textSubY.value = 20;
      textSubOpacity.value = 0;

      // Animate background overlay
      bgOpacity.value = withTiming(1, { duration: 300 });

      // Slide up the popup from the bottom
      translateY.value = withSpring(0, { damping: 14, stiffness: 90, mass: 0.8 });

      // Animate the main icon pop (very bouncy)
      iconScale.value = withDelay(400, withSpring(1, { damping: 8, stiffness: 150 }));

      // Continuous pulse animation behind the icon
      pulseScale.value = withDelay(
        700,
        withRepeat(
          withSequence(withTiming(1.8, { duration: 1200 }), withTiming(1, { duration: 0 })),
          -1,
          false,
        ),
      );

      pulseOpacity.value = withDelay(
        700,
        withRepeat(
          withSequence(withTiming(0, { duration: 1200 }), withTiming(0.6, { duration: 0 })),
          -1,
          false,
        ),
      );

      // Stagger texts
      textTitleOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
      textTitleY.value = withDelay(600, withSpring(0, { damping: 12 }));

      textSubOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
      textSubY.value = withDelay(800, withSpring(0, { damping: 12 }));
    }
  }, [visible]);

  const backgroundStyle = useAnimatedStyle(() => {
    return { opacity: bgOpacity.value };
  });

  const popupStyle = useAnimatedStyle(() => {
    return { transform: [{ translateY: translateY.value }] };
  });

  const iconStyle = useAnimatedStyle(() => {
    return { transform: [{ scale: iconScale.value }] };
  });

  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
      opacity: pulseOpacity.value,
    };
  });

  const titleStyle = useAnimatedStyle(() => ({
    opacity: textTitleOpacity.value,
    transform: [{ translateY: textTitleY.value }],
  }));

  const subStyle = useAnimatedStyle(() => ({
    opacity: textSubOpacity.value,
    transform: [{ translateY: textSubY.value }],
  }));

  if (!visible) return null;

  const particles = [
    { angle: -90, color: '#FDE047' },
    { angle: -45, color: '#F9A8D4' },
    { angle: 0, color: '#A7F3D0' },
    { angle: -135, color: '#93C5FD' },
    { angle: -180, color: '#FDE047' },
    { angle: 45, color: '#F9A8D4' },
    { angle: 135, color: '#A7F3D0' },
  ];

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.container}>
        <Animated.View style={[StyleSheet.absoluteFill, backgroundStyle]}>
          <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="light" />
        </Animated.View>

        <Animated.View style={[styles.popup, popupStyle]}>
          {/* Lighter, softer gradient */}
          <LinearGradient
            colors={['#A7F3D0', '#D8B4FE', '#FBCFE8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientHeader}
          >
            <View style={styles.iconWrapper}>
              {/* Confetti Particles */}
              {particles.map((p, i) => (
                <Particle key={i} angle={p.angle} delay={450} color={p.color} />
              ))}

              {/* Pulsing ring */}
              <Animated.View style={[styles.pulseRing, pulseStyle]} />

              {/* Main Checkmark */}
              <Animated.View style={[styles.tickContainer, iconStyle]}>
                <Ionicons name="checkmark" size={64} color="#8B5CF6" />
              </Animated.View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <Animated.View style={titleStyle}>
              <Text style={styles.title}>{t('thank_you_title', 'Thank You!')}</Text>
            </Animated.View>
            <Animated.View style={subStyle}>
              <Text style={styles.subtitle}>
                {t('order_placed_success', 'Your order has been placed successfully.')}
              </Text>
              <Text style={styles.description}>
                {t(
                  'order_processing_desc',
                  'We are processing your order and will notify you once it is ready for delivery.',
                )}
              </Text>
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  popup: {
    backgroundColor: 'white',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 20,
    minHeight: 400,
  },
  gradientHeader: {
    height: 190,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  pulseRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  tickContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  particle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 10,
  },
  content: {
    paddingHorizontal: 32,
    paddingTop: 36,
    paddingBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
});
