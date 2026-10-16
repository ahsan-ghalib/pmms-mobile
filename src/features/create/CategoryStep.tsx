import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { createCopy } from './createCopy';
import { cardShadow, CategoryTile, localName } from './shared';
import { Category } from './useCreateData';

type Props = {
  categories: Category[];
  loading: boolean;
  selectedId?: string;
  onSelect: (category: Category) => void;
};

export default function CategoryStep({ categories, loading, selectedId, onSelect }: Props) {
  const { language, font, row, align } = useLanguage();
  const copy = createCopy[language];

  return (
    <View>
      <Text className={`text-[20px] ${font.bold} text-ink-900 ${align}`}>
        {copy.selectCategory}
      </Text>
      <Text className={`mt-1 text-[14px] ${font.regular} text-ink-500 ${align}`}>
        {copy.selectCategoryHint}
      </Text>

      {loading ? (
        <ActivityIndicator className="mt-10" color="#2F80F0" />
      ) : categories.length === 0 ? (
        <View className="mt-10 items-center">
          <Ionicons name="grid-outline" size={30} color="#94A3B8" />
          <Text className={`mt-3 text-[15px] ${font.semibold} text-ink-900`}>
            {copy.noCategories}
          </Text>
          <Text className={`mt-1 text-[13px] ${font.regular} text-ink-500`}>
            {copy.noCategoriesBody}
          </Text>
        </View>
      ) : (
        <View className={`mt-5 ${row} flex-wrap`} style={{ marginHorizontal: -6 }}>
          {categories.map((category) => {
            const selected = category.id === selectedId;
            return (
              <View key={category.id} style={{ width: '33.333%', padding: 6 }}>
                <Pressable
                  onPress={() => onSelect(category)}
                  className={`items-center rounded-2xl border bg-white px-2 py-4 active:opacity-80 ${
                    selected ? 'border-brand-500' : 'border-transparent'
                  }`}
                  style={cardShadow}
                >
                  <CategoryTile category={category} size={52} />
                  <Text
                    numberOfLines={2}
                    className={`mt-2.5 text-center text-[13px] leading-4 ${font.medium} text-ink-900`}
                  >
                    {localName(category, language)}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
