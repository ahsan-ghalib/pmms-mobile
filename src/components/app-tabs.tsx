import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useRouter } from 'expo-router';
import colors from 'tailwindcss/colors';
import { useTranslation } from 'react-i18next';
import { Image, Platform, useWindowDimensions, View, Text, DeviceEventEmitter } from 'react-native';
import { useChatRealtime } from '../contexts/ChatRealtimeContext';
import { leaveHomeFeed, notifyCustomerHomeTabOpened } from '../utils/feedVideoPlayback';

const activeColor = '#8E54E9';
const inactiveColor = colors.gray[500];

function useUnreadBadge() {
  const { hasUnread, unreadCount } = useChatRealtime();
  const unreadBadge = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : undefined;
  return { hasUnread, unreadBadge };
}

function PadTabs() {
  const { t, i18n } = useTranslation();
  const fontFamily = i18n.language === 'ar' ? 'PlaypenSansArabic_600SemiBold' : 'Inter_600SemiBold';
  const { width: windowWidth } = useWindowDimensions();
  const iconSize = 28;
  const { unreadBadge } = useUnreadBadge();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          position: 'absolute',
          bottom: 24,
          marginHorizontal: (windowWidth - 600) / 2,
          backgroundColor: '#ffffff',
          borderRadius: 35,
          height: 84,
          paddingBottom: 14,
          paddingTop: 14,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
        },
        tabBarItemStyle: { flex: 1 },
        tabBarLabelStyle: {
          fontFamily,
          fontSize: i18n.language === 'ar' ? 10 : 11,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav_home', 'Home'),
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require('../../assets/images/HomeSelected.png')
                  : require('../../assets/images/Home.png')
              }
              style={{
                width: iconSize,
                height: iconSize,
                tintColor: focused ? activeColor : inactiveColor,
              }}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            notifyCustomerHomeTabOpened();
            DeviceEventEmitter.emit('refreshHomeFeed');
          },
        }}
      />

      <Tabs.Screen
        name="discover"
        options={{
          title: t('nav_discover', 'Discover'),
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require('../../assets/images/DiscoverSelected.png')
                  : require('../../assets/images/Discover.png')
              }
              style={{
                width: iconSize,
                height: iconSize,
                tintColor: focused ? activeColor : inactiveColor,
              }}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            leaveHomeFeed();
            // Always land on the Discover grid (pop feed player if open).
            if (typeof router.dismissTo === 'function') {
              router.dismissTo('/(tabs)/discover');
              return;
            }
            router.navigate('/(tabs)/discover');
          },
        }}
      />

      <Tabs.Screen
        name="TryYourLuckScreen"
        options={{
          title: t('nav_gift', 'Gift'),
          tabBarIcon: () => (
            <Image
              source={require('../../assets/images/gift.png')}
              style={{ width: iconSize, height: iconSize }}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            leaveHomeFeed();
          },
        }}
      />

      <Tabs.Screen
        name="MessagesScreen"
        listeners={{
          tabPress: () => {
            leaveHomeFeed();
          },
        }}
        options={{
          title: t('nav_messages', 'Messages'),
          tabBarIcon: ({ focused }) => (
            <View>
              <Image
                source={
                  focused
                    ? require('../../assets/images/messageSelected.png')
                    : require('../../assets/images/message.png')
                }
                style={{
                  width: iconSize,
                  height: iconSize,
                  tintColor: focused ? activeColor : inactiveColor,
                }}
              />
              {!!unreadBadge && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#EF4444',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: '700',
                      lineHeight: 14,
                      fontFamily,
                    }}
                  >
                    {unreadBadge}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="ProfileScreen"
        listeners={{
          tabPress: () => {
            leaveHomeFeed();
          },
        }}
        options={{
          title: t('nav_profile', 'Profile'),
          tabBarIcon: ({ focused }) => (
            <Image
              source={
                focused
                  ? require('../../assets/images/profileSelected.png')
                  : require('../../assets/images/profile.png')
              }
              style={{
                width: iconSize,
                height: iconSize,
                tintColor: focused ? activeColor : inactiveColor,
              }}
            />
          ),
        }}
      />

      <Tabs.Screen name="DelegateServiceScreen" options={{ href: null }} />
      <Tabs.Screen name="FilterScreen" options={{ href: null }} />
      <Tabs.Screen name="ReservationsScreen" options={{ href: null }} />
    </Tabs>
  );
}

