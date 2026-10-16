type Translate = (key: string, defaultValue?: string) => string;

const STATUS_FALLBACK: Record<string, string> = {
  requested: 'Requested',
  waiting_approval: 'Waiting Approval',
  store_approved: 'Store Approved',
  store_rejected: 'Store Rejected',
  partially_approved: 'Partially Approved',
  partially_rejected: 'Partially Rejected',
  waiting_return_fee: 'Waiting for Return Fee',
  return_fee_paid: 'Return Fee Paid',
  reverse_shipping_started: 'Reverse Shipping Started',
  picked_from_customer: 'Picked from Customer',
  return_in_transit: 'Return in Transit',
  delivered_to_store: 'Delivered to Store',
  item_received_confirming: 'Item Received',
  refund_completed: 'Refund Completed',
  exchange_replacement_preparing: 'Replacement Preparing',
  exchange_sent_to_logistics: 'Replacement Dispatched',
  exchange_picked_from_store: 'Replacement Picked Up',
  exchange_in_transit: 'Replacement in Transit',
  exchange_completed: 'Exchange Completed',
  grace_period_expired: 'Request Expired',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
};

export function translateOrderRequestStatus(t: Translate, status?: string | null): string {
  const value = String(status || '')
    .trim()
    .toLowerCase();
  if (!value) {
    return '';
  }
  const fallback = STATUS_FALLBACK[value] || value.replace(/_/g, ' ');
  return t(`status_${value}`, fallback);
}
