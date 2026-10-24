import { ComponentProps, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';
import { useLanguage } from '../../i18n/LanguageContext';
import { ApiError } from '../../lib/api';
import { useAuth } from '../auth/AuthContext';
import { cardShadow } from '../create/shared';
import { homeCopy } from '../home/homeCopy';
import { useNotifications } from '../home/useTenantHome';
import JobRow, { JobPill, JobTile } from './JobRow';
import {
  ACTIVE_STATUSES,
  DONE_STATUSES,
  isOverdue,
  Job,
  jobPlace,
  jobTitle,
  jobWindow,
  scheduleSortKey,
} from './jobs';
import { technicianCopy } from './technicianCopy';
import { useDuty, useDutyToggle, useTechnicianJobs } from './useTechnician';

const appIcon = require('../../../assets/images/auth/app-icon.webp');
type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  bottomInset: number;
  onOpenJob: (id: string) => void;
  onOpenJobs: () => void;
  onOpenNotifications: () => void;
};

function greetingFor(hour: number) {
  if (hour < 12) return 'morning' as const;
  if (hour < 17) return 'afternoon' as const;
  return 'evening' as const;
}

export default function TechnicianHomeScreen({
  bottomInset,
  onOpenJob,
  onOpenJobs,
  onOpenNotifications,
}: Props) {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, isAr, font, row, align } = useLanguage();
  const { user } = useAuth();
  const copy = technicianCopy[language];

  const jobs = useTechnicianJobs();
  const duty = useDuty();
  const notifications = useNotifications();
  const dutyToggle = useDutyToggle();

  const list = useMemo(() => jobs.data ?? [], [jobs.data]);
  const currentId = duty.data?.session?.current_work_order_id;
  const current = useMemo(
    () =>
      list.find((job) => job.status === 'in_progress') ??
      list.find((job) => job.id === currentId && ACTIVE_STATUSES.includes(job.status)) ??
      null,
    [list, currentId],
  );
  const upcoming = useMemo(
    () =>
      list
        .filter((job) => ACTIVE_STATUSES.includes(job.status) && job.id !== current?.id)
        .sort(
          (a, b) =>
            Number(isOverdue(b)) - Number(isOverdue(a)) || scheduleSortKey(a) - scheduleSortKey(b),
        ),
    [list, current],
  );
  const stats = useMemo(
    () => ({
      assigned: list.filter((job) => ['created', 'assigned', 'reopened'].includes(job.status))
        .length,
      progress: list.filter((job) => ['in_progress', 'on_hold'].includes(job.status)).length,
      completed: list.filter((job) => DONE_STATUSES.includes(job.status)).length,
      overdue: list.filter((job) => isOverdue(job)).length,
    }),
    [list],
  );

  const unreadCount = (notifications.data ?? []).filter((item) => !item.read_at).length;
  const locked = jobs.error instanceof ApiError && jobs.error.status === 403;
  const onDuty = Boolean(duty.data?.on_duty);
  const firstName = (user?.name || '').split(' ')[0];
  const initials = (user?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const avatarUri = user?.avatar && /^https?:\/\//.test(user.avatar) ? user.avatar : null;
  const now = dayjs().locale(language);

  const refreshing = jobs.isRefetching || duty.isRefetching || notifications.isRefetching;
  const refresh = () => {
    jobs.refetch();
    duty.refetch();
    notifications.refetch();
  };

  const setDuty = (next: { on: boolean; privacyAccepted?: boolean }) =>
    dutyToggle.mutate(next, {
      onSuccess: () =>
        Toast.show({ type: 'success', text1: next.on ? copy.dutyOnToast : copy.dutyOffToast }),
      onError: (error) =>
        Toast.show({ type: 'error', text1: copy.dutyFailed, text2: error.message }),
    });

  const toggleDuty = () => {
    if (!duty.data || dutyToggle.isPending) return;
    if (duty.data.on_duty) {
      Alert.alert(copy.offDutyTitle, copy.offDutyMessage, [
        { text: copy.cancel, style: 'cancel' },
        { text: copy.goOffDuty, style: 'destructive', onPress: () => setDuty({ on: false }) },
      ]);
    } else if (!duty.data.privacy_notice_accepted) {
      Alert.alert(copy.privacyTitle, duty.data.privacy_notice, [
        { text: copy.cancel, style: 'cancel' },
        { text: copy.privacyAccept, onPress: () => setDuty({ on: true, privacyAccepted: true }) },
      ]);
    } else {
      setDuty({ on: true });
    }
  };

  const dutyLine = onDuty
    ? duty.data?.session?.started_at
      ? copy.onDutySince(dayjs(duty.data.session.started_at).locale(language).format('h:mm A'))
      : copy.onDuty
    : copy.offDutyBody;

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
        <View className={`${row} items-center gap-2 px-5`}>
          <View className={`${row} flex-1 items-center gap-2`}>
            <Image source={appIcon} style={{ width: 34, height: 34 }} contentFit="contain" />
            <View>
              <Text className={`text-[17px] ${font.extrabold} text-brand-700 ${align}`}>PMMS</Text>
              <Text className={`text-[8px] leading-[10px] ${font.medium} text-ink-500 ${align}`}>
                {homeCopy[language].brandSubtitle}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center rounded-full border border-slate-200 bg-white p-1">
            {(['en', 'ar'] as const).map((code) => (
              <Pressable
                key={code}
                onPress={() => setLanguage(code)}
                className={`rounded-full px-2.5 py-1 ${language === code ? 'bg-brand-600' : ''}`}
              >
                <Text
                  className={`text-[12px] ${code === 'ar' ? 'font-cairo-bold' : 'font-inter-semibold'} ${language === code ? 'text-white' : 'text-ink-500'}`}
                >
                  {code === 'en' ? 'EN' : 'عربي'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={onOpenNotifications}
            className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
          >
            <Ionicons name="notifications-outline" size={19} color="#0B1930" />
            {unreadCount > 0 ? (
              <View className="absolute -right-1 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#EAF2FE] bg-rose-500 px-1">
                <Text className="font-inter-bold text-[9px] text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View className={`mt-5 ${row} items-center gap-3 px-5`}>
          <View>
            <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-brand-600">
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{ width: 56, height: 56 }}
                  contentFit="cover"
                />
              ) : (
                <Text className={`text-[18px] ${font.extrabold} text-white`}>{initials}</Text>
              )}
            </View>
            <View
              className={`absolute bottom-0.5 ${isAr ? 'left-0.5' : 'right-0.5'} h-3.5 w-3.5 rounded-full border-2 border-white ${onDuty ? 'bg-emerald-500' : 'bg-slate-300'}`}
            />
          </View>
          <View className="shrink">
            <Text className={`text-[13px] ${font.medium} text-ink-500 ${align}`}>
              {copy.greeting[greetingFor(now.hour())]}
            </Text>
            <Text className={`text-[22px] ${font.extrabold} text-ink-900 ${align}`}>
              {firstName} 👋
            </Text>
            <View className={`${row} mt-1`}>
              <View className={`${row} items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5`}>
                <Ionicons name="construct-outline" size={11} color="#1D6FE6" />
                <Text className={`text-[11px] ${font.semibold} text-brand-600`}>{copy.role}</Text>
              </View>
            </View>
          </View>
        </View>

        {duty.data ? (
          <View
            className={`mx-5 mt-5 ${row} items-center gap-3 rounded-2xl bg-white p-4`}
            style={cardShadow}
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
              <Ionicons name="calendar-outline" size={22} color="#2F80F0" />
            </View>
            <View className="flex-1">
              <Text className={`text-[15px] ${font.bold} text-ink-900 ${align}`}>
                {now.format('dddd, D MMM')}
              </Text>
              <Text
                numberOfLines={2}
                className={`mt-0.5 text-[12px] ${font.regular} ${onDuty ? 'text-emerald-600' : 'text-ink-500'} ${align}`}
              >
                {dutyLine}
              </Text>
            </View>
            <DutySwitch on={onDuty} pending={dutyToggle.isPending} onPress={toggleDuty} />
          </View>
        ) : null}

        <View className="mt-4 gap-3 px-5">
          <View className={`${row} gap-3`}>
            <StatCard
              icon="clipboard-outline"
              color="#2F80F0"
              bg="bg-brand-50"
              value={stats.assigned}
              label={copy.stats.assigned}
            />
            <StatCard
              icon="build-outline"
              color="#F59E0B"
              bg="bg-amber-50"
              value={stats.progress}
              label={copy.stats.in_progress}
            />
          </View>
          <View className={`${row} gap-3`}>
            <StatCard
              icon="checkmark-circle-outline"
              color="#10B981"
              bg="bg-emerald-50"
              value={stats.completed}
              label={copy.stats.completed}
            />
            <StatCard
              icon="alert-circle-outline"
              color="#F43F5E"
              bg="bg-rose-50"
              value={stats.overdue}
              label={copy.stats.overdue}
            />
          </View>
        </View>

        {current ? (
          <>
            <SectionHeader title={copy.currentJob} />
            <CurrentJobCard job={current} onPress={() => onOpenJob(current.id)} />
          </>
        ) : null}

        <SectionHeader title={copy.assignedJobs} action={copy.viewAll} onAction={onOpenJobs} />
        <View className="mx-5 overflow-hidden rounded-2xl bg-white" style={cardShadow}>
          {jobs.isError ? (
            locked ? (
              <EmptyState
                icon="lock-closed-outline"
                title={copy.lockedTitle}
                body={copy.lockedBody}
              />
            ) : (
              <EmptyState icon="cloud-offline-outline" title={copy.loadFailed} body={copy.retry} />
            )
          ) : jobs.isLoading ? (
            <View className="py-10">
              <ActivityIndicator color="#2F80F0" />
            </View>
          ) : upcoming.length === 0 ? (
            list.length === 0 ? (
              <EmptyState
                icon="clipboard-outline"
                title={copy.noJobsTitle}
                body={copy.noJobsBody}
              />
            ) : (
              <EmptyState
                icon="checkmark-done-outline"
                title={copy.allCaughtUp}
                body={copy.allCaughtUpBody}
              />
            )
          ) : (
            upcoming.slice(0, 5).map((job, index) => (
              <View key={job.id}>
                {index > 0 ? <View className="mx-4 h-px bg-slate-100" /> : null}
                <JobRow job={job} onPress={() => onOpenJob(job.id)} />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DutySwitch({
  on,
  pending,
  onPress,
}: {
  on: boolean;
  pending: boolean;
  onPress: () => void;
}) {
  const { language, font } = useLanguage();
  const copy = technicianCopy[language];
  return (
    <Pressable
      onPress={onPress}
      disabled={pending}
      className={`h-9 min-w-[96px] flex-row items-center rounded-full px-1 ${on ? 'bg-emerald-500' : 'bg-slate-200'}`}
      style={{ justifyContent: on ? 'flex-end' : 'flex-start' }}
    >
      {on ? (
        <Text className={`flex-1 px-2 text-center text-[12px] ${font.semibold} text-white`}>
          {copy.onDuty}
        </Text>
      ) : null}
      <View className="h-7 w-7 items-center justify-center rounded-full bg-white">
        {pending ? (
          <ActivityIndicator size="small" color={on ? '#10B981' : '#64748B'} />
        ) : (
          <Ionicons name="power" size={14} color={on ? '#10B981' : '#64748B'} />
        )}
      </View>
      {!on ? (
        <Text className={`flex-1 px-2 text-center text-[12px] ${font.semibold} text-ink-500`}>
          {copy.offDuty}
        </Text>
      ) : null}
    </Pressable>
  );
}

function CurrentJobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const { language, isAr, font, row, align } = useLanguage();
  const copy = technicianCopy[language];
  const place = jobPlace(job);
  return (
    <View
      className="mx-5 overflow-hidden rounded-2xl"
      style={{ ...cardShadow, shadowOpacity: 0.12 }}
    >
      <LinearGradient
        colors={['#1D4ED8', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
      >
        <View className={`${row} items-start gap-3`}>
          <View className="rounded-2xl bg-white p-0.5">
            <JobTile job={job} size={46} />
          </View>
          <View className="flex-1">
            <View className={`${row} items-center justify-between gap-2`}>
              <Text className={`text-[12px] ${font.medium} text-white/80`}>
                #{job.work_order_no}
              </Text>
              <JobPill job={job} />
            </View>
            <Text
              numberOfLines={1}
              className={`mt-0.5 text-[16px] ${font.bold} text-white ${align}`}
            >
              {jobTitle(job, language, copy)}
            </Text>
            {place ? (
              <View className={`${row} mt-1 items-center gap-1`}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
                <Text
                  numberOfLines={1}
                  className={`shrink text-[12px] ${font.regular} text-white/90 ${align}`}
                >
                  {place}
                </Text>
              </View>
            ) : null}
            <View className={`${row} mt-0.5 items-center gap-1`}>
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text
                numberOfLines={1}
                className={`shrink text-[12px] ${font.regular} text-white/90`}
              >
                {jobWindow(job, copy, language)}
              </Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={onPress}
          className={`mt-4 h-11 ${row} items-center justify-center gap-2 rounded-xl bg-white active:opacity-90`}
        >
          <Text className={`text-[14px] ${font.semibold} text-brand-600`}>{copy.continue}</Text>
          <Ionicons name={isAr ? 'arrow-back' : 'arrow-forward'} size={16} color="#1D6FE6" />
        </Pressable>
      </LinearGradient>
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
    <View
      className={`flex-1 ${row} items-center gap-3 rounded-2xl bg-white p-3.5`}
      style={cardShadow}
    >
      <View className={`h-10 w-10 items-center justify-center rounded-full ${bg}`}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View className="flex-1">
        <Text className={`text-[20px] leading-6 ${font.bold} text-ink-900 ${align}`}>{value}</Text>
        <Text numberOfLines={1} className={`text-[12px] ${font.medium} text-ink-500 ${align}`}>
          {label}
        </Text>
      </View>
    </View>
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
