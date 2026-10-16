import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { Text } from '../Text';
import { GlassCard } from './OrderDetails/GlassCard';
import { TimelineStepDot } from './OrderDetails/TimelineStepDot';

interface RequestTimelineProps {
  requestDetails: any;
}

type TimelineStepDef = {
  level: number;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  date?: string | null;
};

type RenderStep = {
  title: string;
  date: string | null;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone?: 'danger';
};

const COLORS = {
  ink: '#0F172A',
  muted: '#64748B',
};

export const RequestTimeline: React.FC<RequestTimelineProps> = ({ requestDetails }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith('ar');
  const viewDirection = isArabic ? 'rtl' : 'ltr';
  const status = requestDetails?.status?.toLowerCase() || '';
  const isRefund = requestDetails?.type === 'refund';

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    return dayjs(dateString).format('DD MMM YYYY, hh:mm A');
  };

  if (!requestDetails) return null;

  const updatedAt = formatDate(requestDetails.updated_at);
  const createdAt = formatDate(requestDetails.created_at);

  const exchangeStatusLevels: Record<string, number> = {
    requested: 1,
    store_approved: 2,
    partially_approved: 2,
    waiting_return_fee: 2,
    return_fee_paid: 3,
    reverse_shipping_started: 4,
    picked_from_customer: 5,
    return_in_transit: 6,
    delivered_to_store: 7,
    item_received_confirming: 7,
    exchange_replacement_preparing: 8,
    exchange_sent_to_logistics: 9,
    exchange_picked_from_store: 10,
    exchange_in_transit: 11,
    exchange_completed: 12,
  };

  const refundStatusLevels: Record<string, number> = {
    requested: 1,
    store_approved: 2,
    partially_approved: 2,
    waiting_return_fee: 2,
    return_fee_paid: 3,
    reverse_shipping_started: 4,
    picked_from_customer: 5,
    return_in_transit: 6,
    delivered_to_store: 7,
    item_received_confirming: 7,
    refund_completed: 8,
  };

  const buildHappyPathSteps = (): TimelineStepDef[] => {
    if (isRefund) {
      return [
        {
          level: 1,
          title: t('timeline_waiting_approval', 'Waiting approval'),
          icon: 'document-text-outline',
          date: createdAt,
        },
        {
          level: 2,
          title: t('timeline_waiting_fee', 'Waiting fee'),
          icon: 'card-outline',
          date: formatDate(requestDetails.approved_at) || updatedAt,
        },
        {
          level: 3,
          title: t('timeline_fee_paid', 'Fee paid · Pickup scheduled'),
          icon: 'checkmark-circle-outline',
          date: formatDate(requestDetails.return_fee_paid_at) || updatedAt,
        },
        {
          level: 4,
          title: t('timeline_reverse_shipping', 'Reverse shipping started'),
          icon: 'navigate-outline',
          date: updatedAt,
        },
        {
          level: 5,
          title: t('timeline_item_picked_up', 'Item picked up'),
          icon: 'cube-outline',
          date: updatedAt,
        },
        {
          level: 6,
          title: t('timeline_in_transit', 'In transit'),
          icon: 'airplane-outline',
          date: updatedAt,
        },
        {
          level: 7,
          title: t('timeline_delivered_to_store', 'Delivered to store'),
          icon: 'storefront-outline',
          date: updatedAt,
        },
        {
          level: 8,
          title: t('timeline_refund_completed', 'Refund completed'),
          icon: 'cash-outline',
          date: formatDate(requestDetails.refunded_at || requestDetails.completed_at),
        },
      ];
    }

    return [
      {
        level: 1,
        title: t('timeline_waiting_approval', 'Waiting approval'),
        icon: 'document-text-outline',
        date: createdAt,
      },
      {
        level: 2,
        title: t('timeline_waiting_fee', 'Waiting fee'),
        icon: 'card-outline',
        date: formatDate(requestDetails.approved_at) || updatedAt,
      },
      {
        level: 3,
        title: t('timeline_fee_paid', 'Fee paid · Pickup scheduled'),
        icon: 'checkmark-circle-outline',
        date: formatDate(requestDetails.return_fee_paid_at) || updatedAt,
      },
      {
        level: 4,
        title: t('timeline_reverse_shipping', 'Reverse shipping started'),
        icon: 'navigate-outline',
        date: updatedAt,
      },
      {
        level: 5,
        title: t('timeline_item_picked_up', 'Item picked up'),
        icon: 'cube-outline',
        date: updatedAt,
      },
      {
        level: 6,
        title: t('timeline_in_transit', 'In transit'),
        icon: 'airplane-outline',
        date: updatedAt,
      },
      {
        level: 7,
        title: t('timeline_delivered_to_store', 'Delivered to store'),
        icon: 'storefront-outline',
        date: updatedAt,
      },
      {
        level: 8,
        title: t('timeline_replacement_preparing', 'Replacement preparing'),
        icon: 'construct-outline',
        date: updatedAt,
      },
      {
        level: 9,
        title: t('timeline_replacement_dispatched', 'Replacement dispatched'),
        icon: 'send-outline',
        date: updatedAt,
      },
      {
        level: 10,
        title: t('timeline_replacement_picked_up', 'Replacement picked up'),
        icon: 'cube-outline',
        date: updatedAt,
      },
      {
        level: 11,
        title: t('timeline_replacement_in_transit', 'Replacement in transit'),
        icon: 'car-outline',
        date: updatedAt,
      },
      {
        level: 12,
        title: t('timeline_exchange_completed', 'Exchange completed'),
        icon: 'swap-horizontal-outline',
        date: formatDate(requestDetails.completed_at),
      },
    ];
  };

  const rejected = status === 'store_rejected' || status === 'partially_rejected';
  const cancelled = status === 'cancelled';
  const expired = status === 'grace_period_expired';
  const cancelledOrRejected = rejected || cancelled || expired;
  const isCompleted = status === 'refund_completed' || status === 'exchange_completed';

  let steps: RenderStep[] = [];
  let activeIndex = 0;

  if (rejected) {
    steps = [
      {
        title: t('timeline_waiting_approval', 'Waiting approval'),
        date: createdAt,
        icon: 'document-text-outline',
      },
      {
        title: t('timeline_rejected', 'Rejected by Store'),
        date: formatDate(requestDetails.updated_at),
        icon: 'close-circle-outline',
        tone: 'danger',
      },
    ];
    activeIndex = 1;
  } else if (cancelled) {
    steps = [
      {
        title: t('timeline_waiting_approval', 'Waiting approval'),
        date: createdAt,
        icon: 'document-text-outline',
      },
      {
        title: t('timeline_cancelled', 'Request Cancelled'),
        date: formatDate(requestDetails.cancelled_at || requestDetails.updated_at),
        icon: 'ban-outline',
        tone: 'danger',
      },
    ];
    activeIndex = 1;
  } else if (expired) {
    steps = [
      {
        title: t('timeline_waiting_approval', 'Waiting approval'),
        date: createdAt,
        icon: 'document-text-outline',
      },
      {
        title: t('timeline_expired', 'Request Expired'),
        date: formatDate(requestDetails.updated_at),
        icon: 'time-outline',
        tone: 'danger',
      },
    ];
    activeIndex = 1;
  } else {
    const statusLevels = isRefund ? refundStatusLevels : exchangeStatusLevels;
    const currentLevel = statusLevels[status] || 1;
    const defs = buildHappyPathSteps();
    const foundIndex = defs.findIndex((def) => def.level === currentLevel);
    activeIndex = foundIndex >= 0 ? foundIndex : 0;
    steps = defs.map((def, index) => ({
      title: def.title,
      date: currentLevel >= def.level ? (index === 0 ? createdAt : def.date || null) : null,
      icon: def.icon,
    }));
  }

  const terminalIndex = steps.length - 1;
  const completedLikeOrder = isCompleted;

  const chipLabel = cancelledOrRejected
    ? rejected
      ? t('rejected', 'Rejected')
      : cancelled
        ? t('cancelled', 'Cancelled')
        : t('expired', 'Expired')
    : completedLikeOrder
      ? t('completed', 'Completed')
      : t('in_progress', 'In progress');

  const hint = cancelledOrRejected
    ? rejected
      ? t('timeline_rejected_hint', 'This request was not accepted')
      : cancelled
        ? t('timeline_cancelled_hint', 'This request was cancelled')
        : t('timeline_expired_hint', 'This request has expired')
    : t('timeline_live_hint', 'Live status updates');

  return (
    <GlassCard accent="#3B82F6" style={styles.card} contentStyle={styles.progressCard}>
      <View style={{ direction: viewDirection }}>
        <View style={styles.timelineHeader}>
          <View style={styles.timelineHeaderText}>
            <Text style={[styles.timelineTitle, { textAlign: 'left' }]}>
              {t('timeline', 'Request Timeline')}
            </Text>
            <Text style={[styles.timelineSubtitle, { textAlign: 'left' }]}>{hint}</Text>
          </View>
          <View
            style={[
              styles.timelineStatusChip,
              cancelledOrRejected
                ? styles.timelineStatusChipDanger
                : completedLikeOrder
                  ? styles.timelineStatusChipDone
                  : styles.timelineStatusChipLive,
            ]}
          >
            <View
              style={[
                styles.timelineStatusDot,
                {
                  backgroundColor: cancelledOrRejected
                    ? '#E11D48'
                    : completedLikeOrder
                      ? '#16A34A'
                      : '#2563EB',
                },
              ]}
            />
            <Text
              style={[
                styles.timelineStatusText,
                {
                  color: cancelledOrRejected
                    ? '#BE123C'
                    : completedLikeOrder
                      ? '#15803D'
                      : '#1D4ED8',
                },
              ]}
            >
              {chipLabel}
            </Text>
          </View>
        </View>

        <View style={styles.timelineList}>
          {steps.map((step, index) => {
            const isDanger = step.tone === 'danger';
            const complete = cancelledOrRejected
              ? index === 0 || index === terminalIndex
              : index < activeIndex || completedLikeOrder;
            const active = cancelledOrRejected
              ? index === terminalIndex
              : index === activeIndex && !completedLikeOrder;
            const done = complete || active;
            const lineActive = cancelledOrRejected
              ? index < terminalIndex
              : index < activeIndex || completedLikeOrder;
            const isLast = index === steps.length - 1;
            const toneColor =
              isDanger && done ? '#E11D48' : active ? '#2563EB' : complete ? '#16A34A' : '#94A3B8';
            const toneBg =
              isDanger && done ? '#FEE2E2' : active ? '#DBEAFE' : complete ? '#DCFCE7' : '#F1F5F9';

            return (
              <View key={`${step.title}-${index}`} style={styles.vStep}>
                <View style={[styles.vRail, { marginEnd: 12 }]}>
                  <TimelineStepDot
                    color={toneColor}
                    done={done}
                    pulse={active}
                    icon={isDanger ? 'close' : complete ? 'checkmark' : step.icon}
                    iconColor={done ? '#FFFFFF' : '#94A3B8'}
                  />
                  {!isLast ? (
                    <View
                      style={[
                        styles.vLine,
                        lineActive
                          ? { backgroundColor: isDanger ? '#FECDD3' : '#86EFAC' }
                          : styles.vLinePending,
                      ]}
                    />
                  ) : null}
                </View>

                <View
                  style={[
                    styles.vRow,
                    active && styles.vRowActive,
                    isDanger && done && styles.vRowDanger,
                    !isLast && styles.vRowSpaced,
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        styles.vLabel,
                        active && styles.vLabelActive,
                        isDanger && done && styles.vLabelDanger,
                        { textAlign: 'left' },
                      ]}
                      numberOfLines={1}
                    >
                      {step.title}
                    </Text>
                    <Text style={[styles.vTime, { textAlign: 'left' }]} numberOfLines={1}>
                      {step.date || '—'}
                    </Text>
                  </View>
                  <View style={[styles.vBadge, { backgroundColor: toneBg }]}>
                    <Ionicons name={step.icon} size={18} color={toneColor} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 0,
    marginTop: 4,
    marginBottom: 24,
  },
  progressCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  timelineHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },
  timelineHeaderText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  timelineTitle: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  timelineSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  timelineStatusChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    flexShrink: 0,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timelineStatusChipLive: { backgroundColor: '#EFF6FF' },
  timelineStatusChipDone: { backgroundColor: '#F0FDF4' },
  timelineStatusChipDanger: { backgroundColor: '#FEF2F2' },
  timelineStatusDot: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  timelineStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timelineList: {
    gap: 0,
    overflow: 'visible',
  },
  vStep: {
    flexDirection: 'row',
    overflow: 'visible',
  },
  vRail: {
    alignItems: 'center',
    alignSelf: 'stretch',
    overflow: 'visible',
    width: 42,
  },
  vLine: {
    flex: 1,
    marginVertical: 4,
    minHeight: 12,
    width: 3,
    borderRadius: 2,
  },
  vLinePending: { backgroundColor: '#E2E8F0' },
  vRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  vRowActive: {
    backgroundColor: 'rgba(239,246,255,0.95)',
    borderColor: '#BFDBFE',
  },
  vRowDanger: {
    backgroundColor: 'rgba(254,242,242,0.95)',
    borderColor: '#FECACA',
  },
  vRowSpaced: {
    marginBottom: 10,
  },
  vLabel: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  vLabelActive: { color: '#1D4ED8' },
  vLabelDanger: { color: '#BE123C' },
  vTime: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  vBadge: {
    alignItems: 'center',
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
