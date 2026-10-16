import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  TouchableOpacity,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import apiClient from '../../../api/apiClient';
import { OrderService } from '../../../api/services/order.service';
import { Text } from '../../../components/Text';
import { GlassCard } from './GlassCard';
import { StatusPulsePill } from './StatusPulsePill';
import { TimelineStepDot } from './TimelineStepDot';
import MoneyAmount from '../MoneyAmount';

const COLORS = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  ink: '#0F172A',
  muted: '#64748B',
  pale: '#F8FAFC',
  primary: '#6D2DE2',
  primaryDark: '#5720C7',
  line: '#E8EBF0',
  success: '#16A34A',
};

const ACCENT = {
  progress: '#3B82F6',
  items: '#F43F5E',
  address: '#10B981',
  bill: '#6366F1',
  delivery: '#14B8A6',
  driver: '#F59E0B',
  otp: '#EAB308',
  store: '#8B5CF6',
};

const cardShadow = {
  shadowColor: '#64748B',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.12,
  shadowRadius: 18,
  elevation: 4,
};

function surfaceCard(_accent?: string) {
  return {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    ...cardShadow,
  };
}

export type OrderItem = {
  id: string;
  productId?: string;
  title: string;
  price: string | number;
  quantity: number;
  option?: string;
  extras?: { label: string; price: number }[];
  image?: string;
};

type SelectionMode = 'none' | 'complaint' | 'return' | 'exchange';

type Props = {
  order: any;
  totals?: any;
  items: OrderItem[];
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack: () => void;
  onSupport: () => void;
  onComplaint: (itemIds: string[]) => void;
  onReturn: (itemIds: string[]) => void;
  onExchange: (itemIds: string[]) => void;
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function formatMoney(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '0.00';
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeStatus(status: unknown) {
  if (status && typeof status === 'object') {
    const nested =
      (status as { value?: unknown; status?: unknown; order_status?: unknown }).value ??
      (status as { status?: unknown }).status ??
      (status as { order_status?: unknown }).order_status;
    if (nested != null) {
      return normalizeStatus(nested);
    }
  }

  return String(status ?? 'new')
    .trim()
    .toLowerCase()
    .replaceAll('-', '_')
    .replaceAll(' ', '_');
}

function isTruthyFlag(value: unknown) {
  return value === true || value === 1 || value === '1';
}

function hasReviewedStore(order: any) {
  return isTruthyFlag(order?.user_has_reviewed_store);
}

function canReviewStore(order: any, status?: string) {
  if (hasReviewedStore(order)) {
    return false;
  }

  if (isTruthyFlag(order?.can_review_store)) {
    return true;
  }

  if (
    order?.can_review_store === false ||
    order?.can_review_store === 0 ||
    order?.can_review_store === '0'
  ) {
    return false;
  }

  return isDeliveredStatus(status ?? normalizeStatus(order?.status || order?.order_status));
}

function isPickupOrder(order: any) {
  const delegate = String(order?.request_deligate ?? order?.delivery_option ?? '')
    .trim()
    .toLowerCase();

  return (
    delegate === 'pickup' ||
    delegate === '2' ||
    String(order?.delivery_type ?? '')
      .trim()
      .toLowerCase() === 'pickup'
  );
}

function formatClock(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTimeWindow(startLabel: string, endLabel: string) {
  // Keep Latin times in visual LTR order inside RTL screens (avoid "AM 8:02 - 7:32 AM").
  return `\u2066${startLabel} – ${endLabel}\u2069`;
}

function getHistoryTime(order: any, statuses: string[]) {
  const history = [...(order?.order_status_histroy || order?.order_status_history || [])];

  const match = history.find((item) => statuses.includes(normalizeStatus(item?.order_status)));

  return formatClock(match?.created_at || match?.updated_at);
}

/** Confirmed = vendor accepted / preparing — not mere payment completion. */
function isVendorConfirmedStatus(status: string) {
  return [
    'accepted',
    'confirmed',
    'processing',
    'ready_for_delivery',
    'ready_for_pickup',
    'waiting_for_batch',
  ].includes(status);
}

function isReadyForCustomerStatus(status: string) {
  return ['ready_for_delivery', 'ready_for_pickup', 'waiting_for_batch'].includes(status);
}

function isOnTheWayStatus(status: string) {
  return [
    'on_the_way',
    'dispatched',
    'in_transit',
    'out_for_delivery',
    'sent_to_logistics',
    'picked_from_store',
    'driver_accepted',
  ].includes(status);
}

function isDeliveredStatus(status: string) {
  return ['delivered', 'completed', 'closed', 'completed_closed', 'picked_up', 'pickedup'].includes(
    status,
  );
}

function isCancelledOrRejectedStatus(status: string) {
  return ['cancelled', 'canceled', 'rejected'].includes(status);
}

function canCancelOrder(order: any, status: string) {
  if (isDeliveredStatus(status) || isCancelledOrRejectedStatus(status)) {
    return false;
  }
  if (isTruthyFlag(order?.has_pending_cancel_request)) {
    return false;
  }
  if (
    order?.can_cancel_order === false ||
    order?.can_cancel_order === 0 ||
    order?.can_cancel_order === '0'
  ) {
    return false;
  }
  return true;
}

function getProgressIndex(status: string, pickup = false) {
  if (isCancelledOrRejectedStatus(status)) {
    return 0;
  }

  if (isDeliveredStatus(status)) {
    return 3;
  }

  // Pickup: ready_* is the 3rd step ("Ready for Pickup"), not still "Confirmed".
  if (pickup && (isReadyForCustomerStatus(status) || isOnTheWayStatus(status))) {
    return 2;
  }

  if (!pickup && isOnTheWayStatus(status)) {
    return 2;
  }

  if (
    ['accepted', 'confirmed', 'processing'].includes(status) ||
    (!pickup && isReadyForCustomerStatus(status))
  ) {
    return 1;
  }

  // pending / payment_completed stay on "Order Placed"
  return 0;
}

function getEstimatedArrivalWindow(order: any) {
  if (order?.estimated_delivery_time) {
    return String(order.estimated_delivery_time);
  }

  const baseRaw =
    order?.scheduled_date || order?.booking_date || order?.created_at || order?.updated_at;

  if (!baseRaw) return null;

  const base = new Date(baseRaw);
  if (Number.isNaN(base.getTime())) return null;

  const start = new Date(base.getTime() + 45 * 60 * 1000);
  const end = new Date(base.getTime() + 75 * 60 * 1000);
  const startLabel = formatClock(start);
  const endLabel = formatClock(end);

  if (!startLabel || !endLabel) return null;
  return formatTimeWindow(startLabel, endLabel);
}

function Header({
  order,
  onBack,
  onTrack,
}: {
  order: any;
  onBack: () => void;
  onTrack?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const invoice = String(order?.invoice_id ?? order?.id ?? '');
  const orderId = String(order?.id ?? '');
  const isAr = i18n.language?.startsWith('ar');
  const [copied, setCopied] = useState<'order' | 'invoice' | null>(null);

  const copyValue = async (value: string, kind: 'order' | 'invoice') => {
    if (!value) return;
    try {
      await Clipboard.setStringAsync(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      Alert.alert(t('error', 'Error'), t('copy_failed', 'Could not copy'));
    }
  };

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel={t('back', 'Back')}
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
      >
        <Ionicons
          name={isAr ? 'chevron-forward' : 'chevron-back'}
          size={27}
          color={COLORS.primary}
        />
      </Pressable>

      <View style={styles.headerTitleWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('copy', 'Copy')} ${t('order_number', 'Order #')}${orderId}`}
          hitSlop={6}
          onPress={() => copyValue(orderId, 'order')}
        >
          <Text numberOfLines={1} selectable style={styles.headerTitle}>
            {t('order_number', 'Order #')}
            {order?.id}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('copy', 'Copy')} ${t('invoice_number', 'Invoice number')} ${invoice}`}
          hitSlop={8}
          onPress={() => copyValue(invoice, 'invoice')}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <View style={styles.invoiceRow}>
            <RNText numberOfLines={1} style={styles.invoiceText}>
              {invoice}
            </RNText>
            <Ionicons
              name={copied === 'invoice' ? 'checkmark' : 'copy-outline'}
              size={16}
              color={copied === 'invoice' ? '#16A34A' : COLORS.primary}
              style={styles.invoiceCopyIcon}
            />
          </View>
        </Pressable>
      </View>

      {onTrack ? (
        <Pressable
          accessibilityLabel={t('track_order', 'Track')}
          hitSlop={8}
          onPress={onTrack}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
            { backgroundColor: '#F0EBFF', width: 'auto', paddingHorizontal: 12, borderRadius: 20 },
          ]}
          className="flex-row items-center gap-1"
        >
          <Ionicons name="map" size={20} color={COLORS.primary} />
          <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 13 }}>
            {t('track', 'Track')}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityLabel={t('more_options', 'More options')}
          hitSlop={8}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons name="ellipsis-horizontal" size={25} color={COLORS.ink} />
        </Pressable>
      )}
    </View>
  );
}

