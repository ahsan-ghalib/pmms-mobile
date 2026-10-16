import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  TextInput,
  View as RNView,
  type KeyboardEvent,
  type View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type EnsureTarget = View | TextInput | null;

type KeyboardAvoidanceContextValue = {
  ensureVisible: (target?: EnsureTarget) => void;
  /** Disable global shift on screens that already manage the keyboard (e.g. chat). */
  setEnabled: (enabled: boolean) => void;
};

const noopKeyboardAvoidance: KeyboardAvoidanceContextValue = {
  ensureVisible: () => {},
  setEnabled: () => {},
};

const KeyboardAvoidanceContext =
  createContext<KeyboardAvoidanceContextValue>(noopKeyboardAvoidance);

const GAP = 20;

function getFocusedInput(): EnsureTarget {
  const state = TextInput.State as unknown as {
    currentlyFocusedInput?: () => EnsureTarget;
    currentlyFocusedField?: () => number | null;
  };

  if (typeof state.currentlyFocusedInput === 'function') {
    return state.currentlyFocusedInput();
  }

  return null;
}

/**
 * Outer shell delays the first reanimated hooks by a couple frames.
 * Worklets 0.10.x can SIGABRT if useSharedValue runs before the UI
 * runtime finishes installing unpackers (toOptimizedObject / getString).
 */
export function KeyboardAvoidanceProvider({ children }: { children: React.ReactNode }) {
  const [workletsReady, setWorkletsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (!cancelled) {
          setWorkletsReady(true);
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  if (!workletsReady) {
    return (
      <KeyboardAvoidanceContext.Provider value={noopKeyboardAvoidance}>
        <RNView style={{ flex: 1 }}>{children}</RNView>
      </KeyboardAvoidanceContext.Provider>
    );
  }

  return <KeyboardAvoidanceProviderInner>{children}</KeyboardAvoidanceProviderInner>;
}

function KeyboardAvoidanceProviderInner({ children }: { children: React.ReactNode }) {
  const shift = useSharedValue(0);
  const enabledRef = useRef(true);
  const keyboardHeightRef = useRef(0);
  const keyboardDurationRef = useRef(250);

  const applyShift = useCallback(
    (next: number, duration?: number) => {
      shift.value = withTiming(Math.max(0, next), {
        duration: duration ?? keyboardDurationRef.current,
      });
    },
    [shift],
  );

  const ensureVisible = useCallback(
    (target?: EnsureTarget) => {
      if (!enabledRef.current) {
        return;
      }

      const input = target ?? getFocusedInput();
      const keyboardHeight = keyboardHeightRef.current;
      if (!input || keyboardHeight <= 0 || typeof (input as View).measureInWindow !== 'function') {
        return;
      }

      requestAnimationFrame(() => {
        (input as View).measureInWindow((_x, y, _w, height) => {
          if (!enabledRef.current) {
            return;
          }

          const screenHeight = Dimensions.get('window').height;
          const keyboardTop = screenHeight - keyboardHeight;
          const overflow = y + height + GAP - keyboardTop;
          applyShift(overflow > 0 ? overflow : 0);
        });
      });
    },
    [applyShift],
  );

  const setEnabled = useCallback(
    (enabled: boolean) => {
      enabledRef.current = enabled;
      if (!enabled) {
        applyShift(0, 150);
      }
    },
    [applyShift],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (event: KeyboardEvent) => {
      keyboardHeightRef.current = event.endCoordinates.height;
      keyboardDurationRef.current = event.duration > 0 ? event.duration : 250;
      // Wait a frame so focus + layout settle, then lift the focused field.
      requestAnimationFrame(() => ensureVisible());
    };

    const onHide = (event: KeyboardEvent) => {
      keyboardHeightRef.current = 0;
      keyboardDurationRef.current = event.duration > 0 ? event.duration : 200;
      applyShift(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    const frameSub = Keyboard.addListener('keyboardDidShow', () => ensureVisible());

    return () => {
      showSub.remove();
      hideSub.remove();
      frameSub.remove();
    };
  }, [applyShift, ensureVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateY: -shift.value }],
  }));

  const value = useMemo(
    () => ({
      ensureVisible,
      setEnabled,
    }),
    [ensureVisible, setEnabled],
  );

  return (
    <KeyboardAvoidanceContext.Provider value={value}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </KeyboardAvoidanceContext.Provider>
  );
}

export function useKeyboardAvoidance() {
  return useContext(KeyboardAvoidanceContext);
}

/** Call from screens that already handle keyboard layout (chat composers, etc.). */
export function useDisableGlobalKeyboardAvoidance() {
  const { setEnabled } = useKeyboardAvoidance();

  useEffect(() => {
    setEnabled(false);
    return () => setEnabled(true);
  }, [setEnabled]);
}
