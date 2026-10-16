import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

export default function SupportIllustration({ size = 120 }: { size?: number }) {
  const scale = size / 120;
  return (
    <View style={{ width: size, height: size * 0.95 }}>
      <Svg width={size} height={size * 0.95} viewBox="0 0 120 114">
        <Defs>
          <LinearGradient id="leaf" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#4FA3B8" />
            <Stop offset="1" stopColor="#2C6E86" />
          </LinearGradient>
          <LinearGradient id="board" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#EAF2FE" />
          </LinearGradient>
        </Defs>
        <Circle cx="64" cy="58" r="46" fill="#DCEAFD" opacity={0.7} />
        <Path d="M10 112c-2-22 6-40 22-52 2 20-6 38-22 52z" fill="url(#leaf)" />
        <Path d="M18 112c6-16 16-26 30-30-4 14-14 24-30 30z" fill="#7CC0D0" />
        <Path d="M108 112c4-18 0-34-12-46-4 16 0 32 12 46z" fill="url(#leaf)" />
        <Rect
          x="34"
          y="16"
          width="62"
          height="86"
          rx="9"
          fill="url(#board)"
          stroke="#C9DCF8"
          strokeWidth="1.5"
        />
        <Rect x="52" y="9" width="26" height="14" rx="5" fill="#2F6FD6" />
        <Circle cx="65" cy="12" r="3" fill="#DCEAFD" />
        <Rect x="44" y="64" width="42" height="5" rx="2.5" fill="#BFD6F6" />
        <Rect x="44" y="75" width="34" height="5" rx="2.5" fill="#BFD6F6" />
        <Rect x="44" y="86" width="26" height="5" rx="2.5" fill="#D5E4F9" />
      </Svg>
      <View style={{ position: 'absolute', left: 50 * scale, top: 28 * scale }}>
        <Ionicons name="build" size={30 * scale} color="#2F6FD6" />
      </View>
    </View>
  );
}
