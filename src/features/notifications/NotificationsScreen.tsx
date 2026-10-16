import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useLanguage } from '../../i18n/LanguageContext';
import { homeCopy } from '../home/homeCopy';
import { useNotifications } from '../home/useTenantHome';
import ScreenHeader from '../shell/ScreenHeader';

const emptyCopy = {
  en: { title: 'No notifications', body: "You're all caught up." },
  ar: { title: 'لا توجد إشعارات', body: 'لا يوجد جديد حالياً.' },
};

export default function NotificationsScreen({ bottomInset }: { bottomInset: number }) {
  const { language, font, row, align } = useLanguage();
  const copy = homeCopy[language];
  const notifications = useNotifications();

  return (
    <View className="flex-1 bg-[#F6F9FE]">
      <ScreenHeader title={copy.tabs.notifications} />
      <FlatList
        data={notifications.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomInset + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={notifications.isRefetching}
            onRefresh={notifications.refetch}
            tintColor="#2F80F0"
          />
        }
        renderItem={({ item }) => (
          <View className={`mb-3 ${row} gap-3 rounded-2xl bg-white p-4`}>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-50">
              <Ionicons name="notifications-outline" size={19} color="#2F80F0" />
            </View>
            <View className="flex-1">
              <View className={`${row} items-center gap-2`}>
                <Text
                  numberOfLines={1}
                  className={`flex-1 text-[14px] ${font.semibold} text-ink-900 ${align}`}
                >
                  {item.title}
                </Text>
                {!item.read_at ? <View className="h-2 w-2 rounded-full bg-rose-500" /> : null}
              </View>
              <Text
                numberOfLines={3}
                className={`mt-1 text-[13px] leading-[18px] ${font.regular} text-ink-500 ${align}`}
              >
                {item.body}
              </Text>
              {item.created_at ? (
                <Text className={`mt-1.5 text-[11px] ${font.regular} text-ink-400 ${align}`}>
                  {dayjs(item.created_at).locale(language).format('MMM D, YYYY · h:mm A')}
                </Text>
              ) : null}
            </View>
          </View>
        )}
        ListEmptyComponent={
          notifications.isLoading ? null : (
            <View className="items-center py-16">
              <Ionicons name="notifications-off-outline" size={32} color="#94A3B8" />
              <Text className={`mt-3 text-[15px] ${font.semibold} text-ink-900`}>
                {emptyCopy[language].title}
              </Text>
              <Text className={`mt-1 text-[13px] ${font.regular} text-ink-500`}>
                {emptyCopy[language].body}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}
