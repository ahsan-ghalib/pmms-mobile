import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';
import { useAuth } from './AuthContext';
import { playNotificationSound } from '../utils/playToastSound';

export interface CartModifierItem {
  item_id: number;
  quantity: number;
}

export interface CartModifierGroup {
  group_id: number;
  items: CartModifierItem[];
}

export interface CartItem {
  id?: string; // local unique identifier
  store_id: number;
  product_id: number;
  variant_id?: number | null;
  quantity: number;
  selected_modifiers?: CartModifierGroup[];
}

export interface CartDetails {
  cart_items: any[];
  cart_total: number;
  total_discount_amount: number;
  platform_discount?: number;
  platform_discount_campaign?: {
    id?: number;
    name?: string;
    discount_type?: string;
    discount_value?: number;
    discount_percent?: number;
  } | null;
  cart_count: number;
  delivery_charge: number;
  is_free_delivery: boolean;
  applied_shipping_rule: any;
  tax: number;
  tax_percentage: number;
  grand_total: number;
  currency_code: string;
  has_cashier: boolean;
  is_productive_family_store: boolean;
}

interface CartContextData {
  cartItems: CartItem[];
  cartDetails: CartDetails | null;
  isLoading: boolean;
  isSyncing: boolean;
  addToCart: (item: CartItem) => Promise<void>;
  updateQuantity: (
    product_id: number,
    variant_id: number | null | undefined,
    delta: number,
    local_id?: string,
  ) => Promise<void>;
  removeFromCart: (
    product_id: number,
    variant_id: number | null | undefined,
    local_id?: string,
  ) => Promise<void>;
  clearCart: () => Promise<void>;
  syncCartWithBackend: () => Promise<void>;
}

const CART_STORAGE_KEY = '@soouqlive_cart';

const CartContext = createContext<CartContextData>({} as CartContextData);

