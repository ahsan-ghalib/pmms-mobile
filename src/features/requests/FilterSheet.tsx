import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../i18n/LanguageContext';
import { RequestPriority, requestsCopy, RequestSort } from './requestsCopy';

type Props = {
  visible: boolean;
  sort: RequestSort;
  priority: RequestPriority;
  onClose: () => void;
  onApply: (sort: RequestSort, priority: RequestPriority) => void;
};

export default function FilterSheet({ visible, sort, priority, onClose, onApply }: Props) {
  const insets = useSafeAreaInsets();
  const { language, font, row, align } = useLanguage();
  const copy = requestsCopy[language];
  const [draftSort, setDraftSort] = useState(sort);
  const [draftPriority, setDraftPriority] = useState(priority);

  const handleShow = () => {
    setDraftSort(sort);
    setDraftPriority(priority);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={handleShow}
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/30" onPress={onClose} />
      <View
        className="rounded-t-3xl bg-white px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <View className="mb-4 h-1 w-10 self-center rounded-full bg-slate-200" />
        <View className={`${row} items-center justify-between`}>
          <Text className={`text-[18px] ${font.bold} text-ink-900`}>{copy.filterTitle}</Text>
          <Pressable
            hitSlop={8}
            onPress={() => {
              setDraftSort('latest');
              setDraftPriority('all');
            }}
          >
            <Text className={`text-[13px] ${font.semibold} text-brand-600`}>{copy.reset}</Text>
          </Pressable>
        </View>

        <Text className={`mt-5 text-[13px] ${font.semibold} text-ink-500 ${align}`}>
          {copy.sortTitle}
        </Text>
        <View className="mt-2 overflow-hidden rounded-2xl border border-slate-100">
          {(Object.keys(copy.sort) as RequestSort[]).map((key, index) => (
            <Pressable
              key={key}
              onPress={() => setDraftSort(key)}
              className={`${row} items-center justify-between px-4 py-3.5 ${index ? 'border-t border-slate-100' : ''}`}
            >
              <Text className={`text-[14px] ${font.medium} text-ink-900`}>{copy.sort[key]}</Text>
              <Ionicons
                name={draftSort === key ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={draftSort === key ? '#1D6FE6' : '#CBD5E1'}
              />
            </Pressable>
          ))}
        </View>

        <Text className={`mt-5 text-[13px] ${font.semibold} text-ink-500 ${align}`}>
          {copy.priorityTitle}
        </Text>
        <View className={`mt-2 ${row} gap-2`}>
          {(Object.keys(copy.priority) as RequestPriority[]).map((key) => {
            const selected = draftPriority === key;
            return (
              <Pressable
                key={key}
                onPress={() => setDraftPriority(key)}
                className={`flex-1 items-center rounded-full py-2.5 ${selected ? 'bg-brand-500' : 'bg-[#EEF2F8]'}`}
              >
                <Text
                  className={`text-[13px] ${font.semibold} ${selected ? 'text-white' : 'text-ink-700'}`}
                >
                  {copy.priority[key]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => onApply(draftSort, draftPriority)}
          className="mt-6 items-center rounded-full bg-brand-600 py-3.5 active:opacity-90"
        >
          <Text className={`text-[15px] ${font.semibold} text-white`}>{copy.apply}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
