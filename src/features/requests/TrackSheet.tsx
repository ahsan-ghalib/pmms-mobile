import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { useLanguage } from '../../i18n/LanguageContext';
import { Complaint } from '../home/complaints';
import { homeCopy } from '../home/homeCopy';
import { requestsCopy } from './requestsCopy';

export default function TrackSheet({
  complaint,
  visible,
  onClose,
}: {
  complaint: Complaint;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { language, font, row, align } = useLanguage();
  const copy = requestsCopy[language].detail;
  const statusLabels = homeCopy[language].status as Record<string, string>;
  const history = [...(complaint.status_history ?? [])].sort(
    (a, b) => dayjs(b.changed_at).valueOf() - dayjs(a.changed_at).valueOf(),
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/30" onPress={onClose} />
      <View
        className="max-h-[70%] rounded-t-3xl bg-white px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="mb-4 h-1 w-10 self-center rounded-full bg-slate-200" />
        <Text className={`text-[18px] ${font.bold} text-ink-900 ${align}`}>{copy.trackTitle}</Text>
        <Text className={`mt-0.5 text-[13px] ${font.regular} text-ink-500 ${align}`}>
          #{complaint.reference_no}
        </Text>
        <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
          {history.length === 0 ? (
            <Text className={`py-6 text-center text-[13px] ${font.regular} text-ink-500`}>
              {copy.noHistory}
            </Text>
          ) : (
            history.map((event, index) => (
              <View key={event.id} className={`${row} gap-3`}>
                <View className="items-center">
                  <View
                    className={`mt-1 h-3 w-3 rounded-full ${index === 0 ? 'bg-brand-500' : 'bg-slate-300'}`}
                  />
                  {index < history.length - 1 ? (
                    <View className="w-0.5 flex-1 bg-slate-200" />
                  ) : null}
                </View>
                <View className="flex-1 pb-5">
                  <Text className={`text-[14px] ${font.semibold} text-ink-900 ${align}`}>
                    {statusLabels[event.to_status] ?? event.to_status}
                  </Text>
                  {event.changed_at ? (
                    <Text className={`mt-0.5 text-[12px] ${font.regular} text-ink-400 ${align}`}>
                      {dayjs(event.changed_at).locale(language).format('D MMM YYYY, h:mm A')}
                    </Text>
                  ) : null}
                  {event.notes ? (
                    <Text className={`mt-1 text-[13px] ${font.regular} text-ink-700 ${align}`}>
                      {event.notes}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
