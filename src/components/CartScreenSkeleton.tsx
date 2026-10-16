import React from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ACCENT, cardShadow } from './ui/cart/cartTheme';

function useCartSkeletonPulse() {
  const pulse = React.useRef(new Animated.Value(0.45)).current;
  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  return pulse;
}

function CartBone({ style }: { style: object }) {
  const pulse = useCartSkeletonPulse();
  return <Animated.View style={[{ backgroundColor: '#E8E4F0' }, style, { opacity: pulse }]} />;
}

export function CartScreenSkeleton({ topInset }: { topInset: number }) {
  return (
    <View className="flex-1" style={{ backgroundColor: ACCENT.page }}>
      <LinearGradient
        colors={['#EEF2FF', '#F0FDFA', '#F8FAFC']}
        locations={[0, 0.35, 1]}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 144 }}
      >
        <View
          className="flex-row items-center justify-between pb-5"
          style={{ paddingTop: topInset + 16 }}
        >
          <CartBone style={{ width: 44, height: 44, borderRadius: 22 }} />
          <View className="items-center flex-1 mx-4">
            <CartBone style={{ width: 120, height: 18, borderRadius: 8, marginBottom: 8 }} />
            <CartBone style={{ width: 180, height: 12, borderRadius: 6 }} />
          </View>
          <CartBone style={{ width: 44, height: 44, borderRadius: 22 }} />
        </View>

        <View
          className="mt-2 rounded-[24px] p-4"
          style={{
            backgroundColor: ACCENT.card,
            borderWidth: 1,
            borderColor: ACCENT.primaryMuted,
            ...cardShadow,
          }}
        >
          <View className="flex-row gap-3">
            <CartBone style={{ flex: 1, height: 68, borderRadius: 18 }} />
            <CartBone style={{ flex: 1, height: 68, borderRadius: 18 }} />
          </View>
          <CartBone style={{ height: 74, borderRadius: 12, marginTop: 16 }} />
        </View>

        <View
          className="rounded-[24px] mt-5 p-4"
          style={{
            backgroundColor: ACCENT.card,
            borderWidth: 1,
            borderColor: ACCENT.primaryMuted,
            ...cardShadow,
          }}
        >
          <View className="flex-row justify-between items-center mb-4">
            <CartBone style={{ width: 96, height: 14, borderRadius: 7 }} />
            <CartBone style={{ width: 64, height: 22, borderRadius: 11 }} />
          </View>
          {[0, 1, 2].map((index) => (
            <View key={`cart-item-skel-${index}`} className="flex-row items-center py-2">
              <CartBone style={{ width: 60, height: 60, borderRadius: 16 }} />
              <View className="flex-1 mx-3">
                <CartBone style={{ width: '72%', height: 13, borderRadius: 6, marginBottom: 8 }} />
                <CartBone style={{ width: '40%', height: 11, borderRadius: 6 }} />
              </View>
              <CartBone style={{ width: 72, height: 28, borderRadius: 14 }} />
            </View>
          ))}
        </View>

        <View
          className="rounded-[24px] mt-5 p-5 mb-4"
          style={{
            backgroundColor: ACCENT.card,
            borderWidth: 1,
            borderColor: ACCENT.mintSoft,
            ...cardShadow,
          }}
        >
          <CartBone style={{ width: 110, height: 14, borderRadius: 7, marginBottom: 16 }} />
          {[0, 1, 2, 3].map((index) => (
            <View key={`cart-bill-skel-${index}`} className="flex-row justify-between mb-3">
              <CartBone style={{ width: index === 3 ? 90 : 120, height: 12, borderRadius: 6 }} />
              <CartBone style={{ width: 56, height: 12, borderRadius: 6 }} />
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="absolute left-0 right-0 px-5" style={{ bottom: 16 }}>
        <View
          className="flex-row items-center justify-between rounded-[24px] px-4 py-3"
          style={{
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: ACCENT.primaryMuted,
            ...cardShadow,
          }}
        >
          <View>
            <CartBone style={{ width: 80, height: 10, borderRadius: 5, marginBottom: 8 }} />
            <CartBone style={{ width: 110, height: 20, borderRadius: 8 }} />
          </View>
          <CartBone style={{ width: 120, height: 48, borderRadius: 20 }} />
        </View>
      </View>
    </View>
  );
}
