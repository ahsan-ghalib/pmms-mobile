import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { homeCopy } from './homeCopy';
import { categoryVisual, Complaint, complaintTitle, formatDate, statusBadge } from './complaints';

export default function RequestRow({
  complaint,
  onPress,
}: {
  complaint: Complaint;
  onPress?: () => void;
}) {
  const { language, isAr, font, row, align } = useLanguage();
  const copy = homeCopy[language];
  const visual = categoryVisual(complaint);
  const badge = statusBadge(complaint, copy);
  const meta = [complaint.reference_no, complaint.unit?.name || complaint.property?.name]
    .filter(Boolean)
    .join(' • ');

  return (
    <Pressable
      onPress={onPress}
      className={`${row} items-center gap-3 px-4 py-3.5 active:bg-slate-50`}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: visual.bg }}
      >
        <Ionicons name={visual.icon} size={21} color={visual.color} />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className={`text-[14px] ${font.semibold} text-ink-900 ${align}`}>
          {complaintTitle(complaint, language)}
        </Text>
        <Text
          numberOfLines={1}
          className={`mt-0.5 text-[12px] ${font.regular} text-ink-500 ${align}`}
        >
          {meta}
        </Text>
        <Text className={`mt-0.5 text-[12px] ${font.regular} text-ink-400 ${align}`}>
          {formatDate(complaint.submitted_at || complaint.created_at, language)}
        </Text>
      </View>
      <View className={`${row} items-center gap-1 rounded-full px-2.5 py-1 ${badge.bg}`}>
        {badge.icon ? <Ionicons name={badge.icon} size={12} color={badge.iconColor} /> : null}
        <Text className={`text-[11px] ${font.medium} ${badge.text}`}>{badge.label}</Text>
      </View>
      <Ionicons name={isAr ? 'chevron-back' : 'chevron-forward'} size={18} color="#94A3B8" />
    </Pressable>
  );
}
