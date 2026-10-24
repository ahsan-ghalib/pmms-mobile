import { Pressable, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import AcUnitIcon from '../requests/AcUnitIcon';
import { Job, jobPill, jobPlace, jobTile, jobTitle, jobWindow } from './jobs';
import { technicianCopy } from './technicianCopy';

export function JobTile({ job, size = 48 }: { job: Job; size?: number }) {
  const tile = jobTile(job);
  const icon = Math.round(size * 0.5);
  return (
    <View
      className="items-center justify-center rounded-2xl"
      style={{ width: size, height: size, backgroundColor: tile.bg }}
    >
      {tile.icon === 'ac-unit' ? (
        <AcUnitIcon size={icon + 2} color={tile.color} />
      ) : (
        <MaterialCommunityIcons name={tile.icon} size={icon} color={tile.color} />
      )}
    </View>
  );
}

export function JobPill({ job }: { job: Job }) {
  const { language, font } = useLanguage();
  const pill = jobPill(job, technicianCopy[language]);
  return (
    <View className={`rounded-full px-2.5 py-1 ${pill.bg}`}>
      <Text className={`text-[11px] ${font.semibold} ${pill.text}`}>{pill.label}</Text>
    </View>
  );
}

export default function JobRow({ job, onPress }: { job: Job; onPress: () => void }) {
  const { language, isAr, font, row, align } = useLanguage();
  const copy = technicianCopy[language];
  const place = jobPlace(job);

  return (
    <Pressable
      onPress={onPress}
      className={`${row} items-center gap-3 px-4 py-3.5 active:bg-slate-50`}
    >
      <JobTile job={job} />
      <View className="flex-1">
        <View className={`${row} items-center justify-between gap-2`}>
          <Text
            numberOfLines={1}
            className={`shrink text-[14px] ${font.semibold} text-ink-900 ${align}`}
          >
            {jobTitle(job, language, copy)}
          </Text>
          <JobPill job={job} />
        </View>
        {place ? (
          <View className={`${row} mt-1 items-center gap-1`}>
            <Ionicons name="location-outline" size={12} color="#94A3B8" />
            <Text
              numberOfLines={1}
              className={`shrink text-[12px] ${font.regular} text-ink-500 ${align}`}
            >
              {place}
            </Text>
          </View>
        ) : null}
        <View className={`${row} mt-1 items-center gap-1`}>
          <Ionicons name="time-outline" size={12} color="#94A3B8" />
          <Text numberOfLines={1} className={`shrink text-[12px] ${font.regular} text-ink-500`}>
            {jobWindow(job, copy, language)}
          </Text>
        </View>
      </View>
      <Ionicons name={isAr ? 'chevron-back' : 'chevron-forward'} size={18} color="#CBD5E1" />
    </Pressable>
  );
}
