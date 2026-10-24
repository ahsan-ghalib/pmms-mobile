import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../i18n/LanguageContext';
import { IssuedBalance, formatQty, useRecordUsage } from './parts';
import QtyStepper from './QtyStepper';
import { technicianCopy } from './technicianCopy';

type Props = {
  jobId: string;
  visible: boolean;
  balances: IssuedBalance[];
  onClose: () => void;
};

export default function RecordUsageSheet({ jobId, visible, balances, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { language, font, row, align } = useLanguage();
  const copy = technicianCopy[language];
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const record = useRecordUsage(jobId);

  const open = balances.filter((item) => item.available > 0);
  const items = Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([part_id, quantity]) => ({ part_id, quantity }));

  const save = () => {
    if (!items.length) {
      Toast.show({ type: 'error', text1: copy.parts.usageEmpty });
      return;
    }
    record.mutate(
      { items },
      {
        onSuccess: () => {
          onClose();
          Toast.show({ type: 'success', text1: copy.parts.usageSaved });
        },
        onError: (error) =>
          Toast.show({ type: 'error', text1: copy.detail.actionFailed, text2: error.message }),
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable className="flex-1 bg-black/30" onPress={onClose} />
        <View
          className="max-h-[85%] rounded-t-3xl bg-white px-5 pt-3"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-slate-200" />
          <Text className={`text-[18px] ${font.bold} text-ink-900 ${align}`}>
            {copy.parts.usageTitle}
          </Text>
          <Text
            className={`mt-1 text-[12.5px] leading-[18px] ${font.regular} text-ink-500 ${align}`}
          >
            {copy.parts.usageSubtitle}
          </Text>
          <ScrollView
            className="mt-3"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          >
            {open.map((item) => (
              <View
                key={item.part_id}
                className={`${row} items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3`}
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <Ionicons name="cube-outline" size={19} color="#059669" />
                </View>
                <View className="flex-1">
                  <Text
                    numberOfLines={1}
                    className={`text-[14px] ${font.semibold} text-ink-900 ${align}`}
                  >
                    {item.name}
                  </Text>
                  <Text className={`text-[12px] ${font.regular} text-ink-500 ${align}`}>
                    {copy.parts.available(formatQty(item.available, item.unit))}
                  </Text>
                </View>
                <QtyStepper
                  value={quantities[item.part_id] ?? 0}
                  max={item.available}
                  onChange={(next) => setQuantities((prev) => ({ ...prev, [item.part_id]: next }))}
                />
              </View>
            ))}
          </ScrollView>
          <Pressable
            onPress={save}
            disabled={record.isPending}
            className={`mt-4 h-[52px] ${row} items-center justify-center gap-2 rounded-2xl ${items.length ? 'bg-emerald-600' : 'bg-emerald-200'}`}
          >
            {record.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text className={`text-[15px] ${font.semibold} text-white`}>
                  {copy.parts.saveUsage}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