function StatusHero({
  order,
  refreshing,
  onRefresh,
  onTrack,
}: {
  order: any;
  refreshing?: boolean;
  onRefresh?: () => void;
  onTrack?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const status = normalizeStatus(order?.status || order?.order_status);
  const pickup = isPickupOrder(order);
  const delivered = isDeliveredStatus(status);
  const cancelledOrRejected = isCancelledOrRejectedStatus(status);
  const rejected = status === 'rejected';
  const readyForPickup = pickup && (isReadyForCustomerStatus(status) || isOnTheWayStatus(status));
  const onTheWay = !pickup && isOnTheWayStatus(status);
  const confirmed =
    ['accepted', 'confirmed', 'processing'].includes(status) ||
    (!pickup && isReadyForCustomerStatus(status));
  const estimatedWindow = getEstimatedArrivalWindow(order);

  const statusLabel = cancelledOrRejected
    ? rejected
      ? t('rejected', 'Rejected')
      : t('cancelled', 'Cancelled')
    : delivered
      ? pickup
        ? t('picked_up', 'Picked Up')
        : t('delivered', 'Delivered')
      : readyForPickup
        ? t('ready_for_pickup', 'Ready for Pickup')
        : onTheWay
          ? t('on_the_way', 'On the Way')
          : confirmed
            ? pickup
              ? t('preparing', 'Preparing')
              : t('confirmed', 'Confirmed')
            : t('pending', 'Pending');

  const heroHeading = cancelledOrRejected
    ? rejected
      ? t('order_rejected_heading', 'Your order was rejected')
      : t('order_cancelled_heading', 'Your order was cancelled')
    : delivered
      ? pickup || ['pickedup', 'picked_up'].includes(status)
        ? t('order_picked_up', 'Your order is picked up!')
        : t('order_delivered', 'Your order has arrived!')
      : readyForPickup
        ? t('order_ready_for_pickup_heading', 'Your order is ready for pickup')
        : onTheWay
          ? t('your_order_is_on_the_way', 'Your order is on the way!')
          : confirmed
            ? pickup
              ? t('store_preparing_order', 'The store is preparing your order')
              : t('order_confirmed_heading', 'Your order is confirmed')
            : t('order_placed_heading', 'Your order has been placed');

  const isAr = i18n.language?.startsWith('ar');
  const alignText: 'left' | 'right' = isAr ? 'right' : 'left';
  const writingDirection = isAr ? 'rtl' : 'ltr';

  // Force physical LTR coordinates so native RTL does not invert absolute sides.
  const copyPos = isAr ? { right: 0, left: undefined } : { left: 0, right: undefined };
  const scooterPos = isAr ? { left: -36, right: undefined } : { right: -56, left: undefined };
  const orbPos = isAr ? { left: -12, right: undefined } : { right: -12, left: undefined };
  const scooterScale = isAr ? -1 : 1;

  return (
    <View style={[styles.hero, cardShadow, { direction: 'ltr' }]}>
      <LinearGradient
        colors={cancelledOrRejected ? ['#FFFFFF', '#FFF1F2'] : ['#FFFFFF', '#F4EFFF']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.heroGradient, { direction: 'ltr' }]}
      >
        <View pointerEvents="none" style={[styles.heroOrb, orbPos]} />
        <View style={[styles.heroTopRow, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
          <StatusPulsePill
            color={
              cancelledOrRejected
                ? '#E11D48'
                : delivered
                  ? '#16A34A'
                  : readyForPickup
                    ? '#0D9488'
                    : onTheWay
                      ? '#EA580C'
                      : confirmed
                        ? '#2563EB'
                        : '#F59E0B'
            }
            icon={
              cancelledOrRejected
                ? 'close-circle'
                : delivered
                  ? 'checkmark-circle'
                  : pickup
                    ? 'storefront'
                    : onTheWay
                      ? 'car-sport'
                      : 'receipt'
            }
            label={statusLabel}
          />

          <Pressable
            accessibilityLabel={t('refresh_order', 'Refresh order')}
            disabled={refreshing}
            onPress={onRefresh}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.pressed,
              refreshing && styles.disabled,
            ]}
          >
            <Ionicons name="refresh" size={24} color={COLORS.primary} />
          </Pressable>
        </View>

        <View style={[styles.heroBody, { direction: 'ltr' }]}>
          <View style={[styles.heroCopy, copyPos]}>
            <Text style={[styles.heroHeading, { textAlign: alignText, writingDirection }]}>
              {heroHeading}
            </Text>
            {cancelledOrRejected ? (
              <Text
                style={[
                  styles.arrivingLabel,
                  { marginTop: 8, textAlign: alignText, writingDirection },
                ]}
              >
                {rejected
                  ? t(
                      'order_rejected_msg',
                      'The store could not accept this order. If payment was taken, a refund will be processed.',
                    )
                  : t('order_cancelled_msg', 'This order has been cancelled.')}
              </Text>
            ) : delivered ? (
              <Text
                style={[
                  styles.arrivingLabel,
                  { marginTop: 8, textAlign: alignText, writingDirection },
                ]}
              >
                {t(
                  'delivered_thank_you_msg',
                  'Thank you for shopping with us! We hope you enjoy your purchase.',
                )}
              </Text>
            ) : pickup ? (
              <Text style={[styles.arrivingLabel, { textAlign: alignText, writingDirection }]}>
                {confirmed
                  ? t('pickup_ready_soon', 'Collect from store when ready')
                  : t('pickup_waiting_confirmation', 'Waiting for store confirmation')}
              </Text>
            ) : onTheWay ? (
              <Text
                style={[
                  styles.arrivingLabel,
                  { marginTop: 8, textAlign: alignText, writingDirection },
                ]}
              >
                {t('your_order_is_on_the_way', 'Order is on the way!')}
              </Text>
            ) : (
              <Text
                style={[
                  styles.arrivingLabel,
                  { marginTop: 8, textAlign: alignText, writingDirection },
                ]}
              >
                {confirmed
                  ? t('order_confirmed_heading', 'Order is confirmed')
                  : t('order_placed_heading', 'Order placed')}
              </Text>
            )}
          </View>

          <Image
            accessibilityLabel={t('delivery_scooter', 'Delivery scooter')}
            contentFit="contain"
            source={require('../../../../assets/images/scooter.png')}
            style={[styles.scooter, scooterPos, { transform: [{ scaleX: scooterScale }] }]}
          />
        </View>
      </LinearGradient>
    </View>
  );
}

