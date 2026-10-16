import { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../i18n/LanguageContext';
import AcUnitIcon from '../requests/AcUnitIcon';
import { categoryTile } from '../requests/requestDisplay';
import { Category, Service } from './useCreateData';

export const cardShadow = {
  shadowColor: '#1E3A8A',
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 1,
};

export function localName(
  item: { name_en: string; name_ar?: string | null } | null | undefined,
  language: string,
) {
  if (!item) return '';
  return (language === 'ar' && item.name_ar) || item.name_en;
}

export function CategoryIcon({
  category,
  size = 26,
}: {
  category?: Category | null;
  size?: number;
}) {
  const tile = categoryTile(category?.name_en);
  return tile.icon === 'ac-unit' ? (
    <AcUnitIcon size={size + 2} color={tile.color} />
  ) : (
    <MaterialCommunityIcons name={tile.icon} size={size} color={tile.color} />
  );
}

export function CategoryTile({
  category,
  size = 52,
}: {
  category?: Category | null;
  size?: number;
}) {
  const tile = categoryTile(category?.name_en);
  return (
    <View
      className="items-center justify-center rounded-2xl"
      style={{ width: size, height: size, backgroundColor: tile.bg }}
    >
      <CategoryIcon category={category} size={Math.round(size * 0.5)} />
    </View>
  );
}

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function serviceIcon(service: Service | null | undefined): MciName {
  const name = (service?.name_en || '').toLowerCase();
  if (name.includes('leak') || name.includes('water')) return 'water-outline';
  if (name.includes('noise') || name.includes('sound')) return 'volume-high';
  if (name.includes('install')) return 'toolbox-outline';
  if (name.includes('cool') || name.includes('ac ') || name.startsWith('ac')) return 'snowflake';
  if (name.includes('maint') || name.includes('service')) return 'wrench-outline';
  if (name.includes('other')) return 'dots-horizontal-circle-outline';
  return 'cog-outline';
}

export function PriorityBadge({
  priority,
  label,
}: {
  priority: 'normal' | 'urgent';
  label: string;
}) {
  const { font } = useLanguage();
  return (
    <View
      className={`rounded-md px-2.5 py-1 ${priority === 'urgent' ? 'bg-rose-600' : 'bg-brand-600'}`}
    >
      <Text className={`text-[11px] ${font.bold} uppercase text-white`}>{label}</Text>
    </View>
  );
}

export function SummaryRow({
  category,
  title,
  badge,
}: {
  category: Category | null;
  title: string;
  badge?: ReactNode;
}) {
  const { font, row, align } = useLanguage();
  return (
    <View className={`${row} items-center gap-3 rounded-2xl bg-white p-3`} style={cardShadow}>
      <CategoryTile category={category} size={40} />
      <Text
        numberOfLines={1}
        className={`flex-1 text-[15px] ${font.semibold} text-ink-900 ${align}`}
      >
        {title}
      </Text>
      {badge}
    </View>
  );
}

export function FooterButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { font } = useLanguage();
  return (
    <View className="bg-[#F6F9FE] px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        className={`h-[52px] items-center justify-center rounded-2xl ${disabled ? 'bg-brand-200' : 'bg-brand-600 active:opacity-90'}`}
        style={
          disabled
            ? undefined
            : {
                shadowColor: '#1D6FE6',
                shadowOpacity: 0.3,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 6 },
                elevation: 6,
              }
        }
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className={`text-[16px] ${font.semibold} text-white`}>{label}</Text>
        )}
      </Pressable>
    </View>
  );
}
