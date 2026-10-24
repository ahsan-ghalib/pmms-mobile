import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../i18n/LanguageContext';

type Props = {
  visible: boolean;
  title: string;
  placeholder: string;
  submitLabel: string;
  pending: boolean;
  multiline?: boolean;
  destructive?: boolean;
  onSubmit: (value: string) => void;
  onClose: () => void;
};

export default function TextInputSheet({
  visible,
  title,
  placeholder,
  submitLabel,
  pending,
  multiline = true,
  destructive = false,
  onSubmit,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { font, align } = useLanguage();
  const [value, setValue] = useState('');
  const ready = value.trim().length > 0;

  const tone = destructive
    ? ready
      ? 'bg-rose-500'
      : 'bg-rose-200'
    : ready
      ? 'bg-brand-600'
      : 'bg-brand-200';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable className="flex-1 bg-black/30" onPress={onClose} />
        <View
          className="rounded-t-3xl bg-white px-5 pt-3"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-slate-200" />
          <Text className={`text-[18px] ${font.bold} text-ink-900 ${align}`}>{title}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            multiline={multiline}
            autoFocus
            autoCapitalize={multiline ? 'sentences' : 'characters'}
            autoCorrect={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
            className={`mt-4 rounded-2xl border border-slate-200 bg-[#F8FAFD] p-4 text-[14px] ${font.regular} text-ink-900 ${align} ${multiline ? 'min-h-[120px]' : 'h-14'}`}
          />
          <Pressable
            onPress={() => ready && onSubmit(value.trim())}
            disabled={!ready || pending}
            className={`mt-4 items-center rounded-full py-3.5 ${tone}`}
          >
            {pending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className={`text-[15px] ${font.semibold} text-white`}>{submitLabel}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
