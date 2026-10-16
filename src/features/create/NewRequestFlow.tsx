import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../i18n/LanguageContext';
import { ApiError, apiUpload } from '../../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useComplaintContext } from '../home/useTenantHome';
import CategoryStep from './CategoryStep';
import { createCopy } from './createCopy';
import PhotosStep, { PickedPhoto } from './PhotosStep';
import ReviewStep, { StepKey } from './ReviewStep';
import ScheduleStep from './ScheduleStep';
import ServiceStep from './ServiceStep';
import { FooterButton, localName, PriorityBadge, SummaryRow } from './shared';
import SuccessStep from './SuccessStep';
import { Category, Service, Slot, useCategories, useSlots } from './useCreateData';

type Props = {
  onClose: () => void;
  onHome: () => void;
  onViewComplaints: () => void;
};

export default function NewRequestFlow({ onClose, onHome, onViewComplaints }: Props) {
  const insets = useSafeAreaInsets();
  const { language, isAr, font, row } = useLanguage();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const copy = createCopy[language];

  const categories = useCategories();
  const context = useComplaintContext();

  const [step, setStep] = useState<StepKey>('category');
  const [category, setCategory] = useState<Category | null>(null);
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState('');

  const slots = useSlots(category?.id ?? null);
  const slotList = useMemo(() => slots.data ?? [], [slots.data]);
  const firstOpenDate = slotList.find((item) => item.available)?.date ?? slotList[0]?.date ?? null;
  const activeDate = date ?? firstOpenDate;

  const order: StepKey[] =
    priority === 'normal'
      ? ['category', 'service', 'schedule', 'photos', 'review']
      : ['category', 'service', 'photos', 'review'];
  const index = Math.max(order.indexOf(step), 0);

  const back = () => {
    if (index === 0) onClose();
    else setStep(order[index - 1]);
  };

  useEffect(() => {
    if (step === 'success') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  });

  const selectCategory = (next: Category) => {
    if (next.id !== category?.id) {
      setService(null);
      setSlot(null);
      setDate(null);
      setPriority(next.normal_priority_enabled ? 'normal' : 'urgent');
    }
    setCategory(next);
    setStep('service');
  };

  const defaults = context.data?.default;
  const locationLabel = [defaults?.property?.name, defaults?.unit?.name]
    .filter(Boolean)
    .join(' • ');

  const submit = async (confirmDuplicate = false) => {
    if (!category || !service) return;
    const propertyId = defaults?.property_id ?? defaults?.property?.id;
    if (!propertyId) {
      Toast.show({ type: 'error', text1: copy.submitFailed, text2: copy.noProperty });
      return;
    }
    const form = new FormData();
    form.append('property_id', propertyId);
    const unitId = defaults?.unit_id ?? defaults?.unit?.id;
    if (unitId) form.append('unit_id', unitId);
    form.append('category_id', category.id);
    form.append('service_id', service.id);
    form.append('priority', priority);
    form.append('description', description.trim());
    if (priority === 'normal' && slot) {
      form.append('scheduled_date', slot.date);
      form.append('scheduled_start_time', slot.start_time);
      form.append('scheduled_end_time', slot.end_time);
    }
    if (confirmDuplicate) form.append('confirm_duplicate', '1');
    photos.forEach((photo) => form.append('photos[]', photo as unknown as Blob));

    setSubmitting(true);
    try {
      const json = await apiUpload<{ data: { reference_no: string } }>('/complaints', form, {
        token,
        language,
      });
      setReference(json.data.reference_no);
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setStep('success');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'duplicate_warning') {
        Alert.alert(copy.duplicateTitle, error.message, [
          { text: copy.cancel, style: 'cancel' },
          { text: copy.duplicateConfirm, onPress: () => submit(true) },
        ]);
      } else {
        Toast.show({ type: 'error', text1: copy.submitFailed, text2: (error as Error).message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <SuccessStep reference={reference} onViewComplaints={onViewComplaints} onHome={onHome} />
    );
  }

  const titles: Record<StepKey, string> = {
    category: copy.newRequest,
    service: localName(category, language) || copy.newRequest,
    schedule: localName(service, language) || copy.newRequest,
    photos: copy.addPhotos,
    review: copy.review,
    success: '',
  };

  const canContinue =
    step === 'service'
      ? Boolean(service)
      : step === 'schedule'
        ? Boolean(slot)
        : step === 'photos'
          ? description.trim().length >= 5
          : step === 'review';

  const next = () => {
    if (step === 'review') submit();
    else setStep(order[index + 1]);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F6F9FE]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top + 6 }}>
        <View className={`${row} items-center px-5 pb-3`}>
          <Pressable
            onPress={back}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full bg-white active:opacity-80"
          >
            <Ionicons
              name={index === 0 ? 'close' : isAr ? 'chevron-forward' : 'chevron-back'}
              size={22}
              color="#0B1930"
            />
          </Pressable>
          <Text
            numberOfLines={1}
            className={`flex-1 px-3 text-center text-[17px] ${font.bold} text-ink-900`}
          >
            {titles[step]}
          </Text>
          <View className="w-10" />
        </View>
        <View className={`${row} gap-1.5 px-5`}>
          {order.map((key, i) => (
            <View
              key={key}
              className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-brand-500' : 'bg-slate-200'}`}
            />
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 'category' ? (
          <CategoryStep
            categories={categories.data ?? []}
            loading={categories.isLoading}
            selectedId={category?.id}
            onSelect={selectCategory}
          />
        ) : null}

        {step === 'service' && category ? (
          <ServiceStep
            category={category}
            priority={priority}
            onPriority={setPriority}
            serviceId={service?.id}
            onService={setService}
          />
        ) : null}

        {step === 'schedule' && category ? (
          <>
            <SummaryRow
              category={category}
              title={localName(service, language)}
              badge={<PriorityBadge priority="normal" label={copy.normal} />}
            />
            <ScheduleStep
              slots={slotList}
              loading={slots.isLoading}
              date={activeDate}
              onDate={(value) => {
                setDate(value);
                setSlot(null);
              }}
              slot={slot}
              onSlot={setSlot}
            />
          </>
        ) : null}

        {step === 'photos' ? (
          <PhotosStep
            photos={photos}
            onPhotos={setPhotos}
            description={description}
            onDescription={setDescription}
          />
        ) : null}

        {step === 'review' && category && service ? (
          <ReviewStep
            category={category}
            service={service}
            priority={priority}
            slot={slot}
            photos={photos}
            description={description}
            locationLabel={locationLabel}
            onEdit={setStep}
          />
        ) : null}
      </ScrollView>

      {step !== 'category' ? (
        <FooterButton
          label={step === 'review' ? copy.submit : copy.next}
          onPress={next}
          disabled={!canContinue}
          loading={submitting}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}
