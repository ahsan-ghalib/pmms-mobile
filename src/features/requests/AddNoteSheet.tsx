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
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../i18n/LanguageContext';
import { requestsCopy } from './requestsCopy';
import { useAddComplaintNote } from './useComplaintDetail';

export default function AddNoteSheet({
  complaintId,
  visible,
  onClose,
}: {
  complaintId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { language, font, align } = useLanguage();
  const copy = requestsCopy[language].detail;
  const [note, setNote] = useState('');
  const addNote = useAddComplaintNote(complaintId);

  const submit = () => {
    const value = note.trim();
    if (!value) return;
    addNote.mutate(value, {
      onSuccess: () => {
        setNote('');
        onClose();
        Toast.show({ type: 'success', text1: copy.noteAdded });
      },
      onError: (error) =>
        Toast.show({ type: 'error', text1: copy.noteFailed, text2: error.message }),
    });
  };

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
          <Text className={`text-[18px] ${font.bold} text-ink-900 ${align}`}>{copy.addNote}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={copy.notePlaceholder}
            placeholderTextColor="#94A3B8"
            multiline
            autoFocus
            textAlignVertical="top"
            className={`mt-4 min-h-[120px] rounded-2xl border border-slate-200 bg-[#F8FAFD] p-4 text-[14px] ${font.regular} text-ink-900 ${align}`}
          />
          <Pressable
            onPress={submit}
            disabled={!note.trim() || addNote.isPending}
            className={`mt-4 items-center rounded-full py-3.5 ${note.trim() ? 'bg-brand-600' : 'bg-brand-200'}`}
          >
            {addNote.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className={`text-[15px] ${font.semibold} text-white`}>{copy.noteSave}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
