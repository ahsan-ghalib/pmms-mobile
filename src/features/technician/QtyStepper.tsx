import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatQty } from './parts';

type Props = {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
};

export default function QtyStepper({ value, onChange, max, min = 0 }: Props) {
  const { font } = useLanguage();
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (next: number) => {
    const bounded = Math.max(min, max != null ? Math.min(next, max) : next);
    return Math.round(bounded * 1000) / 1000;
  };

  const commit = (text: string) => {
    const parsed = Number(text.replace(',', '.'));
    onChange(Number.isFinite(parsed) ? clamp(parsed) : value);
    setDraft(null);
  };

  const canDecrease = value > min;
  const canIncrease = max == null || value < max;

  return (
    <View className="flex-row items-center rounded-full border border-slate-200 bg-white">
      <Pressable
        onPress={() => onChange(clamp(value - 1))}
        disabled={!canDecrease}
        hitSlop={4}
        className="h-9 w-9 items-center justify-center"
      >
        <Ionicons name="remove" size={18} color={canDecrease ? '#0B1930' : '#CBD5E1'} />
      </Pressable>
      <TextInput
        value={draft ?? formatQty(value)}
        onChangeText={setDraft}
        onFocus={() => setDraft(formatQty(value))}
        onEndEditing={(event) => commit(event.nativeEvent.text)}
        keyboardType="decimal-pad"
        selectTextOnFocus
        className={`w-12 text-center text-[14px] ${font.semibold} text-ink-900`}
      />
      <Pressable
        onPress={() => onChange(clamp(value + 1))}
        disabled={!canIncrease}
        hitSlop={4}
        className="h-9 w-9 items-center justify-center"
      >
        <Ionicons name="add" size={18} color={canIncrease ? '#0B1930' : '#CBD5E1'} />
      </Pressable>
    </View>
  );
}
