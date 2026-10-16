import { Text } from './Text';

import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type LogoProps = {
  size?: 'sm' | 'md' | 'lg';
};

const sizes = {
  sm: { iconW: 42, iconH: 34, live: 18, souq: 14 },
  md: { iconW: 54, iconH: 44, live: 26, souq: 18 },
  lg: { iconW: 62, iconH: 50, live: 32, souq: 22 },
};

export function Logo({ size = 'md', useImage = true }: LogoProps & { useImage?: boolean }) {
  const s = sizes[size];

  if (useImage) {
    const imageSizes = {
      sm: { width: 150, height: 60 },
      md: { width: 190, height: 76 },
      lg: { width: 210, height: 84 },
    };

    return (
      <View className="items-center">
        <Image
          source={require('../../assets/logo.png')}
          style={imageSizes[size]}
          resizeMode="contain"
          accessibilityLabel="Souq Live logo"
        />
      </View>
    );
  }

  return (
    <View className="items-center">
      <View className="flex-row items-center gap-3">
        <View className="items-center">
          <LinearGradient
            colors={['#E88B31', '#F5A623', '#FBC02D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: s.iconW,
              height: s.iconH,
              borderRadius: 10,
              borderBottomLeftRadius: 3,
              borderBottomRightRadius: 3,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark" size={s.iconH * 0.52} color="#fff" />
          </LinearGradient>
          <View className="mt-1 flex-row gap-1.5">
            <View className="h-1 w-2.5 rounded-full bg-brand-orange" />
            <View className="h-1 w-2.5 rounded-full bg-brand-orange-light" />
          </View>
        </View>

        <View>
          <View className="flex-row">
            <Text
              className="font-bold"
              style={{ fontSize: s.live, lineHeight: s.live + 4, color: '#E53935' }}
            >
              L
            </Text>
            <Text
              className="font-bold"
              style={{ fontSize: s.live, lineHeight: s.live + 4, color: '#F4511E' }}
            >
              i
            </Text>
            <Text
              className="font-bold"
              style={{ fontSize: s.live, lineHeight: s.live + 4, color: '#FB8C00' }}
            >
              v
            </Text>
            <Text
              className="font-bold"
              style={{ fontSize: s.live, lineHeight: s.live + 4, color: '#FBC02D' }}
            >
              e
            </Text>
          </View>
          <Text
            className="font-bold text-gray-800"
            style={{ fontSize: s.souq, lineHeight: s.souq + 4, marginTop: -1 }}
          >
            سوق
          </Text>
        </View>
      </View>
    </View>
  );
}
