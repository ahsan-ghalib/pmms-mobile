import { ComponentProps, ReactNode, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { AppLanguage, LANGUAGE_LABELS, useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { DONE_STATUSES, OPEN_STATUSES, PROGRESS_STATUSES } from '../home/complaints';
import { useComplaintContext, useComplaints } from '../home/useTenantHome';
import ChangePasswordSheet from './ChangePasswordSheet';
import { profileCopy } from './profileCopy';

type IconName = ComponentProps<typeof Ionicons>['name'];

const cardShadow = {
  shadowColor: '#1E3A8A',
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 1,
};

type Props = {
  bottomInset: number;
  onOpenNotifications: () => void;
};

export default function ProfileScreen({ bottomInset, onOpenNotifications }: Props) {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, isAr, font, row, align } = useLanguage();
  const { user, signOut } = useAuth();
  const copy = profileCopy[language];
  const complaints = useComplaints();
  const context = useComplaintContext();
  const [signingOut, setSigningOut] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const list = complaints.data ?? [];
  const stats = {
    total: list.length,
    open: list.filter((item) => [...OPEN_STATUSES, ...PROGRESS_STATUSES].includes(item.status))
      .length,
    done: list.filter((item) => DONE_STATUSES.includes(item.status)).length,
  };
  const property = context.data?.default?.property?.name;
  const unit = context.data?.default?.unit?.name;
  const residence = [unit, property].filter(Boolean).join(', ');
  const initials = (user?.name || '?')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const avatarUri = user?.avatar && /^https?:\/\//.test(user.avatar) ? user.avatar : null;
  const roleLabel = user?.role ? (copy.roles[user.role] ?? user.role) : null;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  return (
    <View className="flex-1 bg-[#F6F9FE]">
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={complaints.isRefetching || context.isRefetching}
            onRefresh={() => {
              complaints.refetch();
              context.refetch();
            }}
            tintColor="#2F80F0"
          />
        }
      >
        <LinearGradient
          colors={['#1D4ED8', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 12,
            paddingBottom: 72,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          <Text className={`px-5 text-center text-[18px] ${font.bold} text-white`}>
            {copy.title}
          </Text>
        </LinearGradient>

        <View className="-mt-14 items-center px-5">
          <View
            className="rounded-full bg-white p-1.5"
            style={{ ...cardShadow, shadowOpacity: 0.12 }}
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                contentFit="cover"
                style={{ width: 104, height: 104, borderRadius: 52 }}
              />
            ) : (
              <LinearGradient
                colors={['#60A5FA', '#1D4ED8']}
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 52,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text className={`text-[34px] ${font.extrabold} text-white`}>{initials}</Text>
              </LinearGradient>
            )}
          </View>
          <Text className={`mt-3 text-center text-[22px] ${font.extrabold} text-ink-900`}>
            {user?.name}
          </Text>
          <View className={`mt-1.5 ${row} items-center gap-2`}>
            {roleLabel ? (
              <View className="rounded-full bg-brand-50 px-3 py-1">
                <Text className={`text-[12px] ${font.semibold} text-brand-600`}>{roleLabel}</Text>
              </View>
            ) : null}
            {residence ? (
              <View className={`${row} items-center gap-1`}>
                <Ionicons name="location-outline" size={14} color="#64748B" />
                <Text numberOfLines={1} className={`text-[13px] ${font.regular} text-ink-500`}>
                  {residence}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View className={`mx-5 mt-5 ${row} rounded-2xl bg-white py-4`} style={cardShadow}>
          <Stat value={stats.total} label={copy.totalRequests} color="text-brand-600" />
          <View className="w-px bg-slate-100" />
          <Stat value={stats.open} label={copy.openRequests} color="text-amber-600" />
          <View className="w-px bg-slate-100" />
          <Stat value={stats.done} label={copy.completedRequests} color="text-emerald-600" />
        </View>

        <Section title={copy.personalInfo}>
          <InfoRow icon="person-outline" label={copy.fullName} value={user?.name} />
          <InfoRow icon="call-outline" label={copy.mobile} value={user?.phone} />
          <InfoRow
            icon="mail-outline"
            label={copy.email}
            value={user?.email}
            badge={user?.email_verified_at ? copy.verified : undefined}
          />
          <InfoRow icon="at-outline" label={copy.username} value={user?.username} />
          <InfoRow icon="business-outline" label={copy.property} value={property} />
          <InfoRow icon="home-outline" label={copy.unit} value={unit} />
          <InfoRow icon="briefcase-outline" label={copy.company} value={user?.company_name} />
          <InfoRow
            icon="time-outline"
            label={copy.lastLogin}
            value={
              user?.last_login_at
                ? dayjs(user.last_login_at).locale(language).format('D MMM YYYY, h:mm A')
                : null
            }
            last
          />
        </Section>

        <Section title={copy.settings}>
          <View className="border-b border-slate-100 py-3.5">
            <View className={`${row} items-center gap-3`}>
              <IconTile icon="globe-outline" />
              <Text className={`flex-1 text-[14px] ${font.semibold} text-ink-900 ${align}`}>
                {copy.language}
              </Text>
            </View>
            <View className={`mt-3 ${row} gap-2 rounded-full bg-slate-100 p-1`}>
              {(Object.keys(LANGUAGE_LABELS) as AppLanguage[]).map((code) => {
                const selected = code === language;
                return (
                  <Pressable
                    key={code}
                    onPress={() => setLanguage(code)}
                    className={`flex-1 items-center rounded-full py-2 ${selected ? 'bg-white' : ''}`}
                    style={selected ? cardShadow : undefined}
                  >
                    <Text
                      className={`text-[13px] ${font.semibold} ${selected ? 'text-brand-600' : 'text-ink-500'}`}
                    >
                      {LANGUAGE_LABELS[code]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <ActionRow
            icon="key-outline"
            title={copy.changePassword}
            hint={copy.changePasswordHint}
            onPress={() => setPasswordOpen(true)}
          />
          <ActionRow
            icon="notifications-outline"
            title={copy.notifications}
            hint={copy.notificationsHint}
            onPress={onOpenNotifications}
            last
          />
        </Section>

        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          className={`mx-5 mt-4 ${row} items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 active:opacity-80`}
        >
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-white">
            {signingOut ? (
              <ActivityIndicator color="#E11D48" />
            ) : (
              <Ionicons name="log-out-outline" size={19} color="#E11D48" />
            )}
          </View>
          <Text className={`flex-1 text-[15px] ${font.semibold} text-rose-600 ${align}`}>
            {copy.signOut}
          </Text>
          <Ionicons name={isAr ? 'chevron-back' : 'chevron-forward'} size={18} color="#FDA4AF" />
        </Pressable>

        <Text className={`mt-5 text-center text-[12px] ${font.regular} text-ink-400`}>
          {copy.version(version)}
        </Text>
      </ScrollView>

      <ChangePasswordSheet visible={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </View>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  const { font } = useLanguage();
  return (
    <View className="flex-1 items-center">
      <Text className={`text-[22px] ${font.extrabold} ${color}`}>{value}</Text>
      <Text className={`mt-0.5 text-[12px] ${font.medium} text-ink-500`}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { font, align } = useLanguage();
  return (
    <View className="mx-5 mt-5">
      <Text className={`mb-2.5 text-[15px] ${font.bold} text-ink-900 ${align}`}>{title}</Text>
      <View className="rounded-2xl bg-white px-4" style={cardShadow}>
        {children}
      </View>
    </View>
  );
}

function IconTile({ icon }: { icon: IconName }) {
  return (
    <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
      <Ionicons name={icon} size={18} color="#1D6FE6" />
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  badge,
  last,
}: {
  icon: IconName;
  label: string;
  value?: string | null;
  badge?: string;
  last?: boolean;
}) {
  const { language, font, row, align } = useLanguage();
  return (
    <View className={`${row} items-center gap-3 py-3 ${last ? '' : 'border-b border-slate-100'}`}>
      <IconTile icon={icon} />
      <View className="flex-1">
        <Text
          className={`text-[11px] ${font.medium} uppercase tracking-wide text-ink-400 ${align}`}
        >
          {label}
        </Text>
        <Text
          numberOfLines={1}
          className={`mt-0.5 text-[14px] ${value ? `${font.semibold} text-ink-900` : `${font.regular} text-ink-400`} ${align}`}
        >
          {value || profileCopy[language].notProvided}
        </Text>
      </View>
      {badge ? (
        <View className={`${row} items-center gap-1 rounded-full bg-emerald-50 px-2 py-1`}>
          <Ionicons name="checkmark-circle" size={12} color="#059669" />
          <Text className={`text-[11px] ${font.medium} text-emerald-700`}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ActionRow({
  icon,
  title,
  hint,
  onPress,
  last,
}: {
  icon: IconName;
  title: string;
  hint: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { isAr, font, row, align } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      className={`${row} items-center gap-3 py-3.5 active:opacity-70 ${last ? '' : 'border-b border-slate-100'}`}
    >
      <IconTile icon={icon} />
      <View className="flex-1">
        <Text className={`text-[14px] ${font.semibold} text-ink-900 ${align}`}>{title}</Text>
        <Text className={`mt-0.5 text-[12px] ${font.regular} text-ink-500 ${align}`}>{hint}</Text>
      </View>
      <Ionicons name={isAr ? 'chevron-back' : 'chevron-forward'} size={18} color="#94A3B8" />
    </Pressable>
  );
}
