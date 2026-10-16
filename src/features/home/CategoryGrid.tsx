import { ReactNode } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { cardShadow, CategoryTile, localName } from '../create/shared';
import { Category, useCategories } from '../create/useCreateData';
import { homeCopy } from './homeCopy';

const COLUMNS = 4;
const GAP = 10;
const MAX_TILES = 8;

type Props = {
  onCreate: () => void;
  onCategory: (category: Category) => void;
};

export default function CategoryGrid({ onCreate, onCategory }: Props) {
  const { width } = useWindowDimensions();
  const { language, isAr, font, row, align } = useLanguage();
  const copy = homeCopy[language];
  const categories = useCategories();

  if (categories.isError) return null;

  const list = categories.data ?? [];
  const overflow = list.length > MAX_TILES;
  const visible = overflow ? list.slice(0, MAX_TILES - 1) : list;
  const tileWidth = (width - 40 - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <View className="px-5">
      <Pressable onPress={onCreate} className="active:opacity-95">
        <LinearGradient
          colors={['#1D6FE6', '#3B8BF5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20 }}
        >
          <View className={`${row} items-center gap-3 px-4 py-4`}>
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
              <Ionicons name="search" size={21} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className={`text-[16px] ${font.bold} text-white ${align}`}>
                {copy.helpTitle}
              </Text>
              <Text className={`mt-0.5 text-[12px] ${font.regular} text-white/80 ${align}`}>
                {copy.helpBody}
              </Text>
            </View>
            <Ionicons name={isAr ? 'chevron-back' : 'chevron-forward'} size={20} color="#fff" />
          </View>
        </LinearGradient>
      </Pressable>

      <View className={`mt-3 ${row} flex-wrap`} style={{ gap: GAP }}>
        {categories.isLoading
          ? Array.from({ length: MAX_TILES }).map((_, i) => (
              <View
                key={i}
                className="rounded-2xl bg-white/70"
                style={{ width: tileWidth, height: tileWidth + 14 }}
              />
            ))
          : visible.map((category) => (
              <GridTile
                key={category.id}
                width={tileWidth}
                label={localName(category, language)}
                onPress={() => onCategory(category)}
              >
                <CategoryTile category={category} size={Math.min(tileWidth - 26, 48)} />
              </GridTile>
            ))}
        {overflow ? (
          <GridTile width={tileWidth} label={copy.moreCategories} onPress={onCreate}>
            <View
              className="items-center justify-center rounded-2xl bg-slate-100"
              style={{ width: Math.min(tileWidth - 26, 48), height: Math.min(tileWidth - 26, 48) }}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#475569" />
            </View>
          </GridTile>
        ) : null}
      </View>
    </View>
  );
}

function GridTile({
  width,
  label,
  onPress,
  children,
}: {
  width: number;
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const { font } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      className="items-center rounded-2xl bg-white px-1 pb-2.5 pt-3 active:opacity-80"
      style={[cardShadow, { width }]}
    >
      {children}
      <Text
        numberOfLines={1}
        className={`mt-2 text-center text-[11.5px] ${font.semibold} text-ink-700`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
