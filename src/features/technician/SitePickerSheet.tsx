import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../i18n/LanguageContext';
import { RequestSite } from '../create/NewRequestFlow';
import { Job } from './jobs';
import { technicianCopy } from './technicianCopy';

const CLOSED = ['closed', 'cancelled'];

export function sitesFromJobs(jobs: Job[]): RequestSite[] {
  const sites = new Map<string, RequestSite>();
  const ordered = [...jobs].sort(
    (a, b) => Number(b.status === 'in_progress') - Number(a.status === 'in_progress'),
  );
  for (const job of ordered) {
    const propertyId = job.property_id ?? job.property?.id;
    if (!propertyId || CLOSED.includes(job.status)) continue;
    const unitId = job.unit_id ?? job.unit?.id ?? null;
    const key = `${propertyId}:${unitId ?? ''}`;
    if (sites.has(key)) continue;
    const label = [job.unit_name ?? job.unit?.name, job.property_name ?? job.property?.name]
      .filter(Boolean)
      .join(' • ');
    sites.set(key, { property_id: propertyId, unit_id: unitId, label });
  }
  return [...sites.values()];
}

type Props = {
  visible: boolean;
  sites: RequestSite[];
  onSelect: (site: RequestSite) => void;
  onClose: () => void;
};

export default function SitePickerSheet({ visible, sites, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { language, isAr, font, row, align } = useLanguage();
  const copy = technicianCopy[language].newJob;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/30" onPress={onClose} />
      <View
        className="max-h-[75%] rounded-t-3xl bg-white pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="mb-4 h-1 w-10 self-center rounded-full bg-slate-200" />
        <View className="px-5">
          <Text className={`text-[18px] ${font.bold} text-ink-900 ${align}`}>{copy.title}</Text>
          <Text className={`mt-1 text-[13px] ${font.regular} text-ink-500 ${align}`}>
            {copy.subtitle}
          </Text>
        </View>
        {sites.length ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 10 }}>
            {sites.map((site) => (
              <Pressable
                key={`${site.property_id}:${site.unit_id ?? ''}`}
                onPress={() => onSelect(site)}
                className={`${row} items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 active:bg-brand-50`}
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                  <Ionicons
                    name={site.unit_id ? 'home-outline' : 'business-outline'}
                    size={19}
                    color="#2F80F0"
                  />
                </View>
                <Text
                  numberOfLines={2}
                  className={`flex-1 text-[14px] ${font.semibold} text-ink-900 ${align}`}
                >
                  {site.label}
                </Text>
                <Ionicons
                  name={isAr ? 'chevron-back' : 'chevron-forward'}
                  size={18}
                  color="#CBD5E1"
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View className="items-center px-8 py-10">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-50">
              <Ionicons name="business-outline" size={22} color="#94A3B8" />
            </View>
            <Text className={`mt-3 text-[14px] ${font.semibold} text-ink-900`}>{copy.noSites}</Text>
            <Text className={`mt-1 text-center text-[12px] ${font.regular} text-ink-500`}>
              {copy.noSitesBody}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
