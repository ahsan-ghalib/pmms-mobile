import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../i18n/LanguageContext';

export default function ScreenHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const { font, align } = useLanguage();
  return (
    <View className="px-5 pb-3" style={{ paddingTop: insets.top + 12 }}>
      <Text className={`text-[24px] ${font.extrabold} text-ink-900 ${align}`}>{title}</Text>
    </View>
  );
}