function sameCartLine(
  a: CartItem,
  b: Pick<CartItem, 'product_id' | 'variant_id' | 'selected_modifiers'>,
) {
  return (
    Number(a.product_id) === Number(b.product_id) &&
    Number(a.variant_id || 0) === Number(b.variant_id || 0) &&
    JSON.stringify(a.selected_modifiers || []) === JSON.stringify(b.selected_modifiers || [])
  );
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartDetails, setCartDetails] = useState<CartDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const cartItemsRef = useRef(cartItems);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    setIsLoading(true);
    try {
      const storedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (storedCart) {
        setCartItems(JSON.parse(storedCart));
      }
    } catch (error) {
      console.error('Failed to load cart from storage', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCart = async (items: CartItem[]) => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save cart to storage', error);
    }
  };

  const syncCartWithBackend = useCallback(async () => {
    if (!isAuthenticated || isLoading) return;

    setIsSyncing(true);
    try {
      const currentItems = cartItemsRef.current;
      const payload = currentItems.map((item) => ({
        vendor_id: item.store_id,
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        quantity: item.quantity,
        selected_modifiers: item.selected_modifiers || [],
      }));

      const response = await axiosInstance.post('/order-management/cart/sync', payload);
      const syncedCartDetails = response.data;

      if (syncedCartDetails?.cart_items && Array.isArray(syncedCartDetails.cart_items)) {
        // Map backend rows back onto local lines 1:1 when lengths match.
        if (currentItems.length === syncedCartDetails.cart_items.length) {
          syncedCartDetails.cart_items = syncedCartDetails.cart_items.map(
            (ci: any, index: number) => ({
              ...ci,
              local_id: currentItems[index]?.id,
            }),
          );
        } else {
          // Fallback: attach first unused matching local_id by product.
          const remaining = [...currentItems];
          syncedCartDetails.cart_items = syncedCartDetails.cart_items.map((ci: any) => {
            const matchIndex = remaining.findIndex(
              (local) =>
                Number(local.product_id) === Number(ci.product_id) &&
                (!local.variant_id ||
                  Number(local.variant_id) === Number(ci.variant_id || ci.product_variant_id || 0)),
            );
            const local = matchIndex >= 0 ? remaining.splice(matchIndex, 1)[0] : null;
            return { ...ci, local_id: local?.id };
          });
        }
      }

      setCartDetails(syncedCartDetails);
    } catch (error: any) {
      console.error('Failed to sync cart with backend', error.response?.data || error);
      // 401 is handled by the axios interceptor (clears session + emits auth event).
      // Leave cartDetails null so CartScreen can finish hydrating / redirect.
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, isLoading]);

  const scheduleSync = useCallback(() => {
    if (!isAuthenticated) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncCartWithBackend();
    }, 250);
  }, [isAuthenticated, syncCartWithBackend]);

  const addToCart = async (newItem: CartItem) => {
    let blockedDifferentStore = false;
    let nextCart: CartItem[] = [];

    setCartItems((prev) => {
      if (prev.length > 0 && Number(prev[0].store_id) !== Number(newItem.store_id)) {
        blockedDifferentStore = true;
        nextCart = prev;
        return prev;
      }

      const existingItemIndex = prev.findIndex((item) => sameCartLine(item, newItem));
      if (existingItemIndex >= 0) {
        nextCart = prev.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item,
        );
      } else {
        nextCart = [...prev, { ...newItem, id: Math.random().toString(36).substring(7) }];
      }
      return nextCart;
    });

    if (blockedDifferentStore) {
      Alert.alert(
        t('different_store_title', 'Different Store'),
        t(
          'different_store_msg',
          'You can only order from one store at a time. Would you like to clear your current cart and start a new order?',
        ),
        [
          { text: t('cancel', 'Cancel'), style: 'cancel' },
          {
            text: t('clear_cart_title', 'Clear Cart'),
            style: 'destructive',
            onPress: async () => {
              const replaced = [{ ...newItem, id: Math.random().toString(36).substring(7) }];
              setCartItems(replaced);
              setCartDetails(null);
              await saveCart(replaced);
              scheduleSync();
              playNotificationSound('add-to-cart');
            },
          },
        ],
      );
      return;
    }

    await saveCart(nextCart);
    scheduleSync();
    playNotificationSound('add-to-cart');
  };

  const updateQuantity = async (
    product_id: number,
    variant_id: number | null | undefined,
    delta: number,
    local_id?: string,
  ) => {
    if (delta > 0) {
      playNotificationSound('add-to-cart');
    }

    setCartItems((prev) => {
      const updatedCart = prev.map((item) => {
        if (local_id && item.id === local_id) {
          return { ...item, quantity: Math.max(1, item.quantity + delta) };
        }
        if (
          !local_id &&
          Number(item.product_id) === Number(product_id) &&
          Number(item.variant_id || 0) === Number(variant_id || 0)
        ) {
          return { ...item, quantity: Math.max(1, item.quantity + delta) };
        }
        return item;
      });
      saveCart(updatedCart);
      return updatedCart;
    });

    setCartDetails((prev) => {
      if (!prev) return prev;
      const newCartDetailsItems = prev.cart_items.map((ci: any) => {
        const matchesLocal = local_id && ci.local_id === local_id;
        const matchesProduct =
          !local_id &&
          Number(ci.product_id) === Number(product_id) &&
          Number(ci.variant_id || ci.product_variant_id || 0) === Number(variant_id || 0);
        if (matchesLocal || matchesProduct) {
          const oldQty = Number(ci.quantity || 1) || 1;
          const newQty = Math.max(1, ci.quantity + delta);
          const ratio = newQty / oldQty;
          const lineEx = Number(ci.line_total ?? 0) * ratio;
          const lineTax = Number(ci.tax_amount ?? 0) * ratio;
          const lineWithTax = Number.isFinite(Number(ci.line_total_with_tax))
            ? Number(ci.line_total_with_tax) * ratio
            : lineEx + lineTax;
          return {
            ...ci,
            quantity: newQty,
            line_total: Number(lineEx.toFixed(2)),
            tax_amount: Number(lineTax.toFixed(2)),
            line_total_with_tax: Number(lineWithTax.toFixed(2)),
          };
        }
        return ci;
      });

      const newCartTotal = newCartDetailsItems.reduce(
        (acc: number, curr: any) => acc + (curr.line_total_with_tax || 0),
        0,
      );

      return {
        ...prev,
        cart_items: newCartDetailsItems,
        cart_total: newCartTotal,
        grand_total: newCartTotal + (prev.delivery_charge || 0),
        cart_count: newCartDetailsItems.reduce(
          (acc: number, curr: any) => acc + (curr.quantity || 0),
          0,
        ),
      };
    });

    scheduleSync();
  };

  const removeFromCart = async (
    product_id: number,
    variant_id: number | null | undefined,
    local_id?: string,
  ) => {
    setCartItems((prev) => {
      const updatedCart = prev.filter((item) => {
        if (local_id) return item.id !== local_id;
        return !(
          Number(item.product_id) === Number(product_id) &&
          Number(item.variant_id || 0) === Number(variant_id || 0)
        );
      });
      saveCart(updatedCart);
      return updatedCart;
    });

    setCartDetails((prev) => {
      if (!prev) return prev;
      const newCartDetailsItems = prev.cart_items.filter((ci: any) => {
        if (local_id) return ci.local_id !== local_id;
        return !(
          Number(ci.product_id) === Number(product_id) &&
          Number(ci.variant_id || ci.product_variant_id || 0) === Number(variant_id || 0)
        );
      });

      if (newCartDetailsItems.length === 0) {
        return null;
      }

      const newCartTotal = newCartDetailsItems.reduce(
        (acc: number, curr: any) => acc + (curr.line_total_with_tax || 0),
        0,
      );

      return {
        ...prev,
        cart_items: newCartDetailsItems,
        cart_total: newCartTotal,
        grand_total: newCartTotal + (prev.delivery_charge || 0),
        cart_count: newCartDetailsItems.reduce(
          (acc: number, curr: any) => acc + (curr.quantity || 0),
          0,
        ),
      };
    });

    scheduleSync();
  };

  const clearCart = async () => {
    setCartItems([]);
    setCartDetails(null);
    await saveCart([]);
    scheduleSync();
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      syncCartWithBackend();
    }
  }, [isAuthenticated, isLoading, syncCartWithBackend]);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartDetails,
        isLoading,
        isSyncing,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        syncCartWithBackend,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
