import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../i18n/LanguageContext';
import { createCopy } from './createCopy';

type Props = {
  reference: string;
  onViewComplaints: () => void;
  onHome: () => void;
};

export default function SuccessStep({ reference, onViewComplaints, onHome }: Props) {
  const insets = useSafeAreaInsets();
  const { language, font } = useLanguage();
  const copy = createCopy[language];

  return (
    <View
      className="flex-1 bg-[#F6F9FE] px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) }}
    >
      <View className="flex-1 items-center justify-center">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-emerald-100">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-emerald-500">
            <Ionicons name="checkmark" size={46} color="#fff" />
          </View>
        </View>
        <Text className={`mt-7 text-center text-[22px] ${font.extrabold} text-ink-900`}>
          {copy.submittedTitle}
        </Text>
        <Text className={`mt-2 text-center text-[14px] leading-5 ${font.regular} text-ink-500`}>
          {copy.submittedBody}
        </Text>
        <View className="mt-7 w-full items-center rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <Text className={`text-[11px] ${font.semibold} uppercase tracking-wider text-ink-400`}>
            {copy.requestId}
          </Text>
          <Text selectable className={`mt-1 text-[20px] ${font.extrabold} text-ink-900`}>
            #{reference}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onViewComplaints}
        className="h-[52px] items-center justify-center rounded-2xl bg-brand-600 active:opacity-90"
      >
        <Text className={`text-[16px] ${font.semibold} text-white`}>{copy.viewComplaints}</Text>
      </Pressable>
      <Pressable
        onPress={onHome}
        className="mt-3 h-[52px] items-center justify-center rounded-2xl border border-brand-500 bg-white active:bg-brand-50"
      >
        <Text className={`text-[16px] ${font.semibold} text-brand-600`}>{copy.backHome}</Text>
      </Pressable>
    </View>
  );
}
