import { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../i18n/LanguageContext';
import HomeScreen from '../home/HomeScreen';
import { homeCopy } from '../home/homeCopy';
import { useNotifications } from '../home/useTenantHome';
import NotificationsScreen from '../notifications/NotificationsScreen';
import ProfileScreen from '../profile/ProfileScreen';
import NewRequestFlow from '../create/NewRequestFlow';
import { Category } from '../create/useCreateData';
import RequestDetailScreen from '../requests/RequestDetailScreen';
import RequestsScreen from '../requests/RequestsScreen';
import { useAuth } from '../auth/AuthContext';
import TechnicianShell from '../technician/TechnicianShell';
import BottomTabBar, { TAB_BAR_HEIGHT, TabKey } from './BottomTabBar';

export default function MainShell() {
  const { user } = useAuth();
  if (user?.role === 'technician') return <TechnicianShell />;
  return <TenantShell />;
}

function TenantShell() {
  const [tab, setTab] = useState<TabKey>('home');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ category?: Category } | null>(null);
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const copy = homeCopy[language];
  const notifications = useNotifications();
  const hasUnread = (notifications.data ?? []).some((item) => !item.read_at);
  const bottomInset = TAB_BAR_HEIGHT + Math.max(insets.bottom - 8, 8);

  const comingSoon = () =>
    Toast.show({ type: 'info', text1: copy.comingSoonTitle, text2: copy.comingSoonBody });
  const emergency = () =>
    Toast.show({ type: 'error', text1: copy.emergency, text2: copy.emergencyBody });

  useEffect(() => {
    if (!detailId) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setDetailId(null);
      return true;
    });
    return () => sub.remove();
  }, [detailId]);

  const changeTab = (next: TabKey) => {
    setDetailId(null);
    setTab(next);
  };

  if (creating) {
    return (
      <NewRequestFlow
        initialCategory={creating.category}
        onClose={() => setCreating(null)}
        onHome={() => {
          setCreating(null);
          setDetailId(null);
          setTab('home');
        }}
        onViewComplaints={() => {
          setCreating(null);
          setDetailId(null);
          setTab('requests');
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-[#F6F9FE]">
      <View className="flex-1" style={{ display: detailId ? 'none' : 'flex' }}>
        {tab === 'home' ? (
          <HomeScreen
            bottomInset={bottomInset}
            onOpenRequests={() => setTab('requests')}
            onOpenRequest={setDetailId}
            onOpenNotifications={() => setTab('notifications')}
            onComingSoon={comingSoon}
            onCreateRequest={(category) => setCreating({ category })}
            onEmergency={emergency}
          />
        ) : null}
        {tab === 'requests' ? (
          <RequestsScreen bottomInset={bottomInset} onOpen={setDetailId} />
        ) : null}
        {tab === 'notifications' ? <NotificationsScreen bottomInset={bottomInset} /> : null}
        {tab === 'profile' ? (
          <ProfileScreen
            bottomInset={bottomInset}
            onOpenNotifications={() => setTab('notifications')}
          />
        ) : null}
      </View>
      {detailId ? (
        <RequestDetailScreen
          complaintId={detailId}
          bottomInset={bottomInset}
          onBack={() => setDetailId(null)}
          onComingSoon={comingSoon}
        />
      ) : null}
      <BottomTabBar
        active={tab}
        onChange={changeTab}
        onCreate={() => setCreating({})}
        hasUnread={hasUnread}
      />
    </View>
  );
}
