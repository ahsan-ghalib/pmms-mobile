import { Platform, TurboModuleRegistry } from 'react-native';
import type { CheckoutCallbacks } from 'checkout-react-native';

export type TapPaymentMethod = 'tap-payment' | 'apple-pay';

export interface TapCheckoutSession {
  invoice_id: string;
  amount: string | number;
  currency: string;
  hash_string: string;
  public_key: string;
  merchant_id: string;
  post_url?: string;
  redirect_url?: string;
}

interface TapCheckoutCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: {
    countryCode: string;
    number: string;
  };
}

const toAmount = (value: string | number) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Tap Checkout received an invalid order amount.');
  }

  return amount.toFixed(2);
};

export const assertTapCheckoutAvailable = () => {
  if (Platform.OS === 'web') {
    throw new Error('Tap Checkout is available only in the iOS and Android apps.');
  }

  if (!TurboModuleRegistry.get('CheckoutReactNative')) {
    throw new Error(
      'Tap Checkout is not included in this app binary. Rebuild the native app; it is not available in Expo Go.',
    );
  }
};

export const openTapCheckout = ({
  session,
  customer,
  language,
  paymentMethod,
  callbacks,
}: {
  session: TapCheckoutSession;
  customer: TapCheckoutCustomer;
  language: 'en' | 'ar';
  paymentMethod: TapPaymentMethod;
  callbacks: CheckoutCallbacks;
}) => {
  assertTapCheckoutAvailable();

  // Load the SDK only after confirming the native module exists. Importing it at
  // module scope makes Expo Router crash on web, Expo Go, and stale dev builds.
  const { startCheckout } =
    require('checkout-react-native') as typeof import('checkout-react-native');
  const amount = toAmount(session.amount);
  const isApplePay = paymentMethod === 'apple-pay';
  const reference = session.invoice_id;

  startCheckout(
    {
      hashString: session.hash_string,
      language,
      themeMode: 'light',
      supportedPaymentMethods: isApplePay ? ['APPLE_PAY'] : ['VISA', 'MASTERCARD', 'MADA'],
      paymentType: isApplePay ? 'DEVICE' : 'CARD',
      selectedCurrency: session.currency,
      supportedCurrencies: [session.currency],
      supportedPaymentTypes: [],
      supportedRegions: [],
      supportedSchemes: [],
      supportedCountries: ['SA'],
      gateway: {
        publicKey: session.public_key,
        merchantId: session.merchant_id,
      },
      customer,
      transaction: {
        mode: 'charge',
        charge: {
          metadata: { source: 'soouqlive_mobile' },
          reference: {
            transaction: reference,
            order: reference,
            idempotent: reference,
          },
          saveCard: false,
          redirect: { url: session.redirect_url || '' },
          post: session.post_url || '',
          threeDSecure: true,
        },
      },
      amount,
      order: {
        // Tap order IDs are gateway-generated (`ord_...`). Our local invoice
        // remains in transaction references, while a new SDK charge uses no ID.
        id: '',
        currency: session.currency,
        amount,
        // The backend amount includes products, VAT, delivery, discounts, and
        // fees. Use that authoritative total as one line so Tap's order item
        // sum always equals the signed checkout amount.
        items: [
          {
            name: `Order ${reference}`,
            description: 'SoouqLive order total',
            amount,
            currency: session.currency,
            quantity: 1,
          },
        ],
      },
      cardOptions: {
        showBrands: true,
        showLoadingState: true,
        collectHolderName: true,
        preLoadCardName: `${customer.firstName} ${customer.lastName}`.trim(),
        cardNameEditable: true,
        cardFundingSource: 'all',
        saveCardOption: 'none',
        forceLtr: false,
        alternativeCardInputs: { cardScanner: true, cardNFC: true },
      },
      isApplePayAvailableOnClient: Platform.OS === 'ios',
    },
    callbacks,
  );
};

export const parseTapChargeId = (data: string): string => {
  const result = data ? JSON.parse(data) : {};
  const chargeId = result.chargeId || result.charge_id || result.id;

  if (typeof chargeId !== 'string' || !chargeId.startsWith('chg_')) {
    throw new Error('Tap Checkout did not return a valid charge ID.');
  }

  return chargeId;
};
