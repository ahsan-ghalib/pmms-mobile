import { Text } from './Text';

import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { Logo } from './Logo';

export const authCardShadow = {
  shadowColor: '#8E54E9',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 20,
  elevation: 6,
};

export function AuthCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-[28px] bg-white px-6 py-12 ${className}`} style={authCardShadow}>
      {children}
    </View>
  );
}

export function AuthBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-[#EDE7F8]"
    >
      <Ionicons name="chevron-back" size={22} color="#8E54E9" />
    </Pressable>
  );
}

export function AuthBackLink({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable onPress={onPress} className="mt-6 items-center">
      <Text className="text-base font-bold text-brand-purple-mid">{label}</Text>
    </Pressable>
  );
}

const stepIcons = [
  'grid-outline',
  'document-text-outline',
  'location-outline',
  'checkmark',
] as const;

export function AuthStepper({ activeStep }: { activeStep: number }) {
  return (
    <View className="mb-6 flex-row items-center justify-between px-1">
      {stepIcons.map((icon, i) => (
        <View key={icon} className="flex-row items-center">
          <View
            className={`h-11 w-11 items-center justify-center rounded-xl ${
              i === activeStep ? 'bg-brand-orange' : 'border border-gray-200 bg-white'
            }`}
          >
            <Ionicons name={icon} size={20} color={i === activeStep ? '#fff' : '#B0B0B0'} />
          </View>
          {i < stepIcons.length - 1 && (
            <View
              className={`mx-1.5 h-0.5 w-7 ${i < activeStep ? 'bg-brand-orange' : 'bg-gray-200'}`}
            />
          )}
        </View>
      ))}
    </View>
  );
}

export function AuthLogoHeader({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <View className="mb-6 items-center">
      <Logo size={size} useImage={false} />
    </View>
  );
}