function ProgressCard({ order }: { order: any }) {
  const { t, i18n } = useTranslation();
  const status = normalizeStatus(order?.status || order?.order_status);
  const pickup = isPickupOrder(order);
  const cancelledOrRejected = isCancelledOrRejectedStatus(status);
  const rejected = status === 'rejected';
  const activeIndex = cancelledOrRejected ? 1 : getProgressIndex(status, pickup);

  const placedTime =
    formatClock(order?.placed_at || order?.created_at) ||
    getHistoryTime(order, ['pending', 'payment_completed']) ||
    t('pending', 'Pending');

  const rejectedTime =
    formatClock(order?.rejected_at || order?.cancelled_at || order?.updated_at) ||
    getHistoryTime(order, ['rejected', 'cancelled', 'canceled']) ||
    '';

  const confirmedTime =
    activeIndex >= 1
      ? formatClock(order?.confirmed_at || order?.vendor_acknowledged_at) ||
        getHistoryTime(order, ['accepted', 'processing']) ||
        t('pending', 'Pending')
      : t('pending', 'Pending');

  const dispatchedTime =
    activeIndex >= 2
      ? formatClock(order?.dispatched_at) ||
        getHistoryTime(
          order,
          pickup
            ? ['ready_for_delivery', 'ready_for_pickup', 'waiting_for_batch', 'dispatched']
            : [
                'dispatched',
                'in_transit',
                'out_for_delivery',
                'sent_to_logistics',
                'picked_from_store',
              ],
        ) ||
        t('pending', 'Pending')
      : t('pending', 'Pending');

  const deliveredTime =
    activeIndex === 3
      ? formatClock(order?.delivered_at || order?.updated_at) ||
        getHistoryTime(order, ['delivered', 'picked_up', 'completed', 'completed_closed']) ||
        ''
      : t('pending', 'Pending');

  const steps: {
    label: string;
    time: string;
    icon: IconName;
    tone?: 'danger';
  }[] = cancelledOrRejected
    ? [
        {
          label: t('order_placed', 'Order Placed'),
          time: placedTime,
          icon: 'receipt-outline',
        },
        {
          label: rejected ? t('rejected', 'Rejected') : t('cancelled', 'Cancelled'),
          time: rejectedTime || t('done', 'Done'),
          icon: 'close',
          tone: 'danger',
        },
      ]
    : [
        {
          label: t('order_placed', 'Order Placed'),
          time: placedTime,
          icon: 'receipt-outline',
        },
        {
          label: t('confirmed', 'Confirmed'),
          time: confirmedTime,
          icon: 'shield-checkmark-outline',
        },
        {
          label: pickup
            ? t('ready_for_pickup', 'Ready for Pickup')
            : t('out_for_delivery', 'Out for Delivery'),
          time: dispatchedTime,
          icon: pickup ? 'storefront-outline' : 'bicycle-outline',
        },
        {
          label: pickup ? t('picked_up', 'Picked Up') : t('delivered', 'Delivered'),
          time: deliveredTime,
          icon: 'cube-outline',
        },
      ];

  const terminalIndex = steps.length - 1;

  const isAr = i18n.language?.startsWith('ar');
  const viewDirection = isAr ? 'rtl' : 'ltr';

  return (
    <GlassCard accent={ACCENT.progress} contentStyle={styles.progressCard}>
      <View style={{ direction: viewDirection }}>
        <View style={styles.timelineHeader}>
          <View style={styles.timelineHeaderText}>
            <Text style={[styles.timelineTitle, { textAlign: 'left' }]}>
              {t('order_timeline', 'Order timeline')}
            </Text>
            <Text style={[styles.timelineSubtitle, { textAlign: 'left' }]}>
              {cancelledOrRejected
                ? rejected
                  ? t('timeline_rejected_hint', 'This order was not accepted')
                  : t('timeline_cancelled_hint', 'This order was cancelled')
                : t('timeline_live_hint', 'Live status updates')}
            </Text>
          </View>
          <View
            style={[
              styles.timelineStatusChip,
              cancelledOrRejected
                ? styles.timelineStatusChipDanger
                : activeIndex === 3
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
                    : activeIndex === 3
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
                    : activeIndex === 3
                      ? '#15803D'
                      : '#1D4ED8',
                },
              ]}
            >
              {cancelledOrRejected
                ? rejected
                  ? t('rejected', 'Rejected')
                  : t('cancelled', 'Cancelled')
                : activeIndex === 3
                  ? t('completed', 'Completed')
                  : t('in_progress', 'In progress')}
            </Text>
          </View>
        </View>

        <View style={styles.timelineList}>
          {steps.map((step, index) => {
            const isDanger = step.tone === 'danger';
            const complete = cancelledOrRejected
              ? index === 0 || index === terminalIndex
              : index < activeIndex || activeIndex === 3;
            const active = cancelledOrRejected
              ? index === terminalIndex
              : index === activeIndex && activeIndex !== 3;
            const done = complete || active;
            const lineActive = cancelledOrRejected
              ? index < terminalIndex
              : index < activeIndex || activeIndex === 3;
            const isLast = index === steps.length - 1;
            const toneColor =
              isDanger && done ? '#E11D48' : active ? '#2563EB' : complete ? '#16A34A' : '#94A3B8';
            const toneBg =
              isDanger && done ? '#FEE2E2' : active ? '#DBEAFE' : complete ? '#DCFCE7' : '#F1F5F9';

            return (
              <View key={`${step.label}-${index}`} style={styles.vStep}>
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
                      {step.label}
                    </Text>
                    <Text style={[styles.vTime, { textAlign: 'left' }]} numberOfLines={1}>
                      {step.time || '—'}
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
}

function ItemsCard({
  items,
  selectionMode,
  selectedIds,
  onToggle,
}: {
  items: OrderItem[];
  selectionMode: SelectionMode;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const extraAlign = isAr
    ? { textAlign: 'right' as const, writingDirection: 'rtl' as const, width: '100%' as const }
    : { textAlign: 'left' as const };
  const extraLineAlign = isAr
    ? { textAlign: 'right' as const, writingDirection: 'rtl' as const }
    : { textAlign: 'left' as const };

  return (
    <GlassCard accent={ACCENT.items}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {t('your_items', 'Your Items')} ({items.length})
        </Text>
        {selectionMode === 'none' ? (
          <View style={styles.viewAll}>
            <Text style={styles.viewAllText}>{t('view_all', 'View All')}</Text>
            <Ionicons name="chevron-down" size={18} color="#DB2777" />
          </View>
        ) : (
          <Text style={styles.selectedLabel}>
            {selectedIds.length} {t('selected', 'selected')}
          </Text>
        )}
      </View>

      {items.map((item, index) => {
        const selected = selectedIds.includes(item.id);
        return (
          <Pressable
            accessibilityRole={selectionMode === 'none' ? undefined : 'checkbox'}
            accessibilityState={selectionMode === 'none' ? undefined : { checked: selected }}
            key={item.id}
            onPress={() => selectionMode !== 'none' && onToggle(item.id)}
            style={[styles.itemRow, index > 0 && styles.itemDivider]}
          >
            {selectionMode !== 'none' && (
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected && <Ionicons name="checkmark" size={17} color="#FFFFFF" />}
              </View>
            )}
            <View style={styles.productImageWrap}>
              {item.image ? (
                <Image
                  contentFit="cover"
                  source={{ uri: item.image }}
                  style={styles.productImage}
                />
              ) : (
                <Ionicons name="fast-food" size={28} color={ACCENT.items} />
              )}
            </View>
            <View style={styles.itemCopy}>
              <Text numberOfLines={2} style={styles.itemTitle}>
                {item.title}
              </Text>
              {!!item.option && (
                <Text numberOfLines={2} style={[styles.itemOption, extraAlign]}>
                  {item.option}
                </Text>
              )}
              {(item.extras ?? []).map((extra, extraIndex) => (
                <View
                  key={`${item.id}-extra-${extraIndex}`}
                  style={[styles.extraRow, { flexDirection: isAr ? 'row-reverse' : 'row' }]}
                >
                  <View style={styles.extraDot}>
                    <View style={styles.extraDotInner} />
                  </View>
                  <Text
                    numberOfLines={2}
                    style={[styles.itemOption, extraLineAlign, styles.extraLabel]}
                  >
                    {extra.label}
                  </Text>
                  <MoneyAmount
                    amount={extra.price}
                    size={10}
                    color="#64748B"
                    textStyle={styles.extraPrice}
                  />
                </View>
              ))}
              <Text style={[styles.itemQuantity, extraAlign]}>
                {t('qty', 'Qty:')} {item.quantity}
              </Text>
            </View>
            <View style={styles.priceWrap}>
              <MoneyAmount
                amount={formatMoney(item.price)}
                size={13}
                color="#0F172A"
                textStyle={styles.itemPrice}
                decimals={null}
              />
            </View>
          </Pressable>
        );
      })}
    </GlassCard>
  );
}

function AddressCard({ address, order }: { address: any; order?: any }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');

  const value =
    address?.address ??
    [address?.street, address?.city, address?.state, address?.country].filter(Boolean).join(', ');

  const openOnGoogleMaps = async () => {
    const lat = Number(address?.lat);
    const lng = Number(address?.lng);

    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

    const query = hasCoords ? `${lat},${lng}` : encodeURIComponent(String(value || ''));

    if (!query) {
      Alert.alert(
        t('error', 'Error'),
        t('location_unavailable', 'Location information is unavailable.'),
      );
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        throw new Error('Cannot open maps URL');
      }
    } catch (error) {
      console.error('Failed to open maps:', error);
      Alert.alert(t('error', 'Error'), t('maps_open_failed', 'Could not open Google Maps.'));
    }
  };

  return (
    <GlassCard accent={ACCENT.address} contentStyle={styles.detailCard}>
      <View style={styles.detailIcon}>
        <Ionicons name="location" size={28} color={ACCENT.address} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.sectionTitle}>{t('delivery_address', 'Delivery Address')}</Text>
        <Text numberOfLines={3} style={styles.addressText}>
          {value}
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={openOnGoogleMaps}
          className="flex-row items-center gap-1 mt-3"
          style={({ pressed }) => [styles.mapLink, pressed && styles.pressed]}
        >
          <Text style={styles.mapLinkText}>{t('view_on_map', 'View on Map')}</Text>
          <Ionicons
            name={isAr ? 'chevron-back' : 'chevron-forward'}
            size={16}
            color={COLORS.primary}
          />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={openOnGoogleMaps}
        style={({ pressed }) => [styles.mapPreview, pressed && styles.pressed]}
      >
        <View style={[styles.mapRoad, { top: 21, transform: [{ rotate: '12deg' }] }]} />
        <View style={[styles.mapRoad, { top: 52, transform: [{ rotate: '-9deg' }] }]} />
        <View style={[styles.mapRoadVertical, { left: 24, transform: [{ rotate: '13deg' }] }]} />
        <Ionicons name="location" size={28} color={ACCENT.address} />
      </Pressable>
    </GlassCard>
  );
}

function asMoney(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function BillCard({ order, totals }: { order: any; totals: any }) {
  const { t } = useTranslation();
  const pickup = isPickupOrder(order);
  const itemEx = asMoney(
    totals?.merchandise_ex_vat ?? totals?.subtotal_ex_vat ?? totals?.subtotal ?? 0,
  );
  const productVat = asMoney(totals?.vat_product);
  const itemInc = asMoney(totals?.merchandise_inc_vat);
  const vatApplication = asMoney(totals?.vat_application);
  const vatShipping = asMoney(totals?.vat_shipping);
  const applicationFee = asMoney(totals?.application_fee_ex_vat ?? order?.application_fee);
  const delivery = asMoney(
    totals?.delivery_charge_ex_vat ?? order?.shipping_charge ?? totals?.shipping,
  );
  let tax = Number((vatApplication + (pickup ? 0 : vatShipping)).toFixed(2));
  if (tax <= 0 && applicationFee > 0) {
    tax = Number((applicationFee * 0.15).toFixed(2));
  }
  let itemTotal = itemInc > 0 ? itemInc : Number((itemEx + productVat).toFixed(2));
  if (itemTotal <= itemEx && itemEx > 0) {
    const leftoverProductVat = Number((asMoney(totals?.vat_total ?? totals?.tax) - tax).toFixed(2));
    if (leftoverProductVat > 0) {
      itemTotal = Number((itemEx + leftoverProductVat).toFixed(2));
    }
  }
  const grandTotal = asMoney(totals?.grand_total ?? order?.grand_total ?? 0);
  const tip = asMoney(totals?.tip ?? order?.tip_amount);
  const itemDiscount = asMoney(order?.item_discount ?? totals?.item_discount);
  const couponDiscount = asMoney(order?.coupon_discount ?? totals?.coupon_discount);
  const couponCode = String(order?.coupon_code ?? '').trim();
  const rawPayment = String(order?.payment_method ?? 'wallet').toLowerCase();
  const payment = rawPayment.includes('apple')
    ? t('apple_pay')
    : rawPayment.includes('card')
      ? t('card_payment')
      : rawPayment.includes('wallet')
        ? t('wallet')
        : t('wallet');
  const paymentIcon: IconName = rawPayment.includes('card')
    ? 'card-outline'
    : rawPayment.includes('wallet')
      ? 'wallet-outline'
      : 'cash-outline';

  const rows: {
    key: string;
    label: string;
    value: number;
    free?: boolean;
    discount?: boolean;
  }[] = [{ key: 'items', label: t('item_total', 'Item Total'), value: itemTotal }];

  if (itemDiscount > 0) {
    rows.push({
      key: 'discount',
      label: t('discount_label'),
      value: itemDiscount,
      discount: true,
    });
  }

  if (couponDiscount > 0 || couponCode) {
    rows.push({
      key: 'coupon',
      label: couponCode
        ? `${t('coupon_discount_label')} (${couponCode})`
        : t('coupon_discount_label'),
      value: couponDiscount,
      discount: true,
    });
  }

  if (applicationFee > 0 || pickup) {
    rows.push({
      key: 'application',
      label: t('application_fee_label'),
      value: applicationFee,
    });
  }

  if (!pickup) {
    rows.push({
      key: 'delivery',
      label: t('delivery_charge'),
      value: delivery,
      free: delivery <= 0,
    });
  }

  if (tip > 0) {
    rows.push({
      key: 'tip',
      label: t('tip_label', 'Tip'),
      value: tip,
    });
  }

  if (tax > 0) {
    rows.push({
      key: 'tax',
      label: t('tax_charge', 'Tax Charge'),
      value: tax,
    });
  }

  return (
    <GlassCard accent={ACCENT.bill} contentStyle={styles.billCard}>
      <View style={styles.billTop}>
        <View style={styles.detailIcon}>
          <Ionicons name="receipt" size={28} color={ACCENT.bill} />
        </View>
        <View style={styles.billContent}>
          <Text style={styles.sectionTitle}>{t('bill_summary', 'Bill Summary')}</Text>
          {rows.map((row) => (
            <View key={row.key} style={styles.billRow}>
              <Text style={[styles.billLabel, row.discount && { color: COLORS.success }]}>
                {row.label}
              </Text>
              {row.free ? (
                <View style={styles.billFreePill}>
                  <Text style={styles.billFreeText}>{t('free_label')}</Text>
                </View>
              ) : (
                <MoneyAmount
                  amount={`${row.discount ? '-' : ''}${formatMoney(row.value)}`}
                  size={11}
                  color={row.discount ? COLORS.success : COLORS.ink}
                  textStyle={[styles.billValue, row.discount && { color: COLORS.success }]}
                  decimals={null}
                />
              )}
            </View>
          ))}
          <View style={styles.billDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('total_amount', 'Total Amount')}</Text>
            <MoneyAmount
              amount={formatMoney(grandTotal)}
              size={14}
              color={COLORS.primary}
              textStyle={styles.totalValue}
              decimals={null}
            />
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>{t('payment_method', 'Payment Method')}</Text>
            <View style={styles.paymentPill}>
              <Ionicons name={paymentIcon} size={22} color="#2563EB" />
              <Text numberOfLines={1} style={styles.paymentText}>
                {payment}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

function ActionButtons({
  order,
  onSelectMode,
}: {
  order: any;
  onSelectMode: (mode: Exclude<SelectionMode, 'none'> | string) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  const isFoodOrder =
    order?.store?.is_food === 1 ||
    order?.store?.is_food === true ||
    order?.store?.is_food === '1' ||
    order?.vendor?.is_food_vendor === true ||
    order?.vendor?.is_food_vendor === 1;

  // Return / Exchange are non-food only (backend also sends allows_returns_and_exchange).
  const canReturnExchange =
    order?.allows_returns_and_exchange === true ||
    order?.allows_returns_and_exchange === 1 ||
    order?.allows_returns_and_exchange === '1' ||
    (!isFoodOrder && order?.allows_returns_and_exchange == null);

  const actions: {
    mode: Exclude<SelectionMode, 'none'> | string;
    label: string;
    icon: IconName;
    customPress?: () => void;
  }[] = [
    {
      mode: 'complaint',
      label:
        order?.complaint_exist === true ||
        order?.complaint_exist === 1 ||
        order?.complaint_exist === '1'
          ? t('view_complaint', 'View Complaint')
          : t('complaint', 'Complaint'),
      icon: 'headset-outline',
    },
  ];

  if (canReturnExchange) {
    if (order?.is_refund_exist || order?.is_exchange_exist) {
      actions.push({
        mode: 'view_request',
        label: t('view_request', 'View Request'),
        icon: 'document-text-outline',
        customPress: () => {
          const request = order?.order_requests?.[0];
          if (request) {
            router.push({
              pathname: '/profile/RequestDetailsScreen',
              params: { requestId: String(request.id) },
            });
          }
        },
      });
    } else {
      actions.push(
        {
          mode: 'return',
          label: t('return', 'Return'),
          icon: 'return-up-back-outline',
        },
        {
          mode: 'exchange',
          label: t('exchange', 'Exchange'),
          icon: 'swap-horizontal-outline',
        },
      );
    }
  }

  const actionTone: Record<string, { bg: string; fg: string }> = {
    complaint: { bg: '#FEF2F2', fg: '#BE123C' },
    return: { bg: '#EFF6FF', fg: '#1D4ED8' },
    exchange: { bg: '#FFFBEB', fg: '#C2410C' },
    view_request: { bg: '#F0FDFA', fg: '#0F766E' },
  };

  return (
    <View style={styles.actionsRow}>
      {actions.map((action) => {
        const tone = actionTone[action.mode] || { bg: '#EEF2FF', fg: COLORS.primary };
        return (
          <Pressable
            accessibilityRole="button"
            key={action.mode}
            onPress={() => {
              if (action.customPress) {
                action.customPress();
              } else {
                onSelectMode(action.mode as Exclude<SelectionMode, 'none'>);
              }
            }}
            style={[
              styles.actionButton,
              cardShadow,
              { backgroundColor: tone.bg, borderColor: tone.bg },
            ]}
          >
            <Ionicons name={action.icon} size={20} color={tone.fg} />
            <Text numberOfLines={2} style={[styles.actionLabel, { color: tone.fg }]}>
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SupportCard({ onSupport }: { onSupport: () => void }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');

  return (
    <GlassCard accent={ACCENT.store} contentStyle={styles.storeCard} style={{ marginBottom: 8 }}>
      <Pressable
        accessibilityRole="button"
        onPress={onSupport}
        style={{
          alignItems: 'center',
          flexDirection: isAr ? 'row-reverse' : 'row',
        }}
      >
        <View style={[styles.detailIcon, { backgroundColor: '#F5F3FF' }]}>
          <Ionicons name="headset-outline" size={26} color={ACCENT.store} />
        </View>
        <View style={styles.detailCopy}>
          <Text
            numberOfLines={2}
            style={[styles.sectionTitle, { textAlign: isAr ? 'right' : 'left' }]}
          >
            {t('need_help_order', 'Need help with your order?')}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.storeName, { color: ACCENT.store, textAlign: isAr ? 'right' : 'left' }]}
          >
            {t('chat_with_support', 'Chat with Support')}
          </Text>
        </View>
        <Ionicons name={isAr ? 'chevron-back' : 'chevron-forward'} size={20} color={COLORS.muted} />
      </Pressable>
    </GlassCard>
  );
}

function SelectionBar({
  mode,
  count,
  onCancel,
  onContinue,
}: {
  mode: Exclude<SelectionMode, 'none'>;
  count: number;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  const labels = {
    complaint: t('continue_complaint', 'Continue Complaint'),
    return: t('continue_return', 'Continue Return'),
    exchange: t('continue_exchange', 'Continue Exchange'),
  };

  return (
    <View style={[styles.selectionBar, cardShadow]}>
      <Pressable
        accessibilityLabel={t('cancel', 'Cancel')}
        onPress={onCancel}
        style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
      >
        <Ionicons name="close" size={23} color={COLORS.ink} />
      </Pressable>
      <Text style={styles.selectionCount}>
        {count} {t('selected', 'selected')}
      </Text>
      <Pressable
        disabled={count === 0}
        onPress={onContinue}
        style={({ pressed }) => [
          styles.continueButton,
          count === 0 && styles.disabledButton,
          pressed && count > 0 && styles.pressed,
        ]}
      >
        <Text numberOfLines={1} style={styles.continueText}>
          {labels[mode]}
        </Text>
      </Pressable>
    </View>
  );
}

function DeliveryOptionCard({ order }: { order: any }) {
  const { t } = useTranslation();
  const pickup = isPickupOrder(order);
  const label =
    order?.delivery_option?.name ||
    (pickup ? t('pickup', 'Pickup') : order?.request_deligate ? t('delivery', 'Delivery') : null);

  if (!label) return null;

  return (
    <GlassCard
      accent={ACCENT.delivery}
      contentStyle={styles.detailCard}
      style={{ marginBottom: 2 }}
    >
      <View style={styles.detailIcon}>
        <Ionicons name={pickup ? 'storefront' : 'cube'} size={28} color={ACCENT.delivery} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.sectionTitle}>{t('delivery_option', 'Delivery Option')}</Text>
        <Text style={styles.addressText}>{label}</Text>
      </View>
    </GlassCard>
  );
}

function DriverInfoCard({ order, onReview }: { order: any; onReview: () => void }) {
  const { t } = useTranslation();
  if (!order?.driver) return null;
  return (
    <GlassCard accent={ACCENT.driver} contentStyle={styles.detailCard} style={{ marginBottom: 2 }}>
      <View style={styles.detailIcon}>
        <Ionicons name="bicycle" size={28} color={ACCENT.driver} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.sectionTitle}>{t('driver_info', 'Driver Info')}</Text>
        <Text style={styles.addressText}>{order.driver.name}</Text>
        <Text style={styles.itemOption}>{order.driver.phone}</Text>
        <Pressable
          onPress={onReview}
          className="flex-row items-center gap-1 mt-3"
          style={({ pressed }) => [styles.mapLink, pressed && styles.pressed]}
        >
          <Text style={styles.mapLinkText}>{t('rate_driver', 'Rate Driver')}</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

function OTPCard({ order }: { order: any }) {
  const { t } = useTranslation();
  const status = normalizeStatus(order?.status || order?.order_status);
  const otp = order?.order_otp || order?.otp;
  const pickup = isPickupOrder(order);
  const progressIndex = getProgressIndex(status, pickup);

  // OTP is only for pickup collection. Delivery orders flash ready_for_delivery
  // for a moment before dispatch — do not show the card there.
  const shouldShowOtp =
    Boolean(otp) &&
    pickup &&
    !isDeliveredStatus(status) &&
    !['cancelled', 'rejected', 'returned'].includes(status) &&
    (isReadyForCustomerStatus(status) || progressIndex >= 2);

  if (!shouldShowOtp) return null;

  return (
    <GlassCard accent={ACCENT.otp} contentStyle={styles.detailCard} style={{ marginBottom: 2 }}>
      <View style={styles.detailIcon}>
        <Ionicons name="keypad" size={28} color={ACCENT.otp} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.sectionTitle}>{t('verification_code', 'Verification Code (OTP)')}</Text>
        <View style={styles.otpCodeRow}>
          {String(otp)
            .replace(/\D/g, '')
            .padEnd(4, ' ')
            .slice(0, 4)
            .split('')
            .map((digit, index) => (
              <View key={`otp-view-${index}`} style={styles.otpCodeBox}>
                <RNText style={styles.otpCodeDigit}>{digit.trim()}</RNText>
              </View>
            ))}
        </View>
        <Text style={styles.itemOption}>
          {pickup
            ? t('show_otp_pickup_msg', 'Show this code at the store when collecting your order')
            : t('show_otp_msg', 'Show this code to the store or driver')}
        </Text>
      </View>
    </GlassCard>
  );
}

function StoreDetailsCard({ order }: { order: any }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const store = order?.store ?? order?.seller;
  if (!store) return null;

  const storeName = store?.name ?? store?.store_name;
  const phone = store?.phone ?? store?.mobile ?? store?.contact_phone;
  const email = store?.email ?? store?.contact_email;
  const address =
    store?.address ??
    store?.location_name ??
    [store?.street, store?.city, store?.state].filter(Boolean).join(', ');

  const hasReviewed = hasReviewedStore(order);
  const rating = Number(order?.user_store_review?.rating ?? 0);

  const pills: {
    icon: IconName;
    label: string;
    value: string;
    color: string;
    onPress?: () => void;
  }[] = [];
  if (phone) {
    pills.push({
      icon: 'call-outline',
      label: t('phone', 'Phone'),
      value: String(phone),
      color: ACCENT.delivery,
      onPress: () => Linking.openURL(`tel:${String(phone).replace(/\s+/g, '')}`),
    });
  }
  if (email) {
    pills.push({
      icon: 'mail-outline',
      label: t('email', 'Email'),
      value: String(email),
      color: ACCENT.bill,
      onPress: () => Linking.openURL(`mailto:${String(email).trim()}`),
    });
  }
  if (address) {
    pills.push({
      icon: 'location-outline',
      label: t('address', 'Address'),
      value: String(address),
      color: ACCENT.driver,
      onPress: () =>
        Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(String(address))}`),
    });
  }

  return (
    <GlassCard accent={ACCENT.store} contentStyle={styles.storeCard}>
      <View style={styles.storeHeader}>
        <View style={[styles.detailIcon, { backgroundColor: '#F5F3FF' }]}>
          <Ionicons name="storefront" size={28} color={ACCENT.store} />
        </View>
        <View style={styles.storeHeaderCopy}>
          <Text style={styles.sectionTitle}>{t('store_details', 'Store Details')}</Text>
          {!!storeName ? (
            <Text numberOfLines={2} style={styles.storeName}>
              {storeName}
            </Text>
          ) : null}
        </View>
      </View>

      {pills.length > 0 ? (
        <View style={styles.storePills}>
          {pills.map((pill) => (
            <TouchableOpacity
              key={pill.label}
              onPress={pill.onPress}
              activeOpacity={0.7}
              style={[styles.storePill, { flexDirection: isAr ? 'row-reverse' : 'row' }]}
            >
              <View style={[styles.storePillIcon, { backgroundColor: `${pill.color}14` }]}>
                <Ionicons name={pill.icon} size={20} color={pill.color} />
              </View>
              <View style={styles.storePillCopy}>
                <Text
                  style={[styles.storePillLabel, { textAlign: isAr ? 'right' : 'left' }]}
                  numberOfLines={1}
                >
                  {pill.label}
                </Text>
                <Text
                  style={[styles.storePillValue, { textAlign: isAr ? 'right' : 'left' }]}
                  numberOfLines={2}
                >
                  {pill.value}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {hasReviewed ? (
        <View className="flex-row items-center gap-1.5 mt-3">
          <View className="flex-row items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= rating ? 'star' : 'star-outline'}
                size={14}
                color={star <= rating ? '#FFB400' : '#D1D5DB'}
              />
            ))}
          </View>
          <Text style={[styles.mapLinkText, { color: COLORS.muted }]}>
            {t('already_rated_store', 'You rated this store')}
          </Text>
        </View>
      ) : null}
    </GlassCard>
  );
}

function RateStoreCard({ order, onReview }: { order: any; onReview: () => void }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');

  if (!canReviewStore(order)) {
    return null;
  }

  const storeName =
    order?.store?.name ?? order?.store?.store_name ?? order?.vendor?.name ?? order?.seller?.name;

  return (
    <GlassCard accent={ACCENT.store} contentStyle={styles.storeCard} style={{ marginBottom: 8 }}>
      <View style={styles.storeHeader}>
        <View style={[styles.detailIcon, { backgroundColor: '#FFFBEB' }]}>
          <Ionicons name="star" size={26} color="#B45309" />
        </View>
        <View style={styles.storeHeaderCopy}>
          <Text style={styles.sectionTitle}>{t('rate_store', 'Rate Store')}</Text>
          <Text
            numberOfLines={2}
            style={[styles.addressText, { textAlign: isAr ? 'right' : 'left', marginTop: 2 }]}
          >
            {storeName
              ? t('rate_store_after_complete_hint', 'How was your experience with {{store}}?', {
                  store: storeName,
                })
              : t('rate_completed_order', 'This order is complete. You can rate the store now.')}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onReview}
        style={({ pressed }) => [
          styles.rateStoreButton,
          { flexDirection: isAr ? 'row-reverse' : 'row' },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="star" size={18} color="#B45309" />
        <Text style={styles.rateStoreButtonText}>{t('rate_store', 'Rate Store')}</Text>
      </Pressable>
    </GlassCard>
  );
}

function CancelOrderCard({
  order,
  submitting,
  onCancel,
}: {
  order: any;
  submitting?: boolean;
  onCancel: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const status = normalizeStatus(order?.status || order?.order_status);
  const pending = isTruthyFlag(order?.has_pending_cancel_request);
  const requestStatus = normalizeStatus(order?.cancel_request?.status);
  const rejected = requestStatus === 'store_rejected';

  if (pending) {
    return (
      <GlassCard accent="#F59E0B" contentStyle={styles.storeCard} style={{ marginBottom: 8 }}>
        <Text style={styles.sectionTitle}>
          {t('cancel_request_pending_title', 'Cancel request pending')}
        </Text>
        <Text style={[styles.addressText, { textAlign: isAr ? 'right' : 'left', marginTop: 4 }]}>
          {t(
            'cancel_request_pending_hint',
            'The store is reviewing your cancel request. The order continues until they approve.',
          )}
        </Text>
      </GlassCard>
    );
  }

  if (isDeliveredStatus(status) || (!canCancelOrder(order, status) && !rejected)) {
    return null;
  }

  return (
    <GlassCard accent="#DC2626" contentStyle={styles.storeCard} style={{ marginBottom: 8 }}>
      <Text style={styles.sectionTitle}>{t('cancel_order', 'Cancel Order')}</Text>
      <Text style={[styles.addressText, { textAlign: isAr ? 'right' : 'left', marginTop: 4 }]}>
        {rejected
          ? t(
              'cancel_request_rejected_hint',
              'The store declined your last cancel request. You can send another request.',
            )
          : `${t(
              'cancel_order_hint',
              'If the store has not accepted yet, this cancels and refunds immediately.',
            )} ${t(
              'cancel_after_accept_hint',
              'Cancellation after the store accepts an order requires store approval.',
            )}`}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={submitting}
        onPress={onCancel}
        style={({ pressed }) => [
          styles.rateStoreButton,
          {
            backgroundColor: '#FEF2F2',
            borderColor: '#FECACA',
            flexDirection: isAr ? 'row-reverse' : 'row',
            opacity: submitting ? 0.6 : 1,
          },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="close-circle" size={18} color="#B91C1C" />
        <Text style={[styles.rateStoreButtonText, { color: '#B91C1C' }]}>
          {submitting ? t('submitting', 'Submitting...') : t('cancel_order', 'Cancel Order')}
        </Text>
      </Pressable>
    </GlassCard>
  );
}

function CancelReasonSheet({
  visible,
  submitting,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language?.startsWith('ar');
  const [reason, setReason] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible) {
      setReason('');
      setKeyboardHeight(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.35)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            paddingBottom: Math.max(insets.bottom, 16) + keyboardHeight,
          }}
        >
          <Text style={[styles.sectionTitle, { textAlign: isAr ? 'right' : 'left' }]}>
            {t('cancel_order', 'Cancel Order')}
          </Text>
          <Text style={[styles.addressText, { textAlign: isAr ? 'right' : 'left', marginTop: 8 }]}>
            {t(
              'cancel_after_accept_hint',
              'Cancellation after the store accepts an order requires store approval.',
            )}
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={t('cancel_reason_placeholder', 'Why do you want to cancel?')}
            placeholderTextColor="#94A3B8"
            multiline
            autoFocus
            textAlign={isAr ? 'right' : 'left'}
            style={{
              marginTop: 12,
              minHeight: 90,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderRadius: 12,
              padding: 12,
              color: '#0F172A',
              textAlignVertical: 'top',
            }}
          />
          <Pressable
            disabled={submitting}
            onPress={() => {
              Keyboard.dismiss();
              onSubmit(reason.trim());
            }}
            style={{
              marginTop: 14,
              minHeight: 48,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#DC2626',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
              {submitting
                ? t('submitting', 'Submitting...')
                : t('confirm_cancel_order', 'Confirm Cancel')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SubmitReviewSheet({
  visible,
  onClose,
  type,
  submitting,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  type: 'store' | 'driver' | 'product';
  submitting?: boolean;
  onSubmit: (rating: number, review: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  useEffect(() => {
    if (!visible) {
      setRating(0);
      setReview('');
    }
  }, [visible]);

  if (!visible) return null;

  function handleSubmit() {
    if (submitting) return;
    if (rating < 1) {
      Alert.alert(t('error', 'Error'), t('rating_required', 'Please select a rating.'));
      return;
    }
    Keyboard.dismiss();
    onSubmit(rating, review);
  }

  function handleClose() {
    if (submitting) return;
    Keyboard.dismiss();
    setRating(0);
    setReview('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} accessible={false} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <Pressable onPress={Keyboard.dismiss} accessible={false}>
            <View
              style={{
                backgroundColor: 'white',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                minHeight: 350,
                maxHeight: '90%',
              }}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                automaticallyAdjustKeyboardInsets
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View
                  style={{
                    width: 40,
                    height: 6,
                    backgroundColor: '#E0E0E0',
                    borderRadius: 3,
                    alignSelf: 'center',
                    marginBottom: 20,
                  }}
                />
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: COLORS.ink,
                    marginBottom: 16,
                  }}
                >
                  {type === 'store'
                    ? t('rate_store', 'Give Store Rating')
                    : type === 'driver'
                      ? t('rate_driver', 'Give Driver Rating')
                      : t('rate_product', 'Rate Product')}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 12,
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Pressable key={i} onPress={() => setRating(i)} disabled={submitting}>
                      <Ionicons
                        name={i <= rating ? 'star' : 'star-outline'}
                        size={36}
                        color={i <= rating ? '#FFB400' : '#D1D5DB'}
                      />
                    </Pressable>
                  ))}
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: COLORS.muted,
                    marginBottom: 6,
                  }}
                >
                  {t('write_review', 'Write Review...')}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: '#FAFAFA',
                    borderRadius: 12,
                    padding: 12,
                    height: 100,
                    textAlignVertical: 'top',
                    borderColor: '#F3F4F6',
                    borderWidth: 1,
                    fontFamily:
                      i18n.language === 'ar' ? 'PlaypenSansArabic_500Medium' : 'Inter_500Medium',
                  }}
                  placeholder={t('type_review_placeholder', 'Please type your review.')}
                  value={review}
                  onChangeText={setReview}
                  multiline
                  editable={!submitting}
                />
                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={{
                    backgroundColor: COLORS.primary,
                    height: 50,
                    borderRadius: 14,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 20,
                    opacity: submitting ? 0.7 : 1,
                    shadowColor: '#94A3B8',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                    {submitting
                      ? t('submitting', 'Submitting...')
                      : t('submit_review', 'Submit Review')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleClose}
                  style={{ marginTop: 16, alignItems: 'center', marginBottom: 8 }}
                >
                  <Text style={{ color: COLORS.muted }}>{t('cancel', 'Cancel')}</Text>
                </Pressable>
              </ScrollView>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function OrderDetailsView({
  order,
  totals,
  items,
  refreshing,
  onRefresh,
  onBack,
  onSupport,
  onComplaint,
  onReturn,
  onExchange,
}: Props) {
  const insets = useSafeAreaInsets();
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('none');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewType, setReviewType] = useState<'store' | 'driver' | 'product'>('store');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [cancelSheetVisible, setCancelSheetVisible] = useState(false);
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const { t } = useTranslation();

  const selectionAction = useMemo(
    () => ({
      complaint: onComplaint,
      return: onReturn,
      exchange: onExchange,
    }),
    [onComplaint, onReturn, onExchange],
  );

  const router = useRouter();

  const status = normalizeStatus(order?.status || order?.order_status);
  const isDeliveredOrPickedUp = isDeliveredStatus(status);
  const showRateStore = canReviewStore(order, status);
  const showCancelCard =
    !isDeliveredOrPickedUp &&
    (canCancelOrder(order, status) ||
      isTruthyFlag(order?.has_pending_cancel_request) ||
      normalizeStatus(order?.cancel_request?.status) === 'store_rejected');

  async function submitCancelOrder(reason: string) {
    const orderId = order?.id ?? order?.order_id;
    if (!orderId) {
      return;
    }

    try {
      setSubmittingCancel(true);
      const response = await OrderService.cancel(String(orderId), reason);
      setCancelSheetVisible(false);
      Alert.alert(
        t('success', 'Success'),
        response?.data?.message ||
          (response?.data?.cancelled
            ? t('order_cancelled_and_refunded', 'Order cancelled. Your payment will be refunded.')
            : t(
                'cancel_request_submitted_waiting_for_store_approval',
                'Cancel request submitted. Waiting for store approval.',
              )),
      );
      onRefresh?.();
    } catch (error: any) {
      Alert.alert(
        t('error', 'Error'),
        error?.response?.data?.message || t('cancel_order_failed', 'Failed to cancel this order.'),
      );
    } finally {
      setSubmittingCancel(false);
    }
  }

  async function submitStoreReview(rating: number, reviewText: string) {
    const vendorId =
      order?.vendor_id ??
      order?.vendor?.id ??
      order?.store?.vendor_id ??
      order?.store?.vendor?.id ??
      order?.seller?.id;

    if (!vendorId) {
      Alert.alert(t('error', 'Error'), t('review_failed', 'Failed to submit review.'));
      return;
    }

    if (!canReviewStore(order, status)) {
      Alert.alert(
        t('error', 'Error'),
        t('rate_store_after_complete', 'You can rate the store only after the order is completed.'),
      );
      return;
    }

    if (hasReviewedStore(order)) {
      Alert.alert(t('error', 'Error'), t('already_rated_store', 'You rated this store'));
      return;
    }

    try {
      setSubmittingReview(true);
      await apiClient.post(`/vendors/${vendorId}/reviews`, {
        rating,
        review_text: reviewText,
        order_id: order?.id ?? order?.order_id,
      });
      Alert.alert(t('success', 'Success'), t('review_submitted', 'Review submitted successfully!'));
      setReviewModalVisible(false);
      onRefresh?.();
    } catch (error: any) {
      Alert.alert(
        t('error', 'Error'),
        error?.response?.data?.message || t('review_failed', 'Failed to submit review.'),
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  function handleReviewSubmit(rating: number, reviewText: string) {
    if (reviewType === 'store') {
      void submitStoreReview(rating, reviewText);
      return;
    }
    setReviewModalVisible(false);
  }

  function selectMode(mode: Exclude<SelectionMode, 'none'>) {
    if (
      mode === 'complaint' &&
      (order?.complaint_exist === true ||
        order?.complaint_exist === 1 ||
        order?.complaint_exist === '1')
    ) {
      router.push({
        pathname: '/profile/ComplaintDetailsScreen',
        params: { orderId: String(order?.id || '') },
      });
      return;
    }

    if (items.length === 1) {
      selectionAction[mode]([items[0].id]);
      return;
    }
    setSelectionMode(mode);
    setSelectedIds([]);
  }

  function cancelSelection() {
    setSelectionMode('none');
    setSelectedIds([]);
  }

  function toggleItem(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    );
  }

  function continueSelection() {
    if (selectionMode === 'none' || selectedIds.length === 0) return;
    selectionAction[selectionMode](selectedIds);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: selectionMode === 'none' ? insets.bottom + 30 : insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Header
          onBack={onBack}
          order={order}
          onTrack={order?.driver ? () => console.log('Track') : undefined}
        />
        <StatusHero
          onRefresh={onRefresh}
          onTrack={order?.driver ? () => console.log('Track') : undefined}
          order={order}
          refreshing={refreshing}
        />
        <ProgressCard order={order} />

        <DeliveryOptionCard order={order} />
        <DriverInfoCard
          order={order}
          onReview={() => {
            setReviewType('driver');
            setReviewModalVisible(true);
          }}
        />
        <OTPCard order={order} />
        <StoreDetailsCard order={order} />
        {showRateStore ? (
          <RateStoreCard
            order={order}
            onReview={() => {
              setReviewType('store');
              setReviewModalVisible(true);
            }}
          />
        ) : null}

        <ItemsCard
          items={items}
          onToggle={toggleItem}
          selectedIds={selectedIds}
          selectionMode={selectionMode}
        />
        {!!order?.customer_address && (
          <AddressCard address={order.customer_address} order={order} />
        )}
        <BillCard order={order} totals={totals} />
        {selectionMode === 'none' && showCancelCard ? (
          <CancelOrderCard
            order={order}
            submitting={submittingCancel}
            onCancel={() => setCancelSheetVisible(true)}
          />
        ) : null}
        {selectionMode === 'none' && isDeliveredOrPickedUp && (
          <ActionButtons order={order} onSelectMode={selectMode} />
        )}
        {selectionMode === 'none' && <SupportCard onSupport={onSupport} />}
      </ScrollView>

      {selectionMode !== 'none' && (
        <View
          style={{
            bottom: insets.bottom + 12,
            left: 18,
            position: 'absolute',
            right: 18,
          }}
        >
          <SelectionBar
            count={selectedIds.length}
            mode={selectionMode}
            onCancel={cancelSelection}
            onContinue={continueSelection}
          />
        </View>
      )}

      <CancelReasonSheet
        visible={cancelSheetVisible}
        submitting={submittingCancel}
        onClose={() => {
          if (!submittingCancel) {
            setCancelSheetVisible(false);
          }
        }}
        onSubmit={(reason) => void submitCancelOrder(reason)}
      />
      <SubmitReviewSheet
        visible={reviewModalVisible}
        type={reviewType}
        submitting={submittingReview}
        onClose={() => setReviewModalVisible(false)}
        onSubmit={handleReviewSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1, overflow: 'hidden' },
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
    lineHeight: 24,
  },
  timelineSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
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
  vDotOuter: {
    alignItems: 'center',
    borderRadius: 21,
    borderWidth: 2,
    height: 42,
    justifyContent: 'center',
    width: 42,
    zIndex: 2,
  },
  vDot: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  vDotComplete: { backgroundColor: '#16A34A' },
  vDotActive: { backgroundColor: '#2563EB' },
  vDotDanger: { backgroundColor: '#E11D48' },
  vLine: {
    flex: 1,
    marginVertical: 4,
    minHeight: 12,
    width: 3,
    borderRadius: 2,
  },
  vLineActive: { backgroundColor: '#86EFAC' },
  vLineDanger: { backgroundColor: '#FECDD3' },
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
    lineHeight: 20,
  },
  vLabelActive: { color: '#1D4ED8' },
  vLabelDanger: { color: '#BE123C' },
  vLabelDone: { color: '#334155' },
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

  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: '#F0F1F6',
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    shadowColor: '#28304A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    width: 44,
    elevation: 3,
  },
  headerTitleWrap: { alignItems: 'center', flex: 1, paddingHorizontal: 8 },
  headerTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    textAlign: 'center',
  },
  invoiceRow: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  invoiceText: {
    color: '#8992A8',
    flexGrow: 0,
    flexShrink: 0,
    fontSize: 13,
    fontWeight: '700',
  },
  invoiceCopyIcon: {
    flexShrink: 0,
    marginStart: 6,
  },
  hero: {
    borderRadius: 25,
    marginHorizontal: 16,
    marginTop: 4,
    overflow: 'hidden',
  },
  heroDanger: {},
  heroInner: { padding: 18 },
  heroGradient: { minHeight: 318, padding: 20 },
  heroOrb: {
    backgroundColor: 'rgba(119, 67, 230, 0.06)',
    borderRadius: 110,
    height: 220,
    position: 'absolute',
    top: 45,
    width: 220,
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  statusPillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 2,
    height: 40,
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 9,
    width: 40,
  },
  heroBody: { minHeight: 196, position: 'relative', width: '100%' },
  heroCopy: {
    paddingTop: 20,
    position: 'absolute',
    top: 0,
    width: '52%',
    zIndex: 3,
  },
  heroHeading: {
    color: COLORS.ink,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 34,
    textAlign: 'left',
    width: '100%',
  },
  arrivingLabel: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 14,
    textAlign: 'left',
    width: '100%',
  },
  arrivingTime: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 5,
    textAlign: 'left',
    width: '100%',
  },
  scooter: {
    bottom: -4,
    height: 165,
    position: 'absolute',
    width: '72%',
    zIndex: 1,
  },

  trackingBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    elevation: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -4,
    minHeight: 50,
    paddingHorizontal: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  trackingLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 8,
  },
  trackingLabelText: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  trackingButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    paddingVertical: 10,
  },
  trackingButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 22,
  },
  progressCard: { paddingHorizontal: 16, paddingVertical: 16 },
  progressTrack: { flexDirection: 'row' },
  step: { alignItems: 'center', flex: 1, position: 'relative' },
  connector: { height: 2, position: 'absolute', top: 19, width: '50%' },
  connectorBefore: { left: 0 },
  connectorAfter: { right: 0 },
  connectorActive: { backgroundColor: '#2563EB' },
  connectorDanger: { backgroundColor: '#E11D48' },
  connectorPending: { backgroundColor: COLORS.line },
  stepCircle: {
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 3,
    height: 40,
    justifyContent: 'center',
    width: 40,
    zIndex: 2,
  },
  stepCircleComplete: { backgroundColor: '#16A34A' },
  stepCircleActive: { backgroundColor: '#2563EB' },
  stepCircleDanger: { backgroundColor: '#E11D48' },
  stepLabel: {
    color: COLORS.ink,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 8,
    minHeight: 36,
    textAlign: 'center',
  },
  stepLabelActive: { color: '#2563EB' },
  stepLabelDanger: { color: '#E11D48' },
  stepTime: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  viewAll: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  viewAllText: { color: '#DB2777', fontSize: 11, fontWeight: '700' },
  selectedLabel: { color: '#2563EB', fontSize: 11, fontWeight: '700' },
  itemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 18,
  },
  itemDivider: { borderTopColor: '#F0F1F6', borderTopWidth: 1 },
  checkbox: {
    alignItems: 'center',
    borderColor: '#C7CDDA',
    borderRadius: 7,
    borderWidth: 2,
    height: 25,
    justifyContent: 'center',
    marginRight: 10,
    width: 25,
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  productImageWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.pale,
    borderRadius: 18,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 72,
  },
  productImage: { height: '100%', width: '100%' },
  itemCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    paddingHorizontal: 14,
  },
  itemTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '600' },
  itemOption: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  extraRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  },
  extraDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: ACCENT.bill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraDotInner: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: ACCENT.bill,
  },
  extraLabel: { flex: 1, marginTop: 0, minWidth: 0, fontWeight: '500' },
  extraPrice: { color: '#64748B', fontSize: 11, fontWeight: '600' },
  itemQuantity: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  priceWrap: { alignItems: 'flex-end', flexShrink: 0, minWidth: 70 },
  itemPrice: { color: '#0F172A', fontSize: 17, fontWeight: '800' },
  currency: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  storeCard: {
    padding: 16,
  },
  storeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  storeHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  storeName: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  storePills: {
    gap: 18,
    marginTop: 20,
  },
  storePill: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  storePillIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  storePillCopy: {
    flex: 1,
    minWidth: 0,
  },
  storePillLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  storePillValue: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 3,
  },

  detailCard: { alignItems: 'center', flexDirection: 'row', gap: 12, padding: 16 },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#EEF2F7',
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  detailCopy: { flex: 1, paddingHorizontal: 14 },
  addressText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 19,
    marginTop: 5,
  },
  otpCodeRow: {
    direction: 'ltr',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  otpCodeBox: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderRadius: 10,
    borderWidth: 1.5,
    height: 44,
    justifyContent: 'center',
    width: 40,
  },
  otpCodeDigit: {
    color: '#B45309',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 22,
    fontWeight: '800',
    includeFontPadding: false,
    lineHeight: 28,
    textAlign: 'center',
  },
  mapLink: { alignItems: 'center', flexDirection: 'row', gap: 3, marginTop: 8 },
  mapLinkText: { color: '#16A34A', fontSize: 12, fontWeight: '700' },
  rateStoreButton: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  rateStoreButtonText: {
    color: '#B45309',
    fontSize: 14,
    fontWeight: '800',
  },
  mapPreview: {
    alignItems: 'center',
    backgroundColor: '#F7F7FA',
    borderRadius: 18,
    height: 88,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 92,
  },
  mapRoad: {
    backgroundColor: '#E3E5EB',
    height: 3,
    left: 0,
    position: 'absolute',
    width: 110,
  },
  mapRoadVertical: {
    backgroundColor: '#E3E5EB',
    height: 110,
    position: 'absolute',
    top: -10,
    width: 3,
  },
  billCard: { padding: 16 },
  billTop: { alignItems: 'flex-start', flexDirection: 'row' },
  billContent: { flex: 1, paddingLeft: 14 },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  billLabel: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    paddingRight: 8,
  },
  billValue: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  billFreePill: {
    backgroundColor: '#D1FAE5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  billFreeText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  billDivider: {
    borderTopColor: COLORS.line,
    borderTopWidth: 1,
    marginTop: 16,
  },
  totalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
  },
  totalLabel: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  totalValue: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  paymentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  paymentLabel: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  paymentPill: {
    alignItems: 'center',
    backgroundColor: '#F5FAFF',
    borderColor: '#E8E9EF',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    maxWidth: 145,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  paymentText: {
    color: COLORS.ink,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.line,
    borderWidth: 1,
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  actionLabel: {
    color: COLORS.ink,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
  },
  selectionBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    flexDirection: 'row',
    minHeight: 72,
    padding: 10,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#F0F1F5',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  selectionCount: {
    color: COLORS.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 10,
  },
  continueButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 40,
    maxWidth: 190,
    paddingHorizontal: 14,
  },
  disabledButton: { backgroundColor: '#C8CCD5' },
  continueText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
