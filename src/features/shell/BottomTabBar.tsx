import { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../i18n/LanguageContext';
import { homeCopy } from '../home/homeCopy';

export type TabKey = 'home' | 'requests' | 'notifications' | 'profile';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { key: TabKey; icon: IconName; activeIcon: IconName }[] = [
  { key: 'home', icon: 'home-outline', activeIcon: 'home' },
  { key: 'requests', icon: 'document-text-outline', activeIcon: 'document-text' },
  { key: 'notifications', icon: 'notifications-outline', activeIcon: 'notifications' },
  { key: 'profile', icon: 'person-outline', activeIcon: 'person' },
];

export const TAB_BAR_HEIGHT = 64;

type Props = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  onCreate: () => void;
  hasUnread: boolean;
};

export default function BottomTabBar({ active, onChange, onCreate, hasUnread }: Props) {
  const insets = useSafeAreaInsets();
  const { language, font, row } = useLanguage();
  const copy = homeCopy[language];

  const renderTab = (tab: (typeof TABS)[number]) => {
    const selected = tab.key === active;
    return (
      <Pressable
        key={tab.key}
        onPress={() => onChange(tab.key)}
        className="flex-1 items-center justify-center gap-1 pt-2"
      >
        <View>
          <Ionicons
            name={selected ? tab.activeIcon : tab.icon}
            size={22}
            color={selected ? '#1D6FE6' : '#64748B'}
          />
          {tab.key === 'notifications' && hasUnread ? (
            <View className="absolute -right-0.5 top-0 h-2 w-2 rounded-full border border-white bg-rose-500" />
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          className={`text-[11px] ${selected ? `${font.semibold} text-brand-600` : `${font.medium} text-ink-500`}`}
        >
          {copy.tabs[tab.key]}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white"
      style={{
        paddingBottom: Math.max(insets.bottom - 8, 8),
        shadowColor: '#0F172A',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
        elevation: 12,
      }}
    >
      <View className={`${row} items-end`} style={{ height: TAB_BAR_HEIGHT }}>
        {TABS.slice(0, 2).map(renderTab)}
        <View className="w-20 items-center">
          <Pressable
            onPress={onCreate}
            className="-mt-7 h-14 w-14 items-center justify-center rounded-full bg-[#0B1930] active:opacity-90"
            style={{
              shadowColor: '#0B1930',
              shadowOpacity: 0.3,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Ionicons name="add" size={30} color="#fff" />
          </Pressable>
        </View>
        {TABS.slice(2).map(renderTab)}
      </View>
    </View>
  );
}