/** Shared phone tabs — same NativeTabs design on iOS + Android. */
function PhoneTabs() {
  const { t, i18n } = useTranslation();
  const fontFamily = i18n.language === 'ar' ? 'PlaypenSansArabic_600SemiBold' : 'Inter_600SemiBold';
  const router = useRouter();
  const { hasUnread, unreadBadge } = useUnreadBadge();
  const isAndroid = Platform.OS === 'android';

  return (
    <NativeTabs
      backgroundColor={isAndroid ? '#111111' : 'transparent'}
      tintColor={activeColor}
      iconColor={{ default: inactiveColor, selected: activeColor }}
      {...(isAndroid
        ? {
            indicatorColor: 'rgba(142,84,233,0.22)',
            rippleColor: 'rgba(142,84,233,0.18)',
            labelVisibilityMode: 'labeled' as const,
          }
        : {})}
      labelStyle={{
        default: { color: inactiveColor, fontFamily, fontSize: i18n.language === 'ar' ? 10 : 10 },
        selected: { color: activeColor, fontFamily, fontSize: i18n.language === 'ar' ? 10 : 10 },
      }}
    >
      <NativeTabs.Trigger
        name="index"
        listeners={{
          tabPress: () => {
            notifyCustomerHomeTabOpened();
            DeviceEventEmitter.emit('refreshHomeFeed');
          },
        }}
      >
        <NativeTabs.Trigger.Label>{t('nav_home', 'Home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={{
            default: require('../../assets/images/Home.png'),
            selected: require('../../assets/images/HomeSelected.png'),
          }}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="discover"
        listeners={{
          tabPress: () => {
            leaveHomeFeed();
            // Always land on the Discover grid — never leave the feed player
            // stacked when the Discover tab is tapped.
            if (typeof router.dismissTo === 'function') {
              router.dismissTo('/(tabs)/discover');
              return;
            }
            router.navigate('/(tabs)/discover');
          },
        }}
      >
        <NativeTabs.Trigger.Label>{t('nav_discover', 'Discover')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={{
            default: require('../../assets/images/Discover.png'),
            selected: require('../../assets/images/DiscoverSelected.png'),
          }}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="TryYourLuckScreen"
        listeners={{
          tabPress: () => {
            leaveHomeFeed();
          },
        }}
      >
        <NativeTabs.Trigger.Label>{t('nav_gift', 'Gift')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('../../assets/images/gift.png')}
          renderingMode="original"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="MessagesScreen"
        listeners={{
          tabPress: () => {
            leaveHomeFeed();
          },
        }}
      >
        <NativeTabs.Trigger.Label>{t('nav_messages', 'Messages')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={{
            default: require('../../assets/images/message.png'),
            selected: require('../../assets/images/messageSelected.png'),
          }}
          renderingMode="template"
        />
        <NativeTabs.Trigger.Badge hidden={!hasUnread}>{unreadBadge}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="ProfileScreen"
        listeners={{
          tabPress: () => {
            leaveHomeFeed();
          },
        }}
      >
        <NativeTabs.Trigger.Label>{t('nav_profile', 'Profile')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={{
            default: require('../../assets/images/profile.png'),
            selected: require('../../assets/images/profileSelected.png'),
          }}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function AppTabs() {
  if (Platform.isPad) {
    return <PadTabs />;
  }
  return <PhoneTabs />;
}
