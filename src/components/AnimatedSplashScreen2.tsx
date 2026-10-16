import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  DeviceEventEmitter,
  Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import * as SplashScreen from 'expo-splash-screen';

type Props = {
  onAnimationFinish: () => void;
};

export let globalSplashFinished = false;

export function AnimatedSplashScreen2({ onAnimationFinish }: Props) {
  const animationRef = useRef<LottieView>(null);
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const finishedRef = useRef(false);

  const [isAnimationFinished, setIsAnimationFinished] = useState(false);

  const isIOS = Platform.OS === 'ios';
  const lottieSpeed = isIOS ? 2.75 : 1.25;
  const fadeMs = isIOS ? 180 : 400;
  const animationFailsafeMs = isIOS ? 2200 : 4000;

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    const timeout = setTimeout(() => {
      setIsAnimationFinished(true);
    }, animationFailsafeMs);

    return () => clearTimeout(timeout);
  }, [animationFailsafeMs]);

  useEffect(() => {
    if (!isAnimationFinished || finishedRef.current) return;
    finishedRef.current = true;

    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: fadeMs,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      globalSplashFinished = true;
      DeviceEventEmitter.emit('splashFinished');
      onAnimationFinish();
    });
  }, [isAnimationFinished, fadeMs, containerOpacity, onAnimationFinish]);

  const handleLottieFinish = (isCancelled?: boolean) => {
    if (isCancelled) return;
    setIsAnimationFinished(true);
  };

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents="none">
      <LottieView
        ref={animationRef}
        source={require('../../assets/animations/splashLogoNew.json')}
        style={styles.lottie}
        autoPlay
        loop={false}
        speed={lottieSpeed}
        onAnimationFinish={handleLottieFinish}
        resizeMode="cover"
      />
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
    width,
    height,
    backgroundColor: '#ffffff',
    zIndex: 99999,
    elevation: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
});
