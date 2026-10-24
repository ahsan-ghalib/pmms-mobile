import { useEffect, useMemo, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../i18n/LanguageContext';
import NewRequestFlow, { RequestSite } from '../create/NewRequestFlow';
import { useNotifications } from '../home/useTenantHome';
import NotificationsScreen from '../notifications/NotificationsScreen';
import ProfileScreen from '../profile/ProfileScreen';
import BottomTabBar, { TAB_BAR_HEIGHT, TabKey } from '../shell/BottomTabBar';
import JobDetailScreen from './JobDetailScreen';
import JobsScreen from './JobsScreen';
import { ACTIVE_STATUSES, DONE_STATUSES } from './jobs';
import SitePickerSheet, { sitesFromJobs } from './SitePickerSheet';
import TechnicianHomeScreen from './TechnicianHomeScreen';
import { technicianCopy } from './technicianCopy';
import { useDuty, useLocationPings, useTechnicianJobs } from './useTechnician';

export default function TechnicianShell() {
  const [tab, setTab] = useState<TabKey>('home');
  const [jobId, setJobId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [site, setSite] = useState<RequestSite | null>(null);
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const copy = technicianCopy[language];
  const notifications = useNotifications();
  const jobs = useTechnicianJobs();
  const duty = useDuty();
  const hasUnread = (notifications.data ?? []).some((item) => !item.read_at);
  const bottomInset = TAB_BAR_HEIGHT + Math.max(insets.bottom - 8, 8);
  const sites = useMemo(() => sitesFromJobs(jobs.data ?? []), [jobs.data]);

  useLocationPings(duty.data);

  useEffect(() => {
    if (!jobId) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setJobId(null);
      return true;
    });
    return () => sub.remove();
  }, [jobId]);

  const changeTab = (next: TabKey) => {
    setJobId(null);
    setTab(next);
  };

  const startRequest = () => {
    if (sites.length === 1) setSite(sites[0]);
    else if (sites.length === 0)
      Toast.show({ type: 'info', text1: copy.newJob.noSites, text2: copy.newJob.noSitesBody });
    else setPicking(true);
  };

  const list = jobs.data ?? [];
  const profileStats = [
    {
      value: list.filter((job) => ACTIVE_STATUSES.includes(job.status)).length,
      label: copy.filters.active,
      color: 'text-brand-600',
    },
    {
      value: list.filter((job) => job.status === 'in_progress').length,
      label: copy.stats.in_progress,
      color: 'text-amber-600',
    },
    {
      value: list.filter((job) => DONE_STATUSES.includes(job.status)).length,
      label: copy.stats.completed,
      color: 'text-emerald-600',
    },
  ];

  if (site) {
    const close = () => setSite(null);
    return (
      <NewRequestFlow
        site={site}
        onClose={close}
        onHome={() => {
          close();
          changeTab('home');
        }}
        onViewComplaints={() => {
          close();
          changeTab('home');
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-[#F6F9FE]">
      <View className="flex-1" style={{ display: jobId ? 'none' : 'flex' }}>
        {tab === 'home' ? (
          <TechnicianHomeScreen
            bottomInset={bottomInset}
            onOpenJob={setJobId}
            onOpenJobs={() => setTab('jobs')}
            onOpenNotifications={() => setTab('notifications')}
          />
        ) : null}
        {tab === 'jobs' ? <JobsScreen bottomInset={bottomInset} onOpen={setJobId} /> : null}
        {tab === 'notifications' ? <NotificationsScreen bottomInset={bottomInset} /> : null}
        {tab === 'profile' ? (
          <ProfileScreen
            bottomInset={bottomInset}
            onOpenNotifications={() => setTab('notifications')}
            stats={profileStats}
            onRefreshStats={() => jobs.refetch()}
          />
        ) : null}
      </View>
      {jobId ? (
        <JobDetailScreen jobId={jobId} bottomInset={bottomInset} onBack={() => setJobId(null)} />
      ) : null}
      <BottomTabBar
        variant="technician"
        active={tab}
        onChange={changeTab}
        onCreate={startRequest}
        hasUnread={hasUnread}
      />
      <SitePickerSheet
        visible={picking}
        sites={sites}
        onClose={() => setPicking(false)}
        onSelect={(next) => {
          setPicking(false);
          setSite(next);
        }}
      />
    </View>
  );
}
