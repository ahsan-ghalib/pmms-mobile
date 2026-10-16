import { Text } from './Text';

import { Ionicons } from '@expo/vector-icons';
// import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const tabsConfig: Record<string, { label: string; icon: any }> = {
  index: { label: 'Home', icon: 'home-outline' },
  discover: { label: 'Discover', icon: 'search-outline' },
  TryYourLuckScreen: { label: 'Try your luck', icon: 'gift-outline' },
  MessagesScreen: { label: 'Messages', icon: 'chatbubble-outline' },
  ProfileScreen: { label: 'Profile', icon: 'person-outline' },
};

const ACTIVE_PURPLE = '#8E54E9';
const INACTIVE_GRAY = '#6B7280';

export function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      <View
        style={{
          marginHorizontal: 16,
          borderRadius: 999,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        <BlurView
          intensity={80}
          tint="light"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 999,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            paddingVertical: 8,
            paddingHorizontal: 6,
            overflow: 'hidden',
          }}
        >
          {state.routes.map((route: any, index: number) => {
            const tab = tabsConfig[route.name];
            if (!tab) return null; // Don't render a tab button for hidden screens

            const isFocused = state.index === index;
            const { options } = descriptors[route.key];

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? tab.label}
                onPress={onPress}
                onLongPress={onLongPress}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 2 }}
              >
                <Animated.View
                  style={[
                    {
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 2,
                    },
                    useAnimatedStyle(() => ({
                      backgroundColor: withTiming(isFocused ? '#EDE7F8' : 'transparent', {
                        duration: 250,
                      }),
                      transform: [{ scale: withSpring(isFocused ? 1.15 : 1) }],
                    })),
                  ]}
                >
                  <Ionicons
                    name={tab.icon}
                    size={22}
                    color={isFocused ? ACTIVE_PURPLE : INACTIVE_GRAY}
                  />
                </Animated.View>
                <Text
                  style={{
                    fontSize: 10,
                    color: isFocused ? ACTIVE_PURPLE : INACTIVE_GRAY,
                    fontWeight: isFocused ? '600' : '400',
                  }}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}
