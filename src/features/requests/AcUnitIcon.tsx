import Svg, { Path, Rect } from 'react-native-svg';

export default function AcUnitIcon({
  size = 28,
  color = '#E25563',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Rect x="3" y="6" width="22" height="10" rx="2.5" stroke={color} strokeWidth={1.8} />
      <Path d="M7 12.5h14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path
        d="M9 19.5v3M14 19.5v3.5M19 19.5v3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
