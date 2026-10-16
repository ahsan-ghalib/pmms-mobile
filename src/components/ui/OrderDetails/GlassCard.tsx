import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  accent?: string;
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  contentStyle?: ViewStyle | ViewStyle[];
};

/** Soft pastel fills — lightly richer than before */
const SOFT_BG: Record<string, string> = {
  '#3B82F6': 'rgba(219, 234, 254, 0.72)', // progress blue
  '#F43F5E': 'rgba(255, 228, 230, 0.72)', // items rose
  '#10B981': 'rgba(209, 250, 229, 0.72)', // address green
  '#6366F1': 'rgba(224, 231, 255, 0.72)', // bill indigo
  '#14B8A6': 'rgba(204, 251, 241, 0.72)', // delivery teal
  '#F59E0B': 'rgba(254, 243, 199, 0.72)', // driver amber
  '#EAB308': 'rgba(254, 249, 195, 0.72)', // otp yellow
  '#8B5CF6': 'rgba(237, 233, 254, 0.72)', // store violet
};

function softBackground(accent?: string) {
  if (!accent) return 'rgba(255, 255, 255, 0.92)';
  return SOFT_BG[accent.toUpperCase()] || SOFT_BG[accent] || `${accent}14`;
}

function softBorder(accent?: string) {
  if (!accent) return 'rgba(226, 232, 240, 0.95)';
  return `${accent}28`;
}

/** Glass card: blur + light colored wash (no accent rails) */
export function GlassCard({ accent, children, style, contentStyle }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={55} style={StyleSheet.absoluteFill} tint="light" />
      ) : (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.androidFrost]} />
      )}
      <View pointerEvents="none" style={styles.whiteGlaze} />
      <View
        style={[
          styles.frost,
          {
            backgroundColor: softBackground(accent),
            borderColor: softBorder(accent),
          },
        ]}
      >
        <View style={[styles.body, contentStyle]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 5,
  },
  androidFrost: {
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  whiteGlaze: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  frost: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  body: {
    borderRadius: 20,
  },
});
