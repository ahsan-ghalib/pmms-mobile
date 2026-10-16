import { ComponentProps, useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../i18n/LanguageContext';
import { ApiError } from '../../lib/api';
import { useAuth } from '../auth/AuthContext';
import { homeCopy } from './homeCopy';
import RequestRow from './RequestRow';
import SupportIllustration from './SupportIllustration';
import {
  DONE_STATUSES,
  OPEN_STATUSES,
  PROGRESS_STATUSES,
  upcomingVisit,
  visitWindow,
  complaintTitle,
} from './complaints';
import { useComplaintContext, useComplaints, useNotifications } from './useTenantHome';

const appIcon = require('../../../assets/images/auth/app-icon.webp');
const heroImage = require('../../../assets/images/auth/login-hero.webp');

type IconName = ComponentProps<typeof Ionicons>['name'];

const cardShadow = {
  shadowColor: '#1E3A8A',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

type Props = {
  bottomInset: number;
  onOpenRequests: () => void;
  onOpenRequest: (id: string) => void;
  onOpenNotifications: () => void;
  onComingSoon: () => void;
  onCreateRequest: () => void;
  onEmergency: () => void;
};

export default function HomeScreen({
  bottomInset,
  onOpenRequests,
  onOpenRequest,
  onOpenNotifications,
  onComingSoon,
  onCreateRequest,
  onEmergency,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { language, isAr, font, row, align } = useLanguage();
  const { user } = useAuth();
  const copy = homeCopy[language];

  const complaints = useComplaints();
  const context = useComplaintContext();
  const notifications = useNotifications();

  const list = useMemo(() => complaints.data ?? [], [complaints.data]);
  const stats = useMemo(
    () => ({
      open: list.filter((row) => OPEN_STATUSES.includes(row.status)).length,
      progress: list.filter((row) => PROGRESS_STATUSES.includes(row.status)).length,
      done: list.filter((row) => DONE_STATUSES.includes(row.status)).length,
    }),
    [list],
  );
  const visit = useMemo(() => upcomingVisit(list), [list]);
  const hasUnread = (notifications.data ?? []).some((item) => !item.read_at);
  const locked = complaints.error instanceof ApiError && complaints.error.status === 403;

  const property = context.data?.default?.property?.name;
  const unit = context.data?.default?.unit?.name;
  const locationLabel = [property, unit].filter(Boolean).join(' • ') || copy.noProperty;
  const firstName = (user?.name || '').split(' ')[0];

  const refreshing = complaints.isRefetching || context.isRefetching || notifications.isRefetching;
  const refresh = () => {
    complaints.refetch();
    context.refetch();
    notifications.refetch();
  };

  const heroWidth = Math.min(width * 0.38, 170);
  const heroSide = isAr ? { left: -width * 0.04 } : { right: -width * 0.04 };
  const chevron: IconName = isAr ? 'chevron-back' : 'chevron-forward';

  return (
    <View className="flex-1 bg-[#F6F9FE]">
      <LinearGradient
        colors={['#E4EFFE', '#F6F9FE']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }}
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: bottomInset + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#2F80F0" />
        }
      >
        <Image
          source={heroImage}
          contentFit="contain"
          style={{
            position: 'absolute',
            top: insets.top + 50,
            width: heroWidth,
            height: heroWidth * 1.27,
            ...heroSide,
          }}
        />

        <View className={`${row} items-center gap-2 px-5`}>
          <View className={`${row} flex-1 items-center gap-2`}>
            <Image source={appIcon} style={{ width: 34, height: 34 }} contentFit="contain" />
            <View>
              <Text className={`text-[17px] ${font.extrabold} text-brand-700 ${align}`}>PMMS</Text>
              <Text className={`text-[8px] leading-[10px] ${font.medium} text-ink-500 ${align}`}>
                {copy.brandSubtitle}
              </Text>
            </View>
          </View>
          <Pressable
            className={`${row} max-w-[56%] items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2`}
          >
            <Ionicons name="location-outline" size={15} color="#334155" />
            <Text numberOfLines={1} className={`shrink text-[12px] ${font.medium} text-ink-700`}>
              {locationLabel}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#64748B" />
          </Pressable>
          <Pressable
            onPress={onOpenNotifications}
            className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
          >
            <Ionicons name="notifications-outline" size={19} color="#0B1930" />
            {hasUnread ? (
              <View className="absolute right-2.5 top-2 h-2 w-2 rounded-full border border-white bg-rose-500" />
            ) : null}
          </Pressable>
        </View>

        <View
          className="mt-7 px-5"
          style={{ maxWidth: width * 0.72, alignSelf: isAr ? 'flex-end' : 'flex-start' }}
        >
          <Text className={`text-[27px] ${font.extrabold} text-ink-900 ${align}`}>
            {copy.hello(firstName)} 👋
          </Text>
          <Text
            className={`mt-2 text-[14px] leading-5 ${font.regular} text-ink-500 ${align}`}
            style={{ maxWidth: width * 0.56, alignSelf: isAr ? 'flex-end' : 'flex-start' }}
          >
            {copy.greetingSubtitle}
          </Text>
        </View>

        <View className="mt-12 px-5">
          <LinearGradient
            colors={['#DCEAFE', '#EEF5FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, overflow: 'hidden' }}
          >
            <View className={`${row} items-center p-5`}>
              <View className="flex-1">
                <Text className={`text-[17px] ${font.bold} text-ink-900 ${align}`}>
                  {copy.supportTitle}
                </Text>
                <Text
                  className={`mt-1.5 text-[13px] leading-[19px] ${font.regular} text-ink-500 ${align}`}
                >
                  {copy.supportBody}
                </Text>
                <Pressable
                  onPress={onCreateRequest}
                  className={`mt-4 ${row} items-center gap-2 self-start rounded-full bg-brand-600 px-4 py-2.5 active:opacity-90`}
                  style={{ alignSelf: isAr ? 'flex-end' : 'flex-start' }}
                >
                  <Text className={`text-[13px] ${font.semibold} text-white`}>
                    {copy.reportIssue}
                  </Text>
                  <Ionicons name={isAr ? 'arrow-back' : 'arrow-forward'} size={15} color="#fff" />
                </Pressable>
              </View>
              <SupportIllustration size={Math.min(width * 0.3, 124)} />
            </View>
          </LinearGradient>
        </View>

        <View className={`mt-4 ${row} gap-3 px-5`}>
          <StatCard
            icon="document-text-outline"
            color="#2F80F0"
            bg="bg-brand-50"
            value={stats.open}
            label={copy.openRequests}
          />
          <StatCard
            icon="time-outline"
            color="#F59E0B"
            bg="bg-amber-50"
            value={stats.progress}
            label={copy.inProgress}
          />
          <StatCard
            icon="checkmark-circle-outline"
            color="#10B981"
            bg="bg-emerald-50"
            value={stats.done}
            label={copy.completed}
          />
        </View>

        <SectionHeader title={copy.quickActions} action={copy.seeAll} onAction={onComingSoon} />
        <View className={`${row} gap-3 px-5`}>
          <QuickAction
            icon="add"
            color="#2F80F0"
            bg="bg-brand-50"
            label={copy.newComplaint}
            onPress={onCreateRequest}
          />
          <QuickAction
            icon="locate-outline"
            color="#10B981"
            bg="bg-emerald-50"
            label={copy.trackRequest}
            onPress={onOpenRequests}
          />
          <QuickAction
            icon="warning-outline"
            color="#F43F5E"
            bg="bg-rose-50"
            label={copy.emergency}
            onPress={onEmergency}
          />
          <QuickAction
            icon="business-outline"
            color="#8B5CF6"
            bg="bg-violet-50"
            label={copy.myUnits}
            onPress={onComingSoon}
          />
        </View>

        <SectionHeader title={copy.myRequests} action={copy.seeAll} onAction={onOpenRequests} />
        <View className="mx-5 overflow-hidden rounded-2xl bg-white" style={cardShadow}>
          {complaints.isError ? (
            locked ? (
              <EmptyState
                icon="lock-closed-outline"
                title={copy.featureLocked}
                body={copy.featureLockedBody}
              />
            ) : (
              <EmptyState icon="cloud-offline-outline" title={copy.loadFailed} body={copy.retry} />
            )
          ) : list.length === 0 && !complaints.isLoading ? (
            <EmptyState
              icon="clipboard-outline"
              title={copy.noRequests}
              body={copy.noRequestsBody}
            />
          ) : (
            list.slice(0, 3).map((complaint, index) => (
              <View key={complaint.id}>
                {index > 0 ? <View className="mx-4 h-px bg-slate-100" /> : null}
                <RequestRow complaint={complaint} onPress={() => onOpenRequest(complaint.id)} />
              </View>
            ))
          )}
        </View>

        <SectionHeader title={copy.upcomingVisit} />
        <View className="mx-5 rounded-2xl bg-white p-4" style={cardShadow}>
          {visit ? (
            <View className={`${row} items-center gap-3`}>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
                <Ionicons name="calendar-outline" size={22} color="#2F80F0" />
              </View>
              <View className="flex-1">
                <Text className={`text-[14px] ${font.bold} text-ink-900 ${align}`}>
                  {visitWindow(visit, copy, language)}
                </Text>
                <Text
                  numberOfLines={1}
                  className={`mt-0.5 text-[13px] ${font.regular} text-ink-700 ${align}`}
                >
                  {complaintTitle(visit, language)}
                </Text>
                <Text
                  numberOfLines={1}
                  className={`mt-0.5 text-[12px] ${font.regular} text-ink-400 ${align}`}
                >
                  {[visit.unit?.name, visit.property?.name].filter(Boolean).join(' • ')}
                </Text>
              </View>
              <Pressable
                onPress={() => onOpenRequest(visit.id)}
                className="rounded-full border border-brand-500 px-3.5 py-2 active:bg-brand-50"
              >
                <Text className={`text-[12px] ${font.semibold} text-brand-600`}>
                  {copy.viewDetails}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className={`${row} items-center gap-3`}>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                <Ionicons name="calendar-clear-outline" size={22} color="#94A3B8" />
              </View>
              <View className="flex-1">
                <Text className={`text-[14px] ${font.semibold} text-ink-900 ${align}`}>
                  {copy.noVisit}
                </Text>
                <Text className={`mt-0.5 text-[12px] ${font.regular} text-ink-500 ${align}`}>
                  {copy.noVisitBody}
                </Text>
              </View>
              <Ionicons name={chevron} size={18} color="#CBD5E1" />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon,
  color,
  bg,
  value,
  label,
}: {
  icon: IconName;
  color: string;
  bg: string;
  value: number;
  label: string;
}) {
  const { font, row, align } = useLanguage();
  return (
    <View className="flex-1 rounded-2xl bg-white p-3" style={cardShadow}>
      <View className={`${row} items-center gap-2`}>
        <View className={`h-9 w-9 items-center justify-center rounded-full ${bg}`}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text className={`text-[22px] ${font.bold} text-ink-900`}>{value}</Text>
      </View>
      <Text numberOfLines={1} className={`mt-2 text-[12px] ${font.medium} text-ink-500 ${align}`}>
        {label}
      </Text>
    </View>
  );
}

function QuickAction({
  icon,
  color,
  bg,
  label,
  onPress,
}: {
  icon: IconName;
  color: string;
  bg: string;
  label: string;
  onPress: () => void;
}) {
  const { font } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center rounded-2xl bg-white px-1 py-4 active:opacity-80"
      style={cardShadow}
    >
      <View className={`h-11 w-11 items-center justify-center rounded-full ${bg}`}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text
        numberOfLines={2}
        className={`mt-2.5 text-center text-[12px] leading-4 ${font.medium} text-ink-700`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { font, row } = useLanguage();
  return (
    <View className={`${row} mb-3 mt-6 items-center justify-between px-5`}>
      <Text className={`text-[17px] ${font.bold} text-ink-900`}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text className={`text-[13px] ${font.semibold} text-brand-600`}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptyState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  const { font } = useLanguage();
  return (
    <View className="items-center px-6 py-8">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-50">
        <Ionicons name={icon} size={22} color="#94A3B8" />
      </View>
      <Text className={`mt-3 text-[14px] ${font.semibold} text-ink-900`}>{title}</Text>
      <Text className={`mt-1 text-center text-[12px] ${font.regular} text-ink-500`}>{body}</Text>
    </View>
  );
}
