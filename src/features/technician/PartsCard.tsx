import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useLanguage } from '../../i18n/LanguageContext';
import { cardShadow } from '../create/shared';
import { Job } from './jobs';
import { PartRequest, formatQty, issuedBalances, num } from './parts';
import { technicianCopy } from './technicianCopy';

const STATUS_TONES: Record<string, { bg: string; text: string }> = {
  requested: { bg: 'bg-amber-50', text: 'text-amber-700' },
  approved: { bg: 'bg-brand-50', text: 'text-brand-600' },
  issued: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  used: { bg: 'bg-slate-100', text: 'text-slate-600' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-600' },
};

type Props = {
  job: Job;
  canRequest: boolean;
  canRecord: boolean;
  onRequest: () => void;
  onRecord: () => void;
};

export default function PartsCard({ job, canRequest, canRecord, onRequest, onRecord }: Props) {
  const { language, font, row, align } = useLanguage();
  const copy = technicianCopy[language].parts;
  const requests = [...(job.part_requests ?? [])].sort(
    (a, b) => dayjs(b.requested_at).valueOf() - dayjs(a.requested_at).valueOf(),
  );
  const usages = job.part_usages ?? [];
  const available = issuedBalances(requests).some((item) => item.available > 0);

  if (!requests.length && !usages.length && !canRequest) return null;

  return (
    <View className="rounded-2xl bg-white p-4" style={cardShadow}>
      <View className={`${row} items-center gap-2`}>
        <Text className={`flex-1 text-[15px] ${font.semibold} text-ink-900 ${align}`}>
          {copy.title}
        </Text>
        {canRequest ? (
          <Pressable
            onPress={onRequest}
            className={`${row} items-center gap-1 rounded-full border border-brand-500 px-3 py-1.5 active:bg-brand-50`}
          >
            <Ionicons name="add" size={14} color="#1D6FE6" />
            <Text className={`text-[12px] ${font.semibold} text-brand-600`}>
              {copy.requestMore}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {!requests.length ? (
        <Text className={`mt-2 text-[13px] ${font.regular} text-ink-500 ${align}`}>
          {copy.empty}
        </Text>
      ) : (
        <View className="mt-2">
          {requests.map((request, index) => (
            <RequestBlock key={request.id} request={request} first={index === 0} />
          ))}
        </View>
      )}

      {usages.length ? (
        <View className="mt-3 rounded-xl bg-[#F8FAFD] p-3">
          <Text className={`text-[12px] ${font.semibold} text-ink-500 ${align}`}>
            {copy.usedHistory}
          </Text>
          {usages.map((usage) => (
            <View key={usage.id} className={`mt-1.5 ${row} items-center gap-2`}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text
                numberOfLines={1}
                className={`flex-1 text-[13px] ${font.regular} text-ink-900 ${align}`}
              >
                {usage.part_name}
              </Text>
              <Text className={`text-[13px] ${font.semibold} text-ink-900`}>
                {formatQty(usage.quantity, usage.unit)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {canRecord && available ? (
        <Pressable
          onPress={onRecord}
          className={`mt-3 h-11 ${row} items-center justify-center gap-2 rounded-xl bg-emerald-600 active:opacity-90`}
        >
          <Ionicons name="clipboard-outline" size={17} color="#fff" />
          <Text className={`text-[14px] ${font.semibold} text-white`}>{copy.recordUsage}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function RequestBlock({ request, first }: { request: PartRequest; first: boolean }) {
  const { language, font, row, align } = useLanguage();
  const copy = technicianCopy[language].parts;
  const tone = STATUS_TONES[request.status] ?? STATUS_TONES.used;
  const pending = ['requested', 'approved'].includes(request.status);

  return (
    <View className={`py-3 ${first ? '' : 'border-t border-slate-100'}`}>
      <View className={`${row} items-center gap-2`}>
        <View className={`rounded-full px-2.5 py-1 ${tone.bg}`}>
          <Text className={`text-[11px] ${font.semibold} ${tone.text}`}>
            {copy.status[request.status] ?? request.status}
          </Text>
        </View>
        {request.requested_at ? (
          <Text className={`text-[12px] ${font.regular} text-ink-500`}>
            {dayjs(request.requested_at).locale(language).format('D MMM, h:mm A')}
          </Text>
        ) : null}
      </View>
      {request.items.map((item) => {
        const facts = [copy.requestedQty(formatQty(item.requested_quantity, item.unit))];
        if (num(item.issued_quantity) > 0)
          facts.push(copy.issuedQty(formatQty(item.issued_quantity, item.unit)));
        if (num(item.used_quantity) > 0)
          facts.push(copy.usedQty(formatQty(item.used_quantity, item.unit)));
        return (
          <View key={item.part_id} className={`mt-2 ${row} items-start gap-2.5`}>
            <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-lg bg-slate-50">
              <Ionicons name="cube-outline" size={15} color="#475569" />
            </View>
            <View className="flex-1">
              <Text
                numberOfLines={1}
                className={`text-[14px] ${font.medium} text-ink-900 ${align}`}
              >
                {item.part_name || item.sku}
              </Text>
              <Text className={`text-[12px] ${font.regular} text-ink-500 ${align}`}>
                {facts.join(' · ')}
              </Text>
            </View>
          </View>
        );
      })}
      {pending ? (
        <View className={`mt-2.5 ${row} items-center gap-1.5`}>
          <Ionicons name="time-outline" size={14} color="#B45309" />
          <Text className={`text-[12px] ${font.medium} text-amber-700 ${align}`}>
            {copy.waiting}
          </Text>
        </View>
      ) : null}
      {request.status === 'rejected' && request.rejection_reason ? (
        <View className={`mt-2.5 ${row} items-start gap-1.5 rounded-lg bg-rose-50 p-2.5`}>
          <Ionicons name="alert-circle-outline" size={14} color="#E11D48" />
          <Text className={`flex-1 text-[12px] ${font.medium} text-rose-700 ${align}`}>
            {copy.rejectedBecause(request.rejection_reason)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
