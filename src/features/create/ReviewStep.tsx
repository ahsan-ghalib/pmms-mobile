import { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useLanguage } from '../../i18n/LanguageContext';
import { createCopy } from './createCopy';
import { PickedPhoto } from './PhotosStep';
import { slotLabel } from './ScheduleStep';
import { cardShadow, CategoryTile, localName } from './shared';
import { Category, Service, Slot } from './useCreateData';

export type StepKey = 'category' | 'details' | 'review' | 'success';

type Props = {
  category: Category;
  service: Service;
  priority: 'normal' | 'urgent';
  slot: Slot | null;
  photos: PickedPhoto[];
  description: string;
  locationLabel: string;
  onEdit: (step: StepKey) => void;
};

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function ReviewStep({
  category,
  service,
  priority,
  slot,
  photos,
  description,
  locationLabel,
  onEdit,
}: Props) {
  const { language, font } = useLanguage();
  const copy = createCopy[language];
  const urgent = priority === 'urgent';

  return (
    <View className="rounded-2xl bg-white px-4" style={cardShadow}>
      <ReviewRow
        leading={<CategoryTile category={category} size={36} />}
        label={copy.category}
        onPress={() => onEdit('category')}
      >
        {localName(category, language)}
      </ReviewRow>
      <ReviewRow icon="construct-outline" label={copy.service} onPress={() => onEdit('details')}>
        {localName(service, language)}
      </ReviewRow>
      <ReviewRow icon="flag-outline" label={copy.priority} onPress={() => onEdit('details')}>
        <View className={`rounded-md px-2.5 py-1 ${urgent ? 'bg-rose-50' : 'bg-brand-50'}`}>
          <Text
            className={`text-[12px] ${font.bold} ${urgent ? 'text-rose-600' : 'text-brand-600'}`}
          >
            {urgent ? copy.urgent : copy.normal}
          </Text>
        </View>
      </ReviewRow>
      <ReviewRow
        icon="calendar-outline"
        label={copy.dateTime}
        onPress={urgent ? undefined : () => onEdit('details')}
      >
        {urgent || !slot
          ? copy.notRequired
          : `${dayjs(slot.date).locale(language).format('ddd, D MMM YYYY')} · ${slotLabel(slot)}`}
      </ReviewRow>
      {locationLabel ? (
        <ReviewRow icon="location-outline" label={copy.location}>
          {locationLabel}
        </ReviewRow>
      ) : null}
      <ReviewRow icon="images-outline" label={copy.photos} onPress={() => onEdit('details')}>
        {photos.length ? (
          <View className="mt-1 flex-row gap-2">
            {photos.map((photo) => (
              <Image
                key={photo.uri}
                source={{ uri: photo.uri }}
                contentFit="cover"
                style={{ width: 56, height: 56, borderRadius: 10 }}
              />
            ))}
          </View>
        ) : (
          copy.noPhotos
        )}
      </ReviewRow>
      <ReviewRow
        icon="document-text-outline"
        label={copy.notes}
        onPress={() => onEdit('details')}
        last
      >
        {description.trim()}
      </ReviewRow>
    </View>
  );
}

function ReviewRow({
  icon,
  leading,
  label,
  children,
  onPress,
  last,
}: {
  icon?: IconName;
  leading?: ReactNode;
  label: string;
  children: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const { language, isAr, font, row, align } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`${row} items-start gap-3 py-3.5 ${last ? '' : 'border-b border-slate-100'}`}
    >
      {leading ?? (
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
          <Ionicons name={icon ?? 'ellipse-outline'} size={18} color="#1D6FE6" />
        </View>
      )}
      <View className="flex-1">
        <Text
          className={`text-[11px] ${font.semibold} uppercase tracking-wide text-ink-400 ${align}`}
        >
          {label}
        </Text>
        {typeof children === 'string' ? (
          <Text className={`mt-0.5 text-[14px] ${font.semibold} text-ink-900 ${align}`}>
            {children}
          </Text>
        ) : (
          <View className="mt-0.5" style={{ alignItems: isAr ? 'flex-end' : 'flex-start' }}>
            {children}
          </View>
        )}
      </View>
      {onPress ? (
        <Text className={`mt-2 text-[12px] ${font.semibold} text-brand-600`}>
          {createCopy[language].edit}
        </Text>
      ) : null}
    </Pressable>
  );
}
