import { ComponentProps, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../i18n/LanguageContext';
import { PARTS_REASON, PartLine, usePartsCatalog, useRequestParts } from './parts';
import QtyStepper from './QtyStepper';
import { technicianCopy } from './technicianCopy';
import { useJobAction } from './useTechnician';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Reason = 'parts' | 'access' | 'tenant' | 'other';

const REASONS: { key: Reason; icon: IconName }[] = [
  { key: 'parts', icon: 'construct-outline' },
  { key: 'access', icon: 'lock-closed-outline' },
  { key: 'tenant', icon: 'person-remove-outline' },
  { key: 'other', icon: 'ellipsis-horizontal-circle-outline' },
];

type Props = {
  jobId: string;
  visible: boolean;
  partsOnly?: boolean;
  onClose: () => void;
};

export default function HoldSheet({ jobId, visible, partsOnly = false, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { language, isAr, font, row, align } = useLanguage();
  const copy = technicianCopy[language];
  const [mode, setMode] = useState<'reasons' | 'parts'>(partsOnly ? 'parts' : 'reasons');
  const [reason, setReason] = useState<Reason | null>(null);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<Record<string, number>>({});

  const action = useJobAction(jobId);
  const requestParts = useRequestParts(jobId);
  const catalog = usePartsCatalog(visible && mode === 'parts');

  const parts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const all = catalog.data?.parts ?? [];
    const filtered = needle
      ? all.filter((part) =>
          [part.name, part.sku]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(needle)),
        )
      : all;
    return [...filtered].sort(
      (a, b) => Number(Boolean(lines[b.id])) - Number(Boolean(lines[a.id])),
    );
  }, [catalog.data, search, lines]);

  const items: PartLine[] = Object.entries(lines)
    .filter(([, quantity]) => quantity > 0)
    .map(([part_id, quantity]) => ({ part_id, quantity }));

  const fail = (error: Error) =>
    Toast.show({ type: 'error', text1: copy.detail.actionFailed, text2: error.message });

  const submitHold = () => {
    if (!reason || reason === 'parts') return;
    const base = reason === 'other' ? text.trim() : copy.hold.reasonText[reason];
    const full = note.trim() && reason !== 'other' ? `${base} - ${note.trim()}` : base;
    if (!full) return;
    action.mutate(
      { action: 'hold', body: { reason: full } },
      {
        onSuccess: () => {
          onClose();
          Toast.show({ type: 'success', text1: copy.detail.held });
        },
        onError: fail,
      },
    );
  };

  const submitParts = () => {
    if (!items.length) return;
    requestParts.mutate(
      {
        reason: note.trim() ? `${PARTS_REASON} - ${note.trim()}` : PARTS_REASON,
        items,
        hold: true,
      },
      {
        onSuccess: () => {
          onClose();
          Toast.show({ type: 'success', text1: copy.parts.requested });
        },
        onError: fail,
      },
    );
  };

  const holdReady =
    reason !== null && reason !== 'parts' && (reason !== 'other' || text.trim().length > 0);
  const pending = action.isPending || requestParts.isPending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable className="flex-1 bg-black/30" onPress={onClose} />
        <View className="max-h-[90%] rounded-t-3xl bg-white pt-3">
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-slate-200" />

          {mode === 'reasons' ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16 }}
            >
              <Text className={`text-[18px] ${font.bold} text-ink-900 ${align}`}>
                {copy.hold.title}
              </Text>
              <Text className={`mt-1 text-[13px] ${font.regular} text-ink-500 ${align}`}>
                {copy.hold.subtitle}
              </Text>
              <View className="mt-4 gap-2.5">
                {REASONS.map((item) => {
                  const selected = reason === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => {
                        setReason(item.key);
                        if (item.key === 'parts') setMode('parts');
                      }}
                      className={`${row} items-center gap-3 rounded-2xl border p-3.5 ${selected ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'}`}
                    >
                      <View
                        className={`h-10 w-10 items-center justify-center rounded-xl ${item.key === 'parts' ? 'bg-amber-50' : 'bg-slate-50'}`}
                      >
                        <Ionicons
                          name={item.icon}
                          size={19}
                          color={item.key === 'parts' ? '#D97706' : '#475569'}
                        />
                      </View>
                      <Text className={`flex-1 text-[14px] ${font.semibold} text-ink-900 ${align}`}>
                        {copy.hold.reasons[item.key]}
                      </Text>
                      {item.key === 'parts' ? (
                        <Ionicons
                          name={isAr ? 'chevron-back' : 'chevron-forward'}
                          size={18}
                          color="#CBD5E1"
                        />
                      ) : (
                        <Ionicons
                          name={selected ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={selected ? '#1D6FE6' : '#CBD5E1'}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
              {reason && reason !== 'parts' ? (
                <TextInput
                  value={reason === 'other' ? text : note}
                  onChangeText={reason === 'other' ? setText : setNote}
                  placeholder={
                    reason === 'other' ? copy.hold.otherPlaceholder : copy.hold.notePlaceholder
                  }
                  placeholderTextColor="#94A3B8"
                  multiline
                  textAlignVertical="top"
                  className={`mt-4 min-h-[90px] rounded-2xl border border-slate-200 bg-[#F8FAFD] p-4 text-[14px] ${font.regular} text-ink-900 ${align}`}
                />
              ) : null}
              <Pressable
                onPress={submitHold}
                disabled={!holdReady || pending}
                className={`mt-5 items-center rounded-full py-3.5 ${holdReady ? 'bg-amber-500' : 'bg-amber-200'}`}
              >
                {pending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className={`text-[15px] ${font.semibold} text-white`}>
                    {copy.hold.submitHold}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          ) : (
            <View style={{ paddingBottom: insets.bottom + 16 }}>
              <View className="px-5">
                <View className={`${row} items-center gap-2`}>
                  {!partsOnly ? (
                    <Pressable
                      onPress={() => {
                        setMode('reasons');
                        setReason(null);
                      }}
                      hitSlop={8}
                      className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
                    >
                      <Ionicons
                        name={isAr ? 'chevron-forward' : 'chevron-back'}
                        size={18}
                        color="#0B1930"
                      />
                    </Pressable>
                  ) : null}
                  <Text className={`flex-1 text-[18px] ${font.bold} text-ink-900 ${align}`}>
                    {copy.parts.requestTitle}
                  </Text>
                  {items.length ? (
                    <View className="rounded-full bg-brand-50 px-2.5 py-1">
                      <Text className={`text-[11px] ${font.semibold} text-brand-600`}>
                        {copy.parts.selected(items.length)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  className={`mt-1 text-[12.5px] leading-[18px] ${font.regular} text-ink-500 ${align}`}
                >
                  {copy.parts.requestSubtitle}
                </Text>
                <View
                  className={`mt-3 ${row} h-11 items-center gap-2 rounded-xl border border-slate-200 bg-[#F8FAFD] px-3`}
                >
                  <Ionicons name="search-outline" size={17} color="#64748B" />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder={copy.parts.search}
                    placeholderTextColor="#94A3B8"
                    autoCorrect={false}
                    className={`flex-1 text-[14px] ${font.regular} text-ink-900 ${align}`}
                  />
                </View>
              </View>

              <ScrollView
                style={{ maxHeight: 300 }}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10, gap: 8 }}
              >
                {catalog.isLoading ? (
                  <View className="py-8">
                    <ActivityIndicator color="#2F80F0" />
                  </View>
                ) : catalog.isError ? (
                  <Text className={`py-6 text-center text-[13px] ${font.regular} text-ink-500`}>
                    {copy.parts.catalogFailed}
                  </Text>
                ) : parts.length === 0 ? (
                  <Text className={`py-6 text-center text-[13px] ${font.regular} text-ink-500`}>
                    {copy.parts.noParts}
                  </Text>
                ) : (
                  parts.map((part) => {
                    const quantity = lines[part.id] ?? 0;
                    return (
                      <View
                        key={part.id}
                        className={`${row} items-center gap-3 rounded-2xl border p-3 ${quantity ? 'border-brand-200 bg-brand-50/50' : 'border-slate-100 bg-white'}`}
                      >
                        <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                          <Ionicons name="cube-outline" size={19} color="#475569" />
                        </View>
                        <View className="flex-1">
                          <Text
                            numberOfLines={1}
                            className={`text-[14px] ${font.semibold} text-ink-900 ${align}`}
                          >
                            {part.name}
                          </Text>
                          <Text
                            numberOfLines={1}
                            className={`text-[12px] ${font.regular} text-ink-500 ${align}`}
                          >
                            {[part.sku, part.unit_of_measure].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        {quantity ? (
                          <QtyStepper
                            value={quantity}
                            onChange={(next) =>
                              setLines((prev) => {
                                const copyLines = { ...prev };
                                if (next > 0) copyLines[part.id] = next;
                                else delete copyLines[part.id];
                                return copyLines;
                              })
                            }
                          />
                        ) : (
                          <Pressable
                            onPress={() => setLines((prev) => ({ ...prev, [part.id]: 1 }))}
                            className="h-9 w-9 items-center justify-center rounded-full bg-brand-500 active:opacity-80"
                          >
                            <Ionicons name="add" size={20} color="#fff" />
                          </Pressable>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>

              <View className="px-5">
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder={copy.parts.notePlaceholder}
                  placeholderTextColor="#94A3B8"
                  className={`h-11 rounded-xl border border-slate-200 bg-[#F8FAFD] px-3 text-[14px] ${font.regular} text-ink-900 ${align}`}
                />
                <Pressable
                  onPress={submitParts}
                  disabled={!items.length || pending}
                  className={`mt-3 h-[52px] ${row} items-center justify-center gap-2 rounded-2xl ${items.length ? 'bg-brand-500' : 'bg-brand-200'}`}
                >
                  {pending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={17} color="#fff" />
                      <Text className={`text-[15px] ${font.semibold} text-white`}>
                        {copy.parts.submitRequest}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
