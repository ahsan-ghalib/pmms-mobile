import { Pressable, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../i18n/LanguageContext';
import { createCopy } from './createCopy';
import { cardShadow, CategoryIcon, localName, SectionTitle, serviceIcon } from './shared';
import { Category, Service } from './useCreateData';

type Props = {
  category: Category;
  serviceId?: string;
  onService: (service: Service) => void;
};

export default function ServiceStep({ category, serviceId, onService }: Props) {
  const { language, font, row, align } = useLanguage();
  const copy = createCopy[language];
  const services = category.services ?? [];

  return (
    <View className="gap-4">
      <LinearGradient
        colors={['#1D4ED8', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 20, overflow: 'hidden' }}
      >
        <View className={`${row} items-center gap-4 p-4`}>
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
            <CategoryIcon category={category} size={30} />
          </View>
          <View className="flex-1">
            <Text className={`text-[18px] ${font.bold} text-white ${align}`}>
              {localName(category, language)}
            </Text>
            {category.description ? (
              <Text
                numberOfLines={2}
                className={`mt-1 text-[13px] ${font.regular} text-white/80 ${align}`}
              >
                {category.description}
              </Text>
            ) : null}
          </View>
        </View>
      </LinearGradient>

      <SectionTitle number={1} title={copy.selectService} />
      {services.length === 0 ? (
        <Text className={`text-[13px] ${font.regular} text-ink-500 ${align}`}>
          {copy.noServices}
        </Text>
      ) : (
        <View className="gap-2.5">
          {services.map((service) => {
            const selected = service.id === serviceId;
            return (
              <Pressable
                key={service.id}
                onPress={() => onService(service)}
                className={`${row} items-center gap-3 rounded-2xl border px-4 py-3 ${
                  selected ? 'border-brand-500 bg-brand-50' : 'border-transparent bg-white'
                }`}
                style={selected ? undefined : cardShadow}
              >
                <View
                  className={`h-9 w-9 items-center justify-center rounded-xl ${selected ? 'bg-white' : 'bg-brand-50'}`}
                >
                  <MaterialCommunityIcons name={serviceIcon(service)} size={19} color="#1D6FE6" />
                </View>
                <Text className={`flex-1 text-[14px] ${font.medium} text-ink-900 ${align}`}>
                  {localName(service, language)}
                </Text>
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={selected ? '#1D6FE6' : '#CBD5E1'}
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function PriorityCard({
  category,
  priority,
  onPriority,
}: {
  category: Category;
  priority: 'normal' | 'urgent';
  onPriority: (priority: 'normal' | 'urgent') => void;
}) {
  const { language, font, row, align } = useLanguage();
  const copy = createCopy[language];
  return (
    <View className="rounded-2xl bg-white p-4" style={cardShadow}>
      <View className={`${row} gap-3`}>
        <PriorityButton
          label={copy.urgent}
          icon="flash"
          active={priority === 'urgent'}
          tone="urgent"
          disabled={!category.urgent_priority_enabled}
          onPress={() => onPriority('urgent')}
        />
        <PriorityButton
          label={copy.normal}
          icon="checkmark-circle"
          active={priority === 'normal'}
          tone="normal"
          disabled={!category.normal_priority_enabled}
          onPress={() => onPriority('normal')}
        />
      </View>
      {priority === 'urgent' ? (
        <View className={`mt-3 ${row} gap-2 rounded-xl bg-rose-50 px-3 py-2.5`}>
          <Ionicons name="warning" size={17} color="#E11D48" />
          <Text
            className={`flex-1 text-[12px] leading-[17px] ${font.medium} text-rose-700 ${align}`}
          >
            {copy.urgentAlert}
          </Text>
        </View>
      ) : (
        <Text className={`mt-3 text-[12px] leading-[17px] ${font.regular} text-ink-500 ${align}`}>
          {copy.priorityHint}
        </Text>
      )}
    </View>
  );
}

function PriorityButton({
  label,
  icon,
  active,
  tone,
  disabled,
  onPress,
}: {
  label: string;
  icon: 'flash' | 'checkmark-circle';
  active: boolean;
  tone: 'urgent' | 'normal';
  disabled: boolean;
  onPress: () => void;
}) {
  const { font, row } = useLanguage();
  const activeBg =
    tone === 'urgent' ? 'bg-rose-600 border-rose-600' : 'bg-brand-600 border-brand-600';
  const idleText = tone === 'urgent' ? 'text-rose-600' : 'text-brand-600';
  const iconColor = active ? '#fff' : tone === 'urgent' ? '#E11D48' : '#1D6FE6';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`h-12 flex-1 ${row} items-center justify-center gap-2 rounded-xl border ${
        active ? activeBg : 'border-slate-200 bg-white'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <Ionicons name={icon} size={17} color={iconColor} />
      <Text className={`text-[15px] ${font.semibold} ${active ? 'text-white' : idleText}`}>
        {label}
      </Text>
    </Pressable>
  );
}
