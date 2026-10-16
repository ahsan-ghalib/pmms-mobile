import { ComponentProps, ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { useLanguage } from '../../i18n/LanguageContext';
import { Complaint, complaintTitle, localizedName, visitWindow } from '../home/complaints';
import { homeCopy } from '../home/homeCopy';
import AcUnitIcon from './AcUnitIcon';
import AddNoteSheet from './AddNoteSheet';
import PhotoViewer from './PhotoViewer';
import { requestPill, requestTile } from './requestDisplay';
import { requestsCopy } from './requestsCopy';
import TrackSheet from './TrackSheet';
import { useComplaintDetail, useComplaintPhotoSource } from './useComplaintDetail';

type IconName = ComponentProps<typeof Ionicons>['name'];

const STEPS = ['submitted', 'assigned', 'in_progress', 'completed'] as const;
const STEP_INDEX: Record<string, number> = {
  submitted: 0,
  assigned: 1,
  in_progress: 2,
  on_hold: 2,
  completed: 3,
  verified: 3,
  closed: 3,
};

const cardShadow = {
  shadowColor: '#1E3A8A',
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 1,
};

function stepTime(complaint: Complaint, step: (typeof STEPS)[number]) {
  if (step === 'submitted') return complaint.submitted_at || complaint.created_at;
  if (step === 'assigned') return complaint.assigned_at;
  if (step === 'in_progress') return complaint.in_progress_at;
  return complaint.completed_at || complaint.verified_at || complaint.closed_at;
}

type Props = {
  complaintId: string;
  bottomInset: number;
  onBack: () => void;
  onComingSoon: () => void;
};

export default function RequestDetailScreen({
  complaintId,
  bottomInset,
  onBack,
  onComingSoon,
}: Props) {
  const insets = useSafeAreaInsets();
  const { language, isAr, font, row, align } = useLanguage();
  const copy = requestsCopy[language];
  const detail = copy.detail;
  const query = useComplaintDetail(complaintId);
  const photoSource = useComplaintPhotoSource(complaintId);
  const [noteOpen, setNoteOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const complaint = query.data;

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
      <Pressable
        disabled={!complaint}
        onPress={() =>
          complaint &&
          Share.share({
            message: detail.share(complaint.reference_no, complaintTitle(complaint, language)),
          })
        }
        className="h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-80"
        style={cardShadow}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color="#0B1930" />
      </Pressable>
    </View>
  );

  if (!complaint) {
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
                {detail.loadFailed}
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

  const tile = requestTile(complaint);
  const pill = requestPill(complaint, copy);
  const photos = complaint.photos ?? [];
  const sources = photos.map((photo) => photoSource(photo.id));
  const currentStep = STEP_INDEX[complaint.status] ?? 0;
  const finished = currentStep === STEPS.length - 1;
  const submittedAt = complaint.submitted_at || complaint.created_at;
  const actionsHeight = 60;

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
            onRefresh={query.refetch}
            tintColor="#2F80F0"
          />
        }
      >
        <View className="rounded-2xl bg-white p-4" style={cardShadow}>
          <View className={`${row} items-start gap-3.5`}>
            <View
              className="h-[58px] w-[58px] items-center justify-center rounded-2xl"
              style={{ backgroundColor: tile.bg }}
            >
              {tile.icon === 'ac-unit' ? (
                <AcUnitIcon size={32} color={tile.color} />
              ) : (
                <MaterialCommunityIcons name={tile.icon} size={30} color={tile.color} />
              )}
            </View>
            <View className="flex-1 pt-1">
              <Text className={`text-[17px] ${font.bold} text-ink-900 ${align}`}>
                {complaintTitle(complaint, language)}
              </Text>
              <Text className={`mt-1 text-[13px] ${font.regular} text-ink-500 ${align}`}>
                #{complaint.reference_no}
              </Text>
            </View>
            <View className={`rounded-full px-3 py-1.5 ${pill.bg}`}>
              <Text className={`text-[12px] ${font.medium} ${pill.text}`}>{pill.label}</Text>
            </View>
          </View>

          <View className={`mt-4 ${row} gap-3`}>
            <View className="flex-1 gap-2.5">
              {complaint.property?.name ? (
                <InfoLine icon="business-outline" text={complaint.property.name} />
              ) : null}
              {complaint.unit?.name ? (
                <InfoLine icon="grid-outline" text={complaint.unit.name} />
              ) : null}
              {complaint.category ? (
                <InfoLine
                  icon="pricetag-outline"
                  text={localizedName(complaint.category, language)}
                />
              ) : null}
            </View>
            <View className="flex-1 gap-2.5">
              <InfoLine
                icon="flag-outline"
                text={detail.priority[complaint.priority ?? 'normal'] ?? complaint.priority ?? ''}
                tone={complaint.priority === 'urgent' ? 'text-rose-600' : undefined}
              />
              {submittedAt ? (
                <InfoLine
                  icon="calendar-clear-outline"
                  text={copy.submitted(dayjs(submittedAt).locale(language).fromNow())}
                />
              ) : null}
              {complaint.supervisor_name ? (
                <InfoLine icon="person-outline" text={complaint.supervisor_name} />
              ) : null}
            </View>
          </View>

          <View className="my-4 h-px bg-slate-100" />
          <Text className={`text-[13px] ${font.medium} text-ink-500 ${align}`}>
            {detail.problem}
          </Text>
          <Text className={`mt-1.5 text-[14px] leading-5 ${font.regular} text-ink-900 ${align}`}>
            {complaint.description?.trim() || detail.noDescription}
          </Text>
        </View>

        <View className={`${row} items-center gap-4 rounded-2xl bg-white p-4`} style={cardShadow}>
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <Ionicons name="calendar-outline" size={26} color="#2F80F0" />
          </View>
          <View className="flex-1">
            <Text className={`text-[15px] ${font.semibold} text-ink-900 ${align}`}>
              {detail.visitTitle}
            </Text>
            <Text className={`mt-1 text-[13px] ${font.regular} text-ink-500 ${align}`}>
              {complaint.scheduled_date
                ? visitWindow(complaint, homeCopy[language], language)
                : detail.notScheduled}
            </Text>
          </View>
        </View>

        <Card title={detail.progress}>
          <View className={`${row} mt-4`}>
            {STEPS.map((step, index) => {
              const done = index < currentStep || (finished && index === currentStep);
              const current = index === currentStep && !finished;
              const time = stepTime(complaint, step);
              const sub = done
                ? time
                  ? dayjs(time).locale(language).fromNow()
                  : ''
                : current
                  ? complaint.status === 'on_hold'
                    ? detail.onHold
                    : detail.current
                  : detail.pending;
              const lineActive = index < currentStep;
              return (
                <View key={step} className="flex-1 items-center">
                  <View className={`${row} w-full items-center`}>
                    <View
                      className={`h-0.5 flex-1 ${index === 0 ? 'opacity-0' : index <= currentStep ? 'bg-brand-500' : 'bg-slate-200'}`}
                    />
                    {done ? (
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-500">
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      </View>
                    ) : current ? (
                      <View className="h-8 w-8 items-center justify-center rounded-full border-2 border-brand-500 bg-white">
                        <View className="h-3.5 w-3.5 rounded-full bg-brand-500" />
                      </View>
                    ) : (
                      <View className="h-8 w-8 rounded-full bg-slate-200" />
                    )}
                    <View
                      className={`h-0.5 flex-1 ${index === STEPS.length - 1 ? 'opacity-0' : lineActive ? 'bg-brand-500' : 'bg-slate-200'}`}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    className={`mt-2 text-[12px] ${font.medium} text-ink-900`}
                  >
                    {detail.steps[step]}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className={`mt-0.5 text-[11px] ${font.regular} text-ink-400`}
                  >
                    {sub}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        <Card
          title={detail.photos(photos.length)}
          action={photos.length ? detail.viewAll : undefined}
          onAction={() => setViewerIndex(0)}
        >
          {photos.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{
                gap: 10,
                flexDirection: isAr ? 'row-reverse' : 'row',
                flexGrow: 1,
              }}
            >
              {sources.map((source, index) => (
                <Pressable key={photos[index].id} onPress={() => setViewerIndex(index)}>
                  <Image
                    source={source}
                    contentFit="cover"
                    transition={150}
                    style={{ width: 112, height: 82, borderRadius: 12, backgroundColor: '#EEF2F7' }}
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View className={`mt-3 ${row} items-center gap-2`}>
              <Ionicons name="images-outline" size={18} color="#94A3B8" />
              <Text className={`text-[13px] ${font.regular} text-ink-500`}>{detail.noPhotos}</Text>
            </View>
          )}
        </Card>

        {complaint.notes?.length ? (
          <Card title={detail.notes}>
            <View className="mt-2">
              {complaint.notes.map((note, index) => (
                <View
                  key={note.id}
                  className={`py-2.5 ${index ? 'border-t border-slate-100' : ''}`}
                >
                  <Text className={`text-[14px] leading-5 ${font.regular} text-ink-900 ${align}`}>
                    {note.note}
                  </Text>
                  {note.created_at ? (
                    <Text className={`mt-1 text-[11px] ${font.regular} text-ink-400 ${align}`}>
                      {dayjs(note.created_at).locale(language).format('D MMM YYYY, h:mm A')}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <View className={`${row} items-center gap-3 rounded-2xl bg-white p-4`} style={cardShadow}>
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
            <Ionicons name="headset-outline" size={24} color="#10B981" />
          </View>
          <View className="flex-1">
            <Text className={`text-[14px] ${font.semibold} text-ink-900 ${align}`}>
              {detail.helpTitle}
            </Text>
            <Text className={`mt-0.5 text-[12px] ${font.regular} text-ink-500 ${align}`}>
              {detail.helpBody}
            </Text>
          </View>
          <Pressable
            onPress={onComingSoon}
            className={`${row} items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2.5`}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#1D6FE6" />
            <Text className={`text-[12px] ${font.semibold} text-brand-600`}>{detail.chat}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View
        className={`absolute left-0 right-0 ${row} gap-3 px-5`}
        style={{ bottom: bottomInset + 10 }}
      >
        <Pressable
          onPress={() => setTrackOpen(true)}
          className={`h-[52px] flex-1 ${row} items-center justify-center gap-2 rounded-2xl border border-brand-500 bg-white active:bg-brand-50`}
        >
          <Ionicons name="location-outline" size={19} color="#1D6FE6" />
          <Text className={`text-[15px] ${font.semibold} text-brand-600`}>{detail.track}</Text>
        </Pressable>
        <Pressable
          onPress={() => setNoteOpen(true)}
          className={`h-[52px] flex-1 ${row} items-center justify-center gap-2 rounded-2xl bg-brand-500 active:opacity-90`}
          style={{
            shadowColor: '#1D6FE6',
            shadowOpacity: 0.3,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          <Ionicons name="document-text-outline" size={19} color="#fff" />
          <Text className={`text-[15px] ${font.semibold} text-white`}>{detail.addNote}</Text>
        </Pressable>
      </View>

      <TrackSheet complaint={complaint} visible={trackOpen} onClose={() => setTrackOpen(false)} />
      <AddNoteSheet
        complaintId={complaint.id}
        visible={noteOpen}
        onClose={() => setNoteOpen(false)}
      />
      <PhotoViewer sources={sources} index={viewerIndex} onClose={() => setViewerIndex(null)} />
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

function Card({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  const { isAr, font, row } = useLanguage();
  return (
    <View className="rounded-2xl bg-white p-4" style={cardShadow}>
      <View className={`${row} items-center justify-between`}>
        <Text className={`text-[15px] ${font.semibold} text-ink-900`}>{title}</Text>
        {action ? (
          <Pressable onPress={onAction} hitSlop={8} className={`${row} items-center gap-1`}>
            <Text className={`text-[13px] ${font.semibold} text-brand-600`}>{action}</Text>
            <Ionicons name={isAr ? 'chevron-back' : 'chevron-forward'} size={14} color="#1D6FE6" />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
