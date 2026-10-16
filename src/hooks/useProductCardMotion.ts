import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Soft press feedback only — no stagger entrance / image fade
 * (those caused visible flash when the product grid mounts).
 */
export function useProductCardMotion(_index = 0) {
  const press = useRef(new Animated.Value(1)).current;
  const imageOpacity = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(press, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 42,
      bounciness: 0,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(press, {
      toValue: 1,
      useNativeDriver: true,
      speed: 28,
      bounciness: 4,
    }).start();
  };

  const containerStyle = {
    transform: [{ scale: press }],
  };

  return {
    containerStyle,
    imageOpacity,
    onPressIn,
    onPressOut,
    onImageLoad: () => {
      imageOpacity.setValue(1);
    },
    onImageError: () => {
      imageOpacity.setValue(1);
    },
  };
}

export function usePopScale(trigger: number | string) {
  const scale = useRef(new Animated.Value(1)).current;
  const prev = useRef(trigger);

  useEffect(() => {
    if (prev.current === trigger) return;
    prev.current = trigger;
    scale.setValue(1);
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.18,
        useNativeDriver: true,
        speed: 40,
        bounciness: 8,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 28,
        bounciness: 6,
      }),
    ]).start();
  }, [scale, trigger]);

  return scale;
}
