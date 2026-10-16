import apiClient from '../apiClient';
import { ENDPOINTS } from '../endpoints';

export interface WalletTransaction {
  id: number;
  transaction_id: string;
  amount: string;
  type: 'credited' | 'debited';
  remarks: string;
  created_at: string;
}

export interface WalletResponse {
  balance: string;
  transactions: {
    data: WalletTransaction[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface WalletRechargeSession {
  invoice_id: string;
  amount: string | number;
  currency: string;
  hash_string: string;
  public_key: string;
  merchant_id: string;
  post_url?: string;
  redirect_url?: string;
}

export const WalletService = {
  getMyWallet(params?: { from_date?: string; to_date?: string; page?: number; per_page?: number }) {
    return apiClient.get<WalletResponse>(ENDPOINTS.WALLET.MY_WALLET, params);
  },

  prepareRecharge(amount: number) {
    return apiClient.post<{ success: boolean; data: WalletRechargeSession }>(
      ENDPOINTS.WALLET.RECHARGE_PREPARE,
      { amount },
    );
  },

  confirmRecharge(invoice_id: string, charge_id: string, payment_type: string) {
    return apiClient.post<{ success: boolean; message: string; new_balance: string }>(
      ENDPOINTS.WALLET.RECHARGE_CONFIRM,
      { invoice_id, charge_id, payment_type },
    );
  },
};
