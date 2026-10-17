import { ComponentProps } from 'react';
import { ImageSourcePropType, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { cardShadow, localName } from '../create/shared';
import { Category, useCategories } from '../create/useCreateData';
import { homeCopy } from './homeCopy';

const COLUMNS = 2;
const GAP = 12;
const MAX_TILES = 8;

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type CardVisual = {
  icon: MciName;
  accent: string;
  colors: [string, string];
  image?: ImageSourcePropType;
};

const VISUALS: { match: RegExp; visual: CardVisual }[] = [
  {
    match: /\b(h?vac|ac|air)\b|cool/,
    visual: {
      icon: 'snowflake',
      accent: '#2F6FE4',
      colors: ['#E6F0FF', '#CFE0FF'],
      image: require('../../../assets/images/categories/ac.png'),
    },
  },
  {
    match: /plumb/,
    visual: {
      icon: 'faucet',
      accent: '#EA7A2E',
      colors: ['#FFEEE2', '#FFD9C0'],
      image: require('../../../assets/images/categories/plumbing.png'),
    },
  },
  {
    match: /electric/,
    visual: {
      icon: 'lightning-bolt',
      accent: '#E3A008',
      colors: ['#FFF6D6', '#FFE8A3'],
      image: require('../../../assets/images/categories/electrical.png'),
    },
  },
  {
    match: /applian/,
    visual: {
      icon: 'washing-machine',
      accent: '#7C5CE6',
      colors: ['#F1ECFF', '#E0D5FF'],
      image: require('../../../assets/images/categories/appliances.png'),
    },
  },
  {
    match: /paint/,
    visual: {
      icon: 'format-paint',
      accent: '#E0457B',
      colors: ['#FFE9F1', '#FFD0E0'],
      image: require('../../../assets/images/categories/painting.png'),
    },
  },
  {
    match: /carpent|wood|joiner/,
    visual: {
      icon: 'hammer',
      accent: '#2E9E5B',
      colors: ['#E5F6EA', '#CBEBD5'],
      image: require('../../../assets/images/categories/carpentry.png'),
    },
  },
  {
    match: /civil|mason|finish/,
    visual: {
      icon: 'wall',
      accent: '#64748B',
      colors: ['#F0F3F7', '#DFE4EB'],
      image: require('../../../assets/images/categories/civil.png'),
    },
  },
  {
    match: /clean|housekeep/,
    visual: {
      icon: 'spray-bottle',
      accent: '#0E9F8E',
      colors: ['#E0F6F2', '#C2ECE4'],
      image: require('../../../assets/images/categories/cleaning.png'),
    },
  },
  {
    match: /elevator|lift/,
    visual: { icon: 'elevator-passenger-outline', accent: '#7C5CE6', colors: ['#F1ECFF', '#E0D5FF'] },
  },
];

const FALLBACK: CardVisual = { icon: 'hammer-wrench', accent: '#2F6FE4', colors: ['#EAF2FF', '#D6E6FF'] };
const MORE: CardVisual = { icon: 'dots-horizontal', accent: '#7C5CE6', colors: ['#EEF3FF', '#DCE6FF'] };

function visualFor(category: Category): CardVisual {
  const name = (category.name_en || '').toLowerCase();
  return VISUALS.find((entry) => entry.match.test(name))?.visual ?? FALLBACK;
}

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
  const cardWidth = (width - 40 - GAP * (COLUMNS - 1)) / COLUMNS;
  const cardHeight = Math.round(cardWidth * 0.62);

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

      <View className={`mt-4 ${row} flex-wrap`} style={{ gap: GAP }}>
        {categories.isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <View
                key={i}
                className="rounded-[20px] bg-white/70"
                style={{ width: cardWidth, height: cardHeight }}
              />
            ))
          : visible.map((category) => (
              <ServiceCard
                key={category.id}
                width={cardWidth}
                height={cardHeight}
                label={localName(category, language)}
                visual={visualFor(category)}
                onPress={() => onCategory(category)}
              />
            ))}
        {overflow ? (
          <ServiceCard
            width={cardWidth}
            height={cardHeight}
            label={copy.moreCategories}
            visual={MORE}
            onPress={onCreate}
          />
        ) : null}
      </View>
    </View>
  );
}

function ServiceCard({
  width,
  height,
  label,
  visual,
  onPress,
}: {
  width: number;
  height: number;
  label: string;
  visual: CardVisual;
  onPress: () => void;
}) {
  const { isAr, font, align } = useLanguage();
  const start = isAr ? 'right' : 'left';
  const end = isAr ? 'left' : 'right';

  return (
    <Pressable onPress={onPress} className="active:opacity-90" style={[cardShadow, { width, height }]}>
      <LinearGradient
        colors={visual.colors}
        start={{ x: isAr ? 1 : 0, y: 0 }}
        end={{ x: isAr ? 0 : 1, y: 1 }}
        style={{ flex: 1, borderRadius: 20, overflow: 'hidden' }}
      >
        {visual.image ? (
          <Image
            source={visual.image}
            contentFit="contain"
            contentPosition={end}
            style={{ position: 'absolute', top: 10, bottom: 8, [end]: 8, width: width * 0.56 }}
          />
        ) : null}

        <View
          className="absolute h-9 w-9 items-center justify-center rounded-xl bg-white"
          style={{ top: 12, [start]: 12 }}
        >
          <MaterialCommunityIcons name={visual.icon} size={20} color={visual.accent} />
        </View>

        <Text
          numberOfLines={2}
          className={`absolute text-[14px] leading-[18px] ${font.bold} text-ink-900 ${align}`}
          style={{ bottom: 12, [start]: 12, maxWidth: width * 0.5 }}
        >
          {label}
        </Text>

        <View
          className="absolute h-7 w-7 items-center justify-center rounded-full bg-white"
          style={{ bottom: 10, [end]: 10 }}
        >
          <Ionicons name={isAr ? 'arrow-back' : 'arrow-forward'} size={14} color="#0F172A" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}
