import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useLanguage } from '../../i18n/LanguageContext';
import { createCopy } from './createCopy';
import { cardShadow } from './shared';
import { Slot } from './useCreateData';

type Props = {
  slots: Slot[];
  loading: boolean;
  date: string | null;
  onDate: (date: string) => void;
  slot: Slot | null;
  onSlot: (slot: Slot | null) => void;
};

export const slotLabel = (slot: Pick<Slot, 'start_time' | 'end_time'>) =>
  `${slot.start_time.slice(0, 5)} – ${slot.end_time.slice(0, 5)}`;

function slotState(slot: Slot) {
  if (slot.available) return 'available';
  if (slot.capacity !== null && slot.booked_count >= slot.capacity) return 'full';
  return 'unavailable';
}

export default function ScheduleStep({ slots, loading, date, onDate, slot, onSlot }: Props) {
  const { language, isAr, font, row, align } = useLanguage();
  const copy = createCopy[language];
  const [fullTapped, setFullTapped] = useState(false);

  const slotDates = useMemo(() => new Set(slots.map((item) => item.date)), [slots]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => dayjs().startOf('day').add(i, 'day')),
    [],
  );
  const daySlots = slots.filter((item) => item.date === date);
  const monthLabel = dayjs(date ?? undefined)
    .locale(language)
    .format('MMMM YYYY');

  return (
    <View className="gap-4">
      <View className="rounded-2xl bg-white p-4" style={cardShadow}>
        <View className={`${row} items-center justify-between`}>
          <Text className={`text-[16px] ${font.bold} text-ink-900`}>{copy.selectDate}</Text>
          <Text className={`text-[13px] ${font.medium} text-ink-500`}>{monthLabel}</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{
            flexGrow: 1,
            flexDirection: isAr ? 'row-reverse' : 'row',
            gap: 6,
          }}
        >
          {days.map((day) => {
            const key = day.format('YYYY-MM-DD');
            const enabled = slotDates.has(key);
            const selected = key === date;
            return (
              <Pressable
                key={key}
                disabled={!enabled}
                onPress={() => {
                  setFullTapped(false);
                  onDate(key);
                }}
                className="flex-1 items-center gap-1.5 py-1"
                style={{ minWidth: 40 }}
              >
                <Text
                  className={`text-[11px] ${font.medium} ${enabled ? 'text-ink-500' : 'text-slate-300'}`}
                >
                  {day.locale(language).format('ddd')}
                </Text>
                <View
                  className={`h-9 w-9 items-center justify-center rounded-full ${
                    selected ? 'bg-brand-600' : enabled ? 'bg-brand-50' : ''
                  }`}
                >
                  <Text
                    className={`text-[14px] ${font.semibold} ${
                      selected ? 'text-white' : enabled ? 'text-ink-900' : 'text-slate-300'
                    }`}
                  >
                    {day.format('D')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View className="rounded-2xl bg-white p-4" style={cardShadow}>
        <Text className={`text-[16px] ${font.bold} text-ink-900 ${align}`}>
          {copy.availableSlots}
        </Text>
        {loading ? (
          <ActivityIndicator className="my-6" color="#2F80F0" />
        ) : daySlots.length === 0 || daySlots.every((item) => !item.available) ? (
          <View className={`mt-3 ${row} gap-2 rounded-xl bg-amber-50 px-3 py-2.5`}>
            <Ionicons name="alert-circle" size={17} color="#D97706" />
            <Text
              className={`flex-1 text-[12px] leading-[17px] ${font.medium} text-amber-800 ${align}`}
            >
              {copy.noSlots}
            </Text>
          </View>
        ) : null}
        {!loading && daySlots.length ? (
          <View className={`mt-3 ${row} flex-wrap`} style={{ marginHorizontal: -5 }}>
            {daySlots.map((item) => {
              const state = slotState(item);
              const selected = slot?.date === item.date && slot.start_time === item.start_time;
              const remaining =
                item.capacity === null ? null : Math.max(item.capacity - item.booked_count, 0);
              const tone =
                state === 'full'
                  ? 'border-rose-200 bg-rose-50'
                  : state === 'unavailable'
                    ? 'border-slate-100 bg-slate-50'
                    : selected
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-emerald-200 bg-emerald-50/60';
              return (
                <View key={item.start_time} style={{ width: '50%', padding: 5 }}>
                  <Pressable
                    onPress={() => {
                      if (state === 'full') {
                        setFullTapped(true);
                        onSlot(null);
                        return;
                      }
                      if (state === 'available') {
                        setFullTapped(false);
                        onSlot(item);
                      }
                    }}
                    className={`items-center rounded-xl border px-2 py-2.5 ${tone}`}
                  >
                    <Text
                      className={`text-[14px] ${font.semibold} ${
                        state === 'unavailable'
                          ? 'text-slate-400'
                          : state === 'full'
                            ? 'text-rose-600'
                            : 'text-ink-900'
                      }`}
                    >
                      {slotLabel(item)}
                    </Text>
                    <Text
                      className={`mt-0.5 text-[11px] ${font.regular} ${
                        state === 'full'
                          ? 'text-rose-500'
                          : state === 'unavailable'
                            ? 'text-slate-400'
                            : 'text-emerald-600'
                      }`}
                    >
                      {state === 'full'
                        ? copy.slotFull
                        : state === 'unavailable'
                          ? copy.slotUnavailable
                          : copy.slotAvailable(remaining)}
                    </Text>
                    {selected ? (
                      <View className="absolute right-2 top-2">
                        <Ionicons name="checkmark-circle" size={16} color="#1D6FE6" />
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}
        {fullTapped ? (
          <View className={`mt-3 ${row} gap-2 rounded-xl bg-amber-50 px-3 py-2.5`}>
            <Ionicons name="warning" size={17} color="#D97706" />
            <Text
              className={`flex-1 text-[12px] leading-[17px] ${font.medium} text-amber-800 ${align}`}
            >
              {copy.slotFullWarning}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
