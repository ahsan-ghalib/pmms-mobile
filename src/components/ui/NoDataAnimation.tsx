import React, { useEffect, useRef } from 'react';
import { View, Animated, Image, StyleSheet, ViewProps } from 'react-native';
import { Text } from '../Text';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Line } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

interface NoDataAnimationProps extends ViewProps {
  title?: string;
  subtitle?: string;
  subSubtitle?: string;
}

export function NoDataAnimation({
  title,
  subtitle,
  subSubtitle,
  style,
  ...props
}: NoDataAnimationProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const pulse = useRef(new Animated.Value(0)).current;
  const search = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 2500, useNativeDriver: true }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(search, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(search, { toValue: -1, duration: 1100, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    ).start();

    const bounce = (anim: Animated.Value, dur: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: dur / 2, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: dur / 2, useNativeDriver: true }),
        ]),
      ).start();
    };

    bounce(dot1, 2000);
    bounce(dot2, 2400);
    bounce(dot3, 2800);
  }, []);

  const pulseScale = pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.8, 1.5, 1.5] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.4, 0, 0] });

  const pulse2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.timing(pulse2, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ).start();
    }, 1000);
    return () => clearTimeout(timeout);
  }, []);
  const pulseScale2 = pulse2.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.8, 1.5, 1.5] });
  const pulseOpacity2 = pulse2.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.4, 0, 0] });

  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  const searchX = search.interpolate({ inputRange: [-1, 1], outputRange: [-8, 10] });
  const searchRot = search.interpolate({ inputRange: [-1, 1], outputRange: ['0deg', '8deg'] });

  const dot1Y = dot1.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const dot2Y = dot2.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const dot3Y = dot3.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <View style={[styles.container, isArabic && styles.containerArabic, style]} {...props}>
      <View style={[styles.illustrationArea, { direction: 'ltr' }]}>
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0%" stopColor="#FFF8F0" />
              <Stop offset="100%" stopColor="#FFFFFF" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bg)" rx={24} />
        </Svg>

        {/* Pulses */}
        <Animated.View
          style={[
            styles.absoluteCenter,
            { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
          ]}
        >
          <View style={styles.pulse1} />
        </Animated.View>

        <Animated.View
          style={[
            styles.absoluteCenter,
            { transform: [{ scale: pulseScale2 }], opacity: pulseOpacity2 },
          ]}
        >
          <View style={styles.pulse2} />
        </Animated.View>

        {/* Dots */}
        <Animated.View
          style={[
            styles.dot,
            {
              left: '50%',
              marginLeft: -85,
              top: 110,
              backgroundColor: '#FDBA2D',
              width: 8,
              height: 8,
              borderRadius: 4,
              transform: [{ translateY: dot1Y }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              left: '50%',
              marginLeft: 100,
              top: 90,
              backgroundColor: '#F59E0B',
              width: 10,
              height: 10,
              borderRadius: 5,
              transform: [{ translateY: dot2Y }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              left: '50%',
              marginLeft: -110,
              top: 190,
              backgroundColor: '#FFD27A',
              width: 6,
              height: 6,
              borderRadius: 3,
              transform: [{ translateY: dot3Y }],
            },
          ]}
        />

        {/* Logo */}
        <Animated.View style={[styles.logoContainer, { transform: [{ translateY: floatY }] }]}>
          <Image
            source={require('../../../assets/logo.png')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Magnifying Glass */}
        <Animated.View
          style={[
            styles.glassContainer,
            { transform: [{ translateX: searchX }, { rotate: searchRot }] },
          ]}
        >
          <Svg width="70" height="70" viewBox="0 0 70 70">
            <Circle cx="25" cy="25" r="20" fill="none" stroke="#F59E0B" strokeWidth="5" />
            <Line
              x1="39"
              y1="39"
              x2="59"
              y2="59"
              stroke="#F59E0B"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
      </View>

      {/* Text — single standard empty line */}
      <View style={styles.textContainer}>
        <Text
          style={[styles.title, isArabic && styles.titleArabic]}
          writingDirection={isArabic ? 'rtl' : 'ltr'}
        >
          {title || t('no_results', 'No results.')}
        </Text>
        {!!(subtitle ?? t('no_data_subtitle1', '')) && (
          <Text
            style={[styles.subtitle, isArabic && styles.subtitleArabic]}
            writingDirection={isArabic ? 'rtl' : 'ltr'}
          >
            {subtitle || t('no_data_subtitle1', '')}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 360,
    minHeight: 420,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 24,
  },
  containerArabic: {
    minHeight: 460,
  },
  illustrationArea: {
    height: 270,
    width: '100%',
  },
  absoluteCenter: {
    position: 'absolute',
    left: '50%',
    top: 145,
  },
  pulse1: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#F6A623',
    marginLeft: -70,
    marginTop: -70,
  },
  pulse2: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#FFD27A',
    marginLeft: -90,
    marginTop: -90,
  },
  dot: {
    position: 'absolute',
  },
  logoContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -100, // 200/2
    top: 75,
    width: 200,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  glassContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: 45,
    top: 145,
    width: 70,
    height: 70,
  },
  textContainer: {
    paddingTop: 8,
    paddingBottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleArabic: {
    fontSize: 22,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitleArabic: {
    fontSize: 14,
    lineHeight: 22,
  },
});
