import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../i18n/LanguageContext';
import { ApiError } from '../../lib/api';
import { homeCopy } from '../home/homeCopy';
import { useComplaints } from '../home/useTenantHome';
import FilterSheet from './FilterSheet';
import RequestCard from './RequestCard';
import { matchesSearch, requestActivityTime, requestBucket } from './requestDisplay';
import { RequestFilter, RequestPriority, requestsCopy, RequestSort } from './requestsCopy';

const FILTERS: RequestFilter[] = ['all', 'open', 'in_progress', 'scheduled', 'completed'];

const softShadow = {
  shadowColor: '#1E3A8A',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export default function RequestsScreen({
  bottomInset,
  onOpen,
}: {
  bottomInset: number;
  onOpen?: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { language, isAr, font, row, align } = useLanguage();
  const copy = requestsCopy[language];
  const complaints = useComplaints();
  const searchRef = useRef<TextInput>(null);
  const chipsRef = useRef<ScrollView>(null);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RequestFilter>('all');
  const [sort, setSort] = useState<RequestSort>('latest');
  const [priority, setPriority] = useState<RequestPriority>('all');
  const [sheetOpen, setSheetOpen] = useState(false);

  const all = useMemo(() => complaints.data ?? [], [complaints.data]);
  const visible = useMemo(() => {
    const rows = all.filter(
      (item) =>
        (filter === 'all' || requestBucket(item) === filter) &&
        (priority === 'all' || item.priority === priority) &&
        matchesSearch(item, query, language),
    );
    const direction = sort === 'latest' ? -1 : 1;
    return [...rows].sort((a, b) => (requestActivityTime(a) - requestActivityTime(b)) * direction);
  }, [all, filter, priority, query, sort, language]);

  const locked = complaints.error instanceof ApiError && complaints.error.status === 403;
  const filtersActive = priority !== 'all' || sort !== 'latest';

  const renderEmpty = () => {
    if (complaints.isLoading) return null;
    const home = homeCopy[language];
    const [icon, title, body] = complaints.isError
      ? locked
        ? (['lock-closed-outline', home.featureLocked, home.featureLockedBody] as const)
        : (['cloud-offline-outline', home.loadFailed, home.retry] as const)
      : all.length
        ? (['search-outline', copy.emptyTitle, copy.emptyBody] as const)
        : (['clipboard-outline', copy.noneTitle, copy.noneBody] as const);
    return (
      <View className="items-center px-8 py-16">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
          <Ionicons name={icon} size={26} color="#94A3B8" />
        </View>
        <Text className={`mt-3 text-[15px] ${font.semibold} text-ink-900`}>{title}</Text>
        <Text className={`mt-1 text-center text-[13px] ${font.regular} text-ink-500`}>{body}</Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#F6F9FE]">
      <View className="px-5" style={{ paddingTop: insets.top + 10 }}>
        <View className={`${row} items-center gap-3`}>
          <View className="flex-1">
            <Text className={`text-[26px] ${font.extrabold} text-ink-900 ${align}`}>
              {copy.title}
            </Text>
            <Text className={`text-[15px] ${font.regular} text-ink-500 ${align}`}>
              {copy.subtitle}
            </Text>
          </View>
          <Pressable
            onPress={() => searchRef.current?.focus()}
            className="h-12 w-12 items-center justify-center rounded-full bg-white active:opacity-80"
            style={softShadow}
          >
            <Ionicons name="search-outline" size={22} color="#0B1930" />
          </Pressable>
          <Pressable
            onPress={() => setSheetOpen(true)}
            className="h-12 w-12 items-center justify-center rounded-full bg-white active:opacity-80"
            style={softShadow}
          >
            <Ionicons name="options-outline" size={22} color="#0B1930" />
            {filtersActive ? (
              <View className="absolute right-3 top-3 h-2 w-2 rounded-full bg-brand-500" />
            ) : null}
          </Pressable>
        </View>

        <View
          className={`mt-4 ${row} h-12 items-center gap-2.5 rounded-2xl bg-white px-4`}
          style={softShadow}
        >
          <Ionicons name="search-outline" size={19} color="#64748B" />
          <TextInput
            ref={searchRef}
            value={query}
            onChangeText={setQuery}
            placeholder={copy.searchPlaceholder}
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            autoCorrect={false}
            className={`flex-1 text-[14px] ${font.regular} text-ink-900 ${align}`}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#CBD5E1" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="mt-4">
        <ScrollView
          ref={chipsRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            gap: 8,
            flexDirection: isAr ? 'row-reverse' : 'row',
          }}
          onContentSizeChange={() => {
            if (isAr) chipsRef.current?.scrollToEnd({ animated: false });
          }}
        >
          {FILTERS.map((key) => {
            const selected = key === filter;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                className={`rounded-full px-5 py-2.5 ${selected ? 'bg-brand-500' : 'bg-[#E9EFF8]'}`}
              >
                <Text
                  className={`text-[14px] ${selected ? `${font.semibold} text-white` : `${font.medium} text-ink-700`}`}
                >
                  {copy.filters[key]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomInset + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={complaints.isRefetching}
            onRefresh={complaints.refetch}
            tintColor="#2F80F0"
          />
        }
        ListHeaderComponent={
          <View className={`${row} mb-3 mt-5 items-center justify-between`}>
            <Text className={`text-[16px] ${font.semibold} text-ink-900`}>
              {copy.count(visible.length)}
            </Text>
            <Pressable
              onPress={() => setSheetOpen(true)}
              hitSlop={8}
              className={`${row} items-center gap-1`}
            >
              <Text className={`text-[13px] ${font.regular} text-ink-500`}>
                {copy.sortBy(copy.sort[sort])}
              </Text>
              <Ionicons name="chevron-down" size={15} color="#64748B" />
            </Pressable>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <RequestCard complaint={item} onPress={() => onOpen?.(item.id)} />
        )}
        ListEmptyComponent={renderEmpty}
      />

      <FilterSheet
        visible={sheetOpen}
        sort={sort}
        priority={priority}
        onClose={() => setSheetOpen(false)}
        onApply={(nextSort, nextPriority) => {
          setSort(nextSort);
          setPriority(nextPriority);
          setSheetOpen(false);
        }}
      />
    </View>
  );
}
