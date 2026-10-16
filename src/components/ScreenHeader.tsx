import { Text } from './Text';

import { BackIcon } from './ui/BackButton';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  subtitle?: string;
  dark?: boolean;
  wideRight?: boolean;
  backgroundColor?: string;
};

export function ScreenHeader({
  title,
  onBack,
  rightElement,
  subtitle,
  dark = false,
  wideRight = false,
  backgroundColor,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const isArabic = Boolean(i18n.language?.startsWith('ar'));

  const backButton = onBack ? (
    <Pressable
      onPress={onBack}
      className="h-10 w-10 items-center justify-center rounded-full bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <BackIcon size={22} color="#374151" />
    </Pressable>
  ) : (
    <View className="w-10" />
  );

  const actions = <View className={wideRight ? 'min-w-[120px]' : 'w-10'}>{rightElement}</View>;

  const titleBlock = (
    <View className="flex-1 items-center" style={{ marginHorizontal: 12 }}>
      <Text
        className={`text-center font-bold ${dark ? 'text-white' : 'text-gray-900'}`}
        style={{ fontSize: subtitle ? 13 : 18, textAlign: 'center', width: '100%' }}
        numberOfLines={1}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          className={`text-sm font-semibold ${dark ? 'text-purple-200' : 'text-brand-purple-mid'}`}
          style={{ textAlign: 'center', width: '100%' }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View
      style={{
        // Keep LTR layout direction so our explicit Arabic child order
        // (actions left, back right) is not flipped again by I18nManager RTL.
        direction: 'ltr',
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: insets.top + 8,
        paddingLeft: insets.left + 16,
        paddingRight: insets.right + 16,
        paddingBottom: 16,
        backgroundColor: backgroundColor || (dark ? undefined : '#F8F9FB'),
      }}
      className={dark && !backgroundColor ? 'bg-brand-purple' : undefined}
    >
      {/* Arabic: actions left, back right. English: back left, actions right. */}
      {isArabic ? (
        <>
          {actions}
          {titleBlock}
          {backButton}
        </>
      ) : (
        <>
          {backButton}
          {titleBlock}
          {actions}
        </>
      )}
    </View>
  );
}
