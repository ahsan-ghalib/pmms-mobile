import { ComponentProps, ReactNode, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';
import { useLanguage } from '../../i18n/LanguageContext';
import { cardShadow } from '../create/shared';
import { homeCopy } from '../home/homeCopy';
import AssetScannerSheet from './AssetScannerSheet';
import CompleteJobSheet from './CompleteJobSheet';
import HoldSheet from './HoldSheet';
import { JobPill, JobTile } from './JobRow';
import { formatDistance, jobPlace, jobTitle, jobWindow, localized } from './jobs';
import { issuedBalances } from './parts';
import PartsCard from './PartsCard';
import RecordUsageSheet from './RecordUsageSheet';
import { technicianCopy } from './technicianCopy';
import TextInputSheet from './TextInputSheet';
import { currentCoordinates, useDuty, useJob, useJobAction } from './useTechnician';

type IconName = ComponentProps<typeof Ionicons>['name'];
type SheetKind = 'reject' | 'note' | 'asset' | 'reschedule' | 'acceptReschedule';
type Action = { key: string; label: string; icon: IconName; onPress: () => void; tone?: 'danger' };

const FINISHED = ['completed', 'verified', 'closed', 'cancelled'];

type Props = {
  jobId: string;
  bottomInset: number;
  onBack: () => void;
};

export default function JobDetailScreen({ jobId, bottomInset, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { language, isAr, font, row, align } = useLanguage();
  const copy = technicianCopy[language];
  const detail = copy.detail;
  const query = useJob(jobId);
  const duty = useDuty();
  const action = useJobAction(jobId);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [completing, setCompleting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [holding, setHolding] = useState<'hold' | 'parts' | null>(null);
  const [recording, setRecording] = useState(false);

  const job = query.data;

  const run = (key: string, success: string, body?: Record<string, unknown>) =>
    action.mutate(
      { action: key, body },
      {
        onSuccess: () => {
          setSheet(null);
          Toast.show({ type: 'success', text1: success });
        },
        onError: (error) =>
          Toast.show({ type: 'error', text1: detail.actionFailed, text2: error.message }),
      },
    );

  const acceptAndReschedule = async (reason: string) => {
    try {
      await action.mutateAsync({ action: 'accept' });
      await action.mutateAsync({ action: 'reschedule-requests', body: { reason } });
      setSheet(null);
      Toast.show({ type: 'success', text1: detail.acceptedRescheduled });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: detail.actionFailed,
        text2: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const scanAsset = (code: string) => {
    setScanError(null);
    action.mutate(
      { action: 'scan-asset', body: { code } },
      {
        onSuccess: () => {
          setScanning(false);
          Toast.show({ type: 'success', text1: detail.assetOk, text2: code });
        },
        onError: (error) => setScanError(error.message),
      },
    );
  };

  const checkIn = async () => {
    setLocating(true);
    const coords = await currentCoordinates().catch(() => null);
    setLocating(false);
    if (!coords) {
      Toast.show({ type: 'error', text1: detail.locationNeeded, text2: detail.locationNeededBody });
      return;
    }
    run('check-in', detail.checkedInToast, coords);
  };

  const canAct = Boolean(job) && !job?.readonly && !FINISHED.includes(job?.status ?? '');

  const header = (
    <View className={`${row} items-center gap-3 px-5 pb-3`} style={{ paddingTop: insets.top + 8 }}>
      <Pressable
        onPress={onBack}
        className="h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-80"
        style={cardShadow}
      >
        <Ionicons name={isAr ? 'chevron-forward' : 'chevron-back'} size={22} color="#0B1930" />
      </Pressable>
      <Text className={`flex-1 text-[22px] ${font.extrabold} text-ink-900 ${align}`}>
        {detail.title}
      </Text>
      {canAct ? (
        <Pressable
          onPress={() => setSheet('note')}
          className="h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-80"
          style={cardShadow}
        >
          <Ionicons name="create-outline" size={20} color="#0B1930" />
        </Pressable>
      ) : null}
    </View>
  );

  if (!job) {
    return (
      <View className="flex-1 bg-[#F6F9FE]">
        {header}
        <View
          className="flex-1 items-center justify-center px-8"
          style={{ paddingBottom: bottomInset }}
        >
          {query.isError ? (
            <>
              <Ionicons name="cloud-offline-outline" size={30} color="#94A3B8" />
              <Text className={`mt-3 text-[15px] ${font.semibold} text-ink-900`}>
                {copy.loadFailed}
              </Text>
              <Text className={`mt-1 text-center text-[13px] ${font.regular} text-ink-500`}>
                {query.error.message}
              </Text>
              <Pressable
                onPress={() => query.refetch()}
                className="mt-4 rounded-full bg-brand-600 px-5 py-2.5"
              >
                <Text className={`text-[13px] ${font.semibold} text-white`}>
                  {homeCopy[language].retry}
                </Text>
              </Pressable>
            </>
          ) : (
            <ActivityIndicator color="#2F80F0" />
          )}
        </View>
      </View>
    );
  }

  const settings = job.company_settings;
  const onDuty = Boolean(duty.data?.on_duty);
  const notStarted = ['created', 'assigned'].includes(job.status);
  const accepted = Boolean(job.accepted_at);
  const checkins = [...(job.checkins ?? [])].sort(
    (a, b) => dayjs(b.checked_in_at).valueOf() - dayjs(a.checked_in_at).valueOf(),
  );
  const lastCheckin = checkins[0];
  const needsAsset = Boolean(settings?.require_asset_scan_to_start || job.asset_id);
  const assetOk = Boolean(job.asset_validated_at);
  const team = (job.assignments ?? []).filter((item) => !item.removed_at);
  const place = jobPlace(job);
  const needsDuty = canAct && !onDuty && notStarted;
  const latestReschedule = job.reschedule_requests?.[0];
  const reschedulePending = latestReschedule?.status === 'pending';
  const showAcceptReschedule = canAct && notStarted && !accepted;
  const canRequestChange = canAct && notStarted && accepted && !reschedulePending;
  const canRequestParts = canAct && ['in_progress', 'on_hold'].includes(job.status);
  const balances = issuedBalances(job.part_requests);

  const actions: Action[] = [];
  if (canAct) {
    if (notStarted && !accepted) {
      actions.push(
        {
          key: 'reject',
          label: detail.reject,
          icon: 'close-circle-outline',
          tone: 'danger',
          onPress: () => setSheet('reject'),
        },
        {
          key: 'accept',
          label: detail.accept,
          icon: 'checkmark-circle-outline',
          onPress: () => run('accept', detail.accepted),
        },
      );
    } else if (notStarted) {
      const steps: Action[] = [];
      if (!lastCheckin) {
        steps.push({
          key: 'check-in',
          label: detail.checkIn,
          icon: 'navigate-outline',
          onPress: checkIn,
        });
      }
      if (needsAsset && !assetOk) {
        steps.push({
          key: 'asset',
          label: detail.scanAsset,
          icon: 'qr-code-outline',
          onPress: () => {
            setScanError(null);
            setScanning(true);
          },
        });
      }
      actions.push(...steps.slice(0, 1));
      if ((lastCheckin || !settings?.require_gps_checkin) && (!needsAsset || assetOk)) {
        actions.push({
          key: 'start',
          label: detail.start,
          icon: 'play-circle-outline',
          onPress: () => run('start', detail.started),
        });
      }
    } else if (job.status === 'in_progress') {
      actions.push(
        {
          key: 'hold',
          label: detail.hold,
          icon: 'pause-circle-outline',
          onPress: () => setHolding('hold'),
        },
        {
          key: 'complete',
          label: detail.complete,
          icon: 'checkmark-done',
          onPress: () => setCompleting(true),
        },
      );
    } else if (job.status === 'on_hold') {
      actions.push({
        key: 'resume',
        label: detail.resume,
        icon: 'play-circle-outline',
        onPress: () => run('resume', detail.resumed),
      });
    }
  }
  const visibleActions = actions.slice(-2);
  const busy = action.isPending || locating;
  const actionsHeight = (visibleActions.length ? 60 : 0) + (showAcceptReschedule ? 62 : 0);

  const sheetConfig: Record<
    SheetKind,
    { title: string; placeholder: string; submit: (v: string) => void }
  > = {
    reject: {
      title: detail.rejectTitle,
      placeholder: detail.rejectPlaceholder,
      submit: (reason) => run('reject', detail.rejected, { reason }),
    },
    note: {
      title: detail.noteTitle,
      placeholder: detail.notePlaceholder,
      submit: (note) => run('notes', detail.noteAdded, { note }),
    },
    reschedule: {
      title: detail.rescheduleTitle,
      placeholder: detail.reschedulePlaceholder,
      submit: (reason) => run('reschedule-requests', detail.rescheduleSent, { reason }),
    },
    acceptReschedule: {
      title: detail.rescheduleTitle,
      placeholder: detail.reschedulePlaceholder,
      submit: acceptAndReschedule,
    },
    asset: {
      title: detail.assetTitle,
      placeholder: detail.assetPlaceholder,
      submit: (code) => run('scan-asset', detail.assetOk, { code }),
    },
  };

  return (
    <View className="flex-1 bg-[#F6F9FE]">
      {header}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: bottomInset + actionsHeight + 24,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              query.refetch();
              duty.refetch();
            }}
            tintColor="#2F80F0"
          />
        }
      >
        <View className="rounded-2xl bg-white p-4" style={cardShadow}>
          <View className={`${row} items-start gap-3.5`}>
            <JobTile job={job} size={58} />
            <View className="flex-1 pt-1">
              <Text className={`text-[17px] ${font.bold} text-ink-900 ${align}`}>
                {jobTitle(job, language, copy)}
              </Text>
              <Text className={`mt-1 text-[13px] ${font.regular} text-ink-500 ${align}`}>
                #{job.work_order_no}
              </Text>
            </View>
            <JobPill job={job} />
          </View>
          <View className={`mt-4 ${row} gap-3`}>
            <View className="flex-1 gap-2.5">
              {job.property?.name ? (
                <InfoLine icon="business-outline" text={job.property.name} />
              ) : null}
              {place && (job.unit?.name || job.sub_location?.name) ? (
                <InfoLine
                  icon="grid-outline"
                  text={job.unit?.name || job.sub_location?.name || ''}
                />
              ) : null}
              {job.location?.name ? <InfoLine icon="map-outline" text={job.location.name} /> : null}
            </View>
            <View className="flex-1 gap-2.5">
              {job.category ? (
                <InfoLine icon="pricetag-outline" text={localized(job.category, language)} />
              ) : null}
              <InfoLine
                icon="flag-outline"
                text={detail.priority[job.priority ?? 'normal'] ?? job.priority ?? ''}
                tone={job.priority && job.priority !== 'normal' ? 'text-rose-600' : undefined}
              />
              {formatDistance(job.proximity_meters) ? (
                <InfoLine
                  icon="navigate-outline"
                  text={copy.away(formatDistance(job.proximity_meters) as string)}
                />
              ) : null}
            </View>
          </View>
        </View>

        {needsDuty ? <Banner icon="power" tone="amber" text={detail.offDutyHint} /> : null}
        {job.readonly ? <Banner icon="people-outline" tone="slate" text={detail.readonly} /> : null}
        {FINISHED.includes(job.status) ? (
          <Banner icon="checkmark-done-outline" tone="violet" text={detail.finished} />
        ) : null}

        <View className={`${row} items-center gap-4 rounded-2xl bg-white p-4`} style={cardShadow}>
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <Ionicons name="calendar-outline" size={26} color="#2F80F0" />
          </View>
          <View className="flex-1">
            <Text className={`text-[15px] ${font.semibold} text-ink-900 ${align}`}>
              {detail.schedule}
            </Text>
            <Text className={`mt-1 text-[13px] ${font.regular} text-ink-500 ${align}`}>
              {jobWindow(job, copy, language)}
            </Text>
            {reschedulePending ? (
              <Text className={`mt-1 text-[12px] ${font.medium} text-amber-700 ${align}`}>
                {detail.reschedulePending}
              </Text>
            ) : latestReschedule?.status === 'rejected' ? (
              <Text className={`mt-1 text-[12px] ${font.medium} text-rose-600 ${align}`}>
                {detail.rescheduleRejected(latestReschedule.review_reason ?? '')}
              </Text>
            ) : null}
          </View>
          {canRequestChange ? (
            <Pressable
              onPress={() => setSheet('reschedule')}
              className="rounded-full border border-brand-500 px-3 py-2 active:bg-brand-50"
            >
              <Text className={`text-[12px] ${font.semibold} text-brand-600`}>
                {detail.requestChange}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Card title={detail.description}>
          <Text className={`mt-2 text-[14px] leading-5 ${font.regular} text-ink-900 ${align}`}>
            {job.description?.trim() || detail.noDescription}
          </Text>
          {job.status === 'on_hold' && job.hold_reason ? (
            <View className={`mt-3 ${row} items-start gap-2 rounded-xl bg-amber-50 p-3`}>
              <Ionicons name="pause-circle-outline" size={16} color="#B45309" />
              <Text className={`flex-1 text-[13px] ${font.medium} text-amber-800 ${align}`}>
                {detail.holdReason}: {job.hold_reason}
              </Text>
            </View>
          ) : null}
          {job.service_summary ? (
            <>
              <Text className={`mt-3 text-[13px] ${font.medium} text-ink-500 ${align}`}>
                {detail.summary}
              </Text>
              <Text className={`mt-1 text-[14px] leading-5 ${font.regular} text-ink-900 ${align}`}>
                {job.service_summary}
              </Text>
            </>
          ) : null}
        </Card>

        <PartsCard
          job={job}
          canRequest={canRequestParts}
          canRecord={canAct}
          onRequest={() => setHolding('parts')}
          onRecord={() => setRecording(true)}
        />

        <Card title={detail.onSite}>
          <View className={`mt-3 ${row} items-center gap-3`}>
            <View
              className={`h-10 w-10 items-center justify-center rounded-full ${lastCheckin ? 'bg-emerald-50' : 'bg-slate-50'}`}
            >
              <Ionicons
                name={lastCheckin ? 'location' : 'location-outline'}
                size={19}
                color={lastCheckin ? '#10B981' : '#94A3B8'}
              />
            </View>
            <View className="flex-1">
              <Text className={`text-[14px] ${font.semibold} text-ink-900 ${align}`}>
                {lastCheckin
                  ? detail.checkedIn(
                      dayjs(lastCheckin.checked_in_at).locale(language).format('h:mm A'),
                    )
                  : detail.notCheckedIn}
              </Text>
              <Text className={`mt-0.5 text-[12px] ${font.regular} text-ink-500 ${align}`}>
                {lastCheckin
                  ? formatDistance(lastCheckin.distance_from_site_meters)
                    ? copy.away(formatDistance(lastCheckin.distance_from_site_meters) as string)
                    : dayjs(lastCheckin.checked_in_at).locale(language).format('D MMM YYYY')
                  : detail.checkinHint}
              </Text>
            </View>
          </View>
          {needsAsset ? (
            <View className={`mt-3 ${row} items-center gap-3 border-t border-slate-100 pt-3`}>
              <View
                className={`h-10 w-10 items-center justify-center rounded-full ${assetOk ? 'bg-emerald-50' : 'bg-amber-50'}`}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={18}
                  color={assetOk ? '#10B981' : '#D97706'}
                />
              </View>
              <View className="flex-1">
                <Text className={`text-[14px] ${font.semibold} text-ink-900 ${align}`}>
                  {job.asset ? `${job.asset.name} · ${job.asset.asset_code}` : detail.asset}
                </Text>
                <Text
                  className={`mt-0.5 text-[12px] ${font.regular} ${assetOk ? 'text-emerald-600' : 'text-amber-700'} ${align}`}
                >
                  {assetOk ? detail.assetValidated : detail.assetPending}
                </Text>
              </View>
            </View>
          ) : null}
        </Card>

        {team.length ? (
          <Card title={detail.team}>
            <View className="mt-2">
              {team.map((member, index) => (
                <View
                  key={member.id}
                  className={`${row} items-center gap-3 py-2.5 ${index ? 'border-t border-slate-100' : ''}`}
                >
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-50">
                    <Text className={`text-[13px] ${font.bold} text-brand-600`}>
                      {(member.technician_name || '?').slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <Text className={`flex-1 text-[14px] ${font.medium} text-ink-900 ${align}`}>
                    {member.technician_name}
                  </Text>
                  <View
                    className={`rounded-full px-2.5 py-1 ${member.assignment_type === 'primary' ? 'bg-brand-50' : 'bg-slate-100'}`}
                  >
                    <Text
                      className={`text-[11px] ${font.semibold} ${member.assignment_type === 'primary' ? 'text-brand-600' : 'text-slate-600'}`}
                    >
                      {member.assignment_type === 'primary' ? detail.primary : detail.coworker}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        ) : null}
      </ScrollView>

      {showAcceptReschedule ? (
        <View className="absolute left-0 right-0 px-5" style={{ bottom: bottomInset + 72 }}>
          <Pressable
            onPress={() => setSheet('acceptReschedule')}
            disabled={busy}
            className={`h-[52px] ${row} items-center justify-center gap-2 rounded-2xl border border-brand-500 bg-white active:bg-brand-50`}
          >
            <Ionicons name="calendar-outline" size={19} color="#1D6FE6" />
            <Text className={`text-[15px] ${font.semibold} text-brand-600`}>
              {detail.acceptReschedule}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {visibleActions.length ? (
        <View
          className={`absolute left-0 right-0 ${row} gap-3 px-5`}
          style={{ bottom: bottomInset + 10 }}
        >
          {visibleActions.map((item, index) => {
            const primary = index === visibleActions.length - 1;
            const danger = item.tone === 'danger';
            return (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                disabled={busy}
                className={`h-[52px] flex-1 ${row} items-center justify-center gap-2 rounded-2xl ${
                  primary
                    ? 'bg-brand-500 active:opacity-90'
                    : danger
                      ? 'border border-rose-300 bg-white active:bg-rose-50'
                      : 'border border-brand-500 bg-white active:bg-brand-50'
                }`}
                style={
                  primary
                    ? {
                        shadowColor: '#1D6FE6',
                        shadowOpacity: 0.3,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 6,
                      }
                    : undefined
                }
              >
                {busy && primary ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={item.icon}
                      size={19}
                      color={primary ? '#fff' : danger ? '#E11D48' : '#1D6FE6'}
                    />
                    <Text
                      className={`text-[15px] ${font.semibold} ${primary ? 'text-white' : danger ? 'text-rose-600' : 'text-brand-600'}`}
                    >
                      {item.label}
                    </Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <TextInputSheet
        key={sheet ?? 'closed'}
        visible={sheet !== null}
        title={sheet ? sheetConfig[sheet].title : ''}
        placeholder={sheet ? sheetConfig[sheet].placeholder : ''}
        submitLabel={detail.submit}
        pending={action.isPending}
        multiline={sheet !== 'asset'}
        destructive={sheet === 'reject'}
        onSubmit={(value) => sheet && sheetConfig[sheet].submit(value)}
        onClose={() => setSheet(null)}
      />
      <AssetScannerSheet
        visible={scanning}
        pending={action.isPending}
        error={scanError}
        onScanned={scanAsset}
        onManual={() => {
          setScanning(false);
          setSheet('asset');
        }}
        onClose={() => setScanning(false)}
      />
      <HoldSheet
        key={holding ?? 'closed'}
        jobId={job.id}
        visible={holding !== null}
        partsOnly={holding === 'parts'}
        onClose={() => setHolding(null)}
      />
      <RecordUsageSheet
        key={recording ? 'open' : 'closed'}
        jobId={job.id}
        visible={recording}
        balances={balances}
        onClose={() => setRecording(false)}
      />
      <CompleteJobSheet
        key={completing ? 'open' : 'closed'}
        job={job}
        visible={completing}
        onClose={() => setCompleting(false)}
        onCompleted={() => setCompleting(false)}
      />
    </View>
  );
}

function InfoLine({ icon, text, tone }: { icon: IconName; text: string; tone?: string }) {
  const { font, row } = useLanguage();
  return (
    <View className={`${row} items-start gap-2`}>
      <Ionicons name={icon} size={16} color="#64748B" />
      <Text
        numberOfLines={2}
        className={`shrink text-[13px] ${font.regular} ${tone ?? 'text-ink-700'}`}
      >
        {text}
      </Text>
    </View>
  );
}

const BANNER_TONES = {
  amber: { bg: 'bg-amber-50', text: 'text-amber-800', icon: '#B45309' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-700', icon: '#475569' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', icon: '#7C3AED' },
};

function Banner({
  icon,
  tone,
  text,
}: {
  icon: IconName;
  tone: keyof typeof BANNER_TONES;
  text: string;
}) {
  const { font, row, align } = useLanguage();
  const palette = BANNER_TONES[tone];
  return (
    <View className={`${row} items-center gap-3 rounded-2xl p-3.5 ${palette.bg}`}>
      <Ionicons name={icon} size={18} color={palette.icon} />
      <Text className={`flex-1 text-[13px] leading-[18px] ${font.medium} ${palette.text} ${align}`}>
        {text}
      </Text>
    </View>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  const { font, align } = useLanguage();
  return (
    <View className="rounded-2xl bg-white p-4" style={cardShadow}>
      <Text className={`text-[15px] ${font.semibold} text-ink-900 ${align}`}>{title}</Text>
      {children}
    </View>
  );
}
