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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../i18n/LanguageContext';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../auth/AuthContext';
import { profileCopy } from './profileCopy';

export default function ChangePasswordSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { language, font, row, align } = useLanguage();
  const { token, signOut } = useAuth();
  const copy = profileCopy[language];
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const error =
    next.length > 0 && next.length < 8
      ? copy.passwordMin
      : confirm.length > 0 && confirm !== next
        ? copy.passwordMismatch
        : '';
  const valid = current.length > 0 && next.length >= 8 && confirm === next;

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setShow(false);
  };

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await apiRequest('/user/password', {
        method: 'PUT',
        token,
        language,
        body: { current_password: current, password: next, password_confirmation: confirm },
      });
      reset();
      onClose();
      Toast.show({ type: 'success', text1: copy.passwordUpdated, text2: copy.passwordUpdatedBody });
      await signOut();
    } catch (err) {
      Toast.show({ type: 'error', text1: copy.passwordFailed, text2: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, value: string, onChange: (v: string) => void) => (
    <View className="mt-3">
      <Text className={`mb-1.5 text-[13px] ${font.medium} text-ink-700 ${align}`}>{label}</Text>
      <View
        className={`${row} h-12 items-center rounded-xl border border-slate-200 bg-[#F8FAFD] px-3.5`}
      >
        <Ionicons name="lock-closed-outline" size={17} color="#64748B" />
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          className={`mx-2.5 flex-1 text-[14px] ${font.regular} text-ink-900 ${align}`}
        />
      </View>
    </View>
  );

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
          <View className={`${row} items-center justify-between`}>
            <Text className={`text-[18px] ${font.bold} text-ink-900`}>{copy.changePassword}</Text>
            <Pressable onPress={() => setShow((value) => !value)} hitSlop={8}>
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
            </Pressable>
          </View>
          {field(copy.currentPassword, current, setCurrent)}
          {field(copy.newPassword, next, setNext)}
          {field(copy.confirmPassword, confirm, setConfirm)}
          {error ? (
            <Text className={`mt-2 text-[12px] ${font.regular} text-rose-600 ${align}`}>
              {error}
            </Text>
          ) : null}
          <Pressable
            onPress={submit}
            disabled={!valid || saving}
            className={`mt-5 h-[52px] items-center justify-center rounded-2xl ${valid ? 'bg-brand-600' : 'bg-brand-200'}`}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className={`text-[15px] ${font.semibold} text-white`}>{copy.savePassword}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
