import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../i18n/LanguageContext';
import { ApiError } from '../../lib/api';
import { cardShadow } from '../create/shared';
import JobRow from './JobRow';
import {
  ACTIVE_STATUSES,
  DONE_STATUSES,
  isOverdue,
  jobPlace,
  jobTitle,
  scheduleSortKey,
} from './jobs';
import { technicianCopy } from './technicianCopy';
import { useTechnicianJobs } from './useTechnician';

const FILTERS = ['active', 'completed', 'all'] as const;
type Filter = (typeof FILTERS)[number];

export default function JobsScreen({
  bottomInset,
  onOpen,
}: {
  bottomInset: number;
  onOpen: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { language, font, row, align } = useLanguage();
  const copy = technicianCopy[language];
  const jobs = useTechnicianJobs();
  const [filter, setFilter] = useState<Filter>('active');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (jobs.data ?? [])
      .filter((job) =>
        filter === 'active'
          ? ACTIVE_STATUSES.includes(job.status)
          : filter === 'completed'
            ? DONE_STATUSES.includes(job.status)
            : true,
      )
      .filter(
        (job) =>
          !needle ||
          [job.work_order_no, jobTitle(job, language, copy), jobPlace(job), job.description]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(needle)),
      )
      .sort((a, b) =>
        filter === 'completed'
          ? scheduleSortKey(b) - scheduleSortKey(a)
          : Number(b.status === 'in_progress') - Number(a.status === 'in_progress') ||
            Number(isOverdue(b)) - Number(isOverdue(a)) ||
            scheduleSortKey(a) - scheduleSortKey(b),
      );
  }, [jobs.data, filter, query, language, copy]);

  const locked = jobs.error instanceof ApiError && jobs.error.status === 403;

  const renderEmpty = () => {
    if (jobs.isLoading) return null;
    const [icon, title, body] = jobs.isError
      ? locked
        ? (['lock-closed-outline', copy.lockedTitle, copy.lockedBody] as const)
        : (['cloud-offline-outline', copy.loadFailed, copy.retry] as const)
      : jobs.data?.length
        ? (['search-outline', copy.emptyFilterTitle, copy.emptyFilterBody] as const)
        : (['clipboard-outline', copy.noJobsTitle, copy.noJobsBody] as const);
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
        <Text className={`text-[26px] ${font.extrabold} text-ink-900 ${align}`}>
          {copy.jobsTitle}
        </Text>
        <Text className={`text-[15px] ${font.regular} text-ink-500 ${align}`}>
          {copy.jobsSubtitle}
        </Text>
        <View
          className={`mt-4 ${row} h-12 items-center gap-2.5 rounded-2xl bg-white px-4`}
          style={cardShadow}
        >
          <Ionicons name="search-outline" size={19} color="#64748B" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={copy.jobsSubtitle}
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
        <View className={`mt-4 ${row} gap-2`}>
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
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomInset + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={jobs.isRefetching}
            onRefresh={jobs.refetch}
            tintColor="#2F80F0"
          />
        }
        ListHeaderComponent={
          <Text className={`mb-3 mt-5 text-[16px] ${font.semibold} text-ink-900 ${align}`}>
            {copy.count(visible.length)}
          </Text>
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <View className="overflow-hidden rounded-2xl bg-white" style={cardShadow}>
            <JobRow job={item} onPress={() => onOpen(item.id)} />
          </View>
        )}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}
