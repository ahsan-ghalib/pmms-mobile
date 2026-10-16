import { Pressable, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import AcUnitIcon from './AcUnitIcon';
import { Complaint, complaintTitle } from '../home/complaints';
import { requestActivity, requestPill, requestTile } from './requestDisplay';
import { requestsCopy } from './requestsCopy';

export default function RequestCard({
  complaint,
  onPress,
}: {
  complaint: Complaint;
  onPress?: () => void;
}) {
  const { language, isAr, font, row, align } = useLanguage();
  const copy = requestsCopy[language];
  const tile = requestTile(complaint);
  const pill = requestPill(complaint, copy);
  const place = [complaint.property?.name, complaint.unit?.name].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      className={`${row} items-center gap-3.5 rounded-2xl bg-white p-3.5 active:opacity-90`}
      style={{
        shadowColor: '#1E3A8A',
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 1,
      }}
    >
      <View
        className="h-[54px] w-[54px] items-center justify-center rounded-2xl"
        style={{ backgroundColor: tile.bg }}
      >
        {tile.icon === 'ac-unit' ? (
          <AcUnitIcon size={30} color={tile.color} />
        ) : (
          <MaterialCommunityIcons name={tile.icon} size={28} color={tile.color} />
        )}
      </View>

      <View className="flex-1">
        <View className={`${row} items-start gap-2`}>
          <Text
            numberOfLines={1}
            className={`flex-1 text-[15px] ${font.semibold} text-ink-900 ${align}`}
          >
            {complaintTitle(complaint, language)}
          </Text>
          <View className={`rounded-full px-2.5 py-1 ${pill.bg}`}>
            <Text className={`text-[11px] ${font.medium} ${pill.text}`}>{pill.label}</Text>
          </View>
        </View>
        <Text
          numberOfLines={1}
          className={`mt-0.5 text-[12px] ${font.regular} text-ink-500 ${align}`}
        >
          #{complaint.reference_no}
        </Text>
        {place.length ? (
          <View className={`mt-1 ${row} items-center gap-1`}>
            <Ionicons name="location-outline" size={13} color="#64748B" />
            <Text numberOfLines={1} className={`shrink text-[12px] ${font.regular} text-ink-500`}>
              {place.join('  •  ')}
            </Text>
          </View>
        ) : null}
        <View className={`mt-1 ${row} items-center gap-1`}>
          <Ionicons name="calendar-clear-outline" size={13} color="#94A3B8" />
          <Text numberOfLines={1} className={`shrink text-[12px] ${font.regular} text-ink-400`}>
            {requestActivity(complaint, copy, language)}
          </Text>
        </View>
      </View>

      <Ionicons name={isAr ? 'chevron-back' : 'chevron-forward'} size={18} color="#94A3B8" />
    </Pressable>
  );
}
