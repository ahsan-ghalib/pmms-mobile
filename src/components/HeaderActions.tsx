import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { NotificationService } from '../api/services/notification.service';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { IconButton } from './IconButton';
import { LanguageModal } from './LanguageModal';

export function HeaderActions() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const { cartItems } = useCart();
  const cartCount = cartItems.reduce((acc: number, item: any) => acc + item.quantity, 0);

  const unreadQuery = useQuery({
    queryKey: ['notifications-unread'],
    enabled: isAuthenticated,
    queryFn: () => NotificationService.unreadCount(),
    refetchInterval: 30000,
  });
  const unreadCount = Number((unreadQuery.data as any)?.unread_count ?? 0);
  const hasUnread = unreadCount > 0;

  return (
    <>
      <View className="flex-row items-center">
        <View style={{ marginEnd: 8 }}>
          <IconButton
            icon="language-outline"
            onPress={() => setLanguageModalVisible(true)}
            bgColor="#F5D0FE"
            iconColor="#A21CAF"
          />
        </View>
        <View style={{ marginEnd: 8 }}>
          <IconButton
            icon="cart-outline"
            badgeCount={cartCount}
            pulseBadge
            badgeColor="#EF4444"
            onPress={() => router.push('/shop/CartScreen')}
            bgColor="#CCFBF1"
            iconColor="#0F766E"
          />
        </View>
        <IconButton
          icon="notifications-outline"
          badgeDot={hasUnread}
          badgeCount={hasUnread ? unreadCount : undefined}
          badgeColor="#4D7C0F"
          onPress={() => router.push('/profile/NotificationsScreen')}
          bgColor="#ECFCCB"
          iconColor="#4D7C0F"
        />
      </View>
      <LanguageModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />
    </>
  );
}
