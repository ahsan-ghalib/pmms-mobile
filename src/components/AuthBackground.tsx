import { Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const STROKE_PURPLE = '#8E54E9';

function BrushStroke({ style, fade = 'right' }: { style: object; fade?: 'right' | 'left' }) {
  const colors =
    fade === 'right'
      ? ([STROKE_PURPLE, STROKE_PURPLE, 'rgba(142, 84, 233, 0.35)', 'transparent'] as const)
      : (['transparent', 'rgba(142, 84, 233, 0.35)', STROKE_PURPLE, STROKE_PURPLE] as const);

  return (
    <View pointerEvents="none" style={[{ position: 'absolute', overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={[...colors]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ flex: 1 }}
      />
    </View>
  );
}

export function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 bg-[#F5F3FA]">
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <BrushStroke
          fade="right"
          style={{
            top: -20,
            left: -40,
            width: width * 0.85,
            height: 120,
            transform: [{ rotate: '-12deg' }, { skewX: '-5deg' }],
          }}
        />
        <BrushStroke
          fade="right"
          style={{
            top: 35,
            left: -20,
            width: width * 0.55,
            height: 70,
            opacity: 0.75,
            transform: [{ rotate: '-20deg' }],
          }}
        />

        <BrushStroke
          fade="left"
          style={{
            bottom: -10,
            right: -40,
            width: width * 0.9,
            height: 130,
            transform: [{ rotate: '10deg' }, { skewX: '5deg' }],
          }}
        />
        <BrushStroke
          fade="left"
          style={{
            bottom: 45,
            right: -15,
            width: width * 0.55,
            height: 75,
            opacity: 0.7,
            transform: [{ rotate: '18deg' }],
          }}
        />
      </View>

      <View className="flex-1" style={{ zIndex: 1 }}>
        {children}
      </View>
    </View>
  );
}
