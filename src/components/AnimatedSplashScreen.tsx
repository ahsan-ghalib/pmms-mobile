import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';

type Props = {
  onAnimationFinish: () => void;
};

export function AnimatedSplashScreen({ onAnimationFinish }: Props) {
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(50);
  const containerOpacity = useSharedValue(1);
  const bgOpacity = useSharedValue(0);

  // New animated values for breathing/floating effect on the blobs
  const blobScale1 = useSharedValue(0.9);
  const blobScale2 = useSharedValue(0.9);
  const blobTranslateX = useSharedValue(0);

  useEffect(() => {
    // Hide the native splash screen so our custom one takes over smoothly
    SplashScreen.hideAsync().catch(() => {});

    // Start the continuous breathing animations for the background blobs
    blobScale1.value = withRepeat(
      withTiming(1.1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    blobScale2.value = withRepeat(
      withTiming(1.15, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    blobTranslateX.value = withRepeat(
      withTiming(15, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );

    // Start the entrance animation
    bgOpacity.value = withTiming(1, { duration: 800 });
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    logoScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 90 }));
    logoTranslateY.value = withDelay(200, withSpring(0, { damping: 12, stiffness: 90 }));

    // Wait a couple seconds, then start the exit animation
    const timeout = setTimeout(() => {
      // Exit animations
      logoScale.value = withTiming(1.1, { duration: 400, easing: Easing.in(Easing.ease) });
      logoOpacity.value = withTiming(0, { duration: 300 });
      bgOpacity.value = withTiming(0, { duration: 300 });

      containerOpacity.value = withDelay(
        200,
        withTiming(0, { duration: 400 }, (finished) => {
          if (finished) {
            runOnJS(onAnimationFinish)();
          }
        }),
      );
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }, { translateY: logoTranslateY.value }],
  }));

  const topLeftBlobStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
    transform: [
      { scale: blobScale1.value },
      { translateX: blobTranslateX.value },
      { translateY: blobTranslateX.value },
    ],
  }));

  const bottomRightBlobStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
    transform: [
      { scale: blobScale2.value },
      { translateX: -blobTranslateX.value },
      { translateY: -blobTranslateX.value },
    ],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Decorative Background Elements */}
      <Animated.View style={[styles.topLeftBlob, topLeftBlobStyle]} />
      <Animated.View style={[styles.bottomRightBlob, bottomRightBlobStyle]} />

      <View style={styles.centerContainer}>
        {/* Main Logo */}
        <Animated.Image
          source={require('../../assets/logo.png')}
          style={[styles.logo, logoStyle]}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: width,
    height: height,
    backgroundColor: '#ffffff',
    zIndex: 99999, // Super high z-index
    elevation: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  topLeftBlob: {
    position: 'absolute',
    top: -150,
    left: -100,
    width: 350,
    height: 350,
    borderRadius: 200,
    backgroundColor: '#8E54E9', // Brand premium purple
    opacity: 0.15, // Subtle, soft intensity
  },
  bottomRightBlob: {
    position: 'absolute',
    bottom: -150,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 250,
    backgroundColor: '#434443ff', // Same brand purple
    opacity: 0.1, // Very subtle, smooth intensity
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 250,
    height: 250,
    zIndex: 2,
  },
});
