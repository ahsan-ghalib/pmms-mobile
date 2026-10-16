import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ApiError, apiRequest } from '../../lib/api';
import { AppLanguage, LANGUAGE_LABELS, useLanguage } from '../../i18n/LanguageContext';
import { AuthUser, useAuth } from './AuthContext';
import { AppleLogo, GoogleLogo, MicrosoftLogo } from './SocialLogos';
import { loginCopy } from './loginCopy';

const HERO = require('../../../assets/images/auth/login-hero.webp');
const APP_ICON = require('../../../assets/images/auth/app-icon.webp');
const HERO_RATIO = 979 / 768;

const SOCIAL = [
  { key: 'google', label: 'Google', Logo: GoogleLogo },
  { key: 'apple', label: 'Apple', Logo: AppleLogo },
  { key: 'microsoft', label: 'Microsoft', Logo: MicrosoftLogo },
];

type Field = 'identifier' | 'password' | null;

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, isAr, font, row, align } = useLanguage();
  const { signIn } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [focused, setFocused] = useState<Field>(null);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const enter = useRef(new Animated.Value(0)).current;

  const copy = loginCopy[language];
  const heroWidth = Math.min(width * 0.65, 360);
  const compact = width < 360;

  useEffect(() => {
    Animated.spring(enter, {
      toValue: 1,
      damping: 18,
      stiffness: 120,
      useNativeDriver: true,
    }).start();
  }, [enter]);

  const info = (title: string, body: string) =>
    Toast.show({ type: 'info', text1: title, text2: body });

  const submit = async () => {
    const nextErrors = {
      identifier: identifier.trim() ? undefined : copy.identifierRequired,
      password: password ? undefined : copy.passwordRequired,
    };
    setErrors(nextErrors);
    if (nextErrors.identifier || nextErrors.password) return;

    setSubmitting(true);
    try {
      const json = await apiRequest<{ data?: { token?: string; user?: AuthUser } }>('/auth/login', {
        method: 'POST',
        body: { email: identifier.trim(), password },
        language,
      });
      const token = json?.data?.token;
      if (!token || !json.data?.user) {
        Toast.show({ type: 'error', text1: copy.failedTitle, text2: copy.invalidCredentials });
        return;
      }
      await signIn(token, json.data.user, remember);
    } catch (error) {
      const text2 =
        error instanceof ApiError
          ? error.code === 'invalid_credentials' || error.status === 422
            ? copy.invalidCredentials
            : error.message
          : copy.networkError;
      Toast.show({ type: 'error', text1: copy.failedTitle, text2 });
    } finally {
      setSubmitting(false);
    }
  };

  const inputBorder = (field: Exclude<Field, null>) =>
    errors[field] ? 'border-rose-300' : focused === field ? 'border-brand-500' : 'border-slate-200';

  return (
    <View className="flex-1 bg-[#F6F9FE]">
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#F7FAFF', '#FFFFFF', '#EDF4FF']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-brand-100/60"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={HERO}
            contentFit="contain"
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              [isAr ? 'left' : 'right']: -width * 0.06,
              width: heroWidth,
              height: heroWidth * HERO_RATIO,
            }}
          />

          <View className="px-6" style={{ paddingTop: insets.top + 10 }}>
            <View className={`${row} justify-end`}>
              <Pressable
                onPress={() => setMenuOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityLabel={LANGUAGE_LABELS[language]}
                className={`${row} items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2.5`}
                style={styles.softShadow}
              >
                <Ionicons name="globe-outline" size={18} color="#475569" />
                <Text className={`${font.medium} text-[14px] text-ink-700`}>
                  {LANGUAGE_LABELS[language]}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94A3B8" />
              </Pressable>
            </View>

            <View className={`${row} mt-5 items-center gap-3`}>
              <Image source={APP_ICON} style={styles.appIcon} />
              <View>
                <Text className={`font-inter-extrabold text-[22px] text-ink-900 ${align}`}>
                  PMMS
                </Text>
                <Text className={`${font.regular} text-[12px] leading-4 text-ink-500 ${align}`}>
                  {copy.brandSubtitle}
                </Text>
              </View>
            </View>

            <View className="mt-12">
              <View
                className={`h-1 w-9 rounded-full bg-brand-600 ${isAr ? 'self-end' : 'self-start'}`}
              />
              <Text
                className={`mt-5 text-[38px] leading-[46px] ${font.extrabold} text-ink-900 ${align}`}
              >
                {copy.welcome}
              </Text>
              <Text
                className={`text-[38px] leading-[46px] ${font.extrabold} text-brand-600 ${align}`}
              >
                {copy.welcomeBack}
              </Text>
              <Text
                className={`mt-4 text-[14px] leading-[22px] ${font.regular} text-ink-500 ${align}`}
                style={{
                  maxWidth: Math.min(width * 0.6, 280),
                  alignSelf: isAr ? 'flex-end' : 'flex-start',
                }}
              >
                {copy.subtitle}
              </Text>
            </View>

            <Animated.View
              className="mt-7 rounded-[28px] bg-white/95 p-5"
              style={[
                styles.cardShadow,
                {
                  opacity: enter,
                  transform: [
                    { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                  ],
                },
              ]}
            >
              <Text className={`mb-2 text-[14px] ${font.medium} text-ink-700 ${align}`}>
                {copy.identifierLabel}
              </Text>
              <View
                className={`${row} h-[52px] items-center rounded-full border bg-white px-4 ${inputBorder('identifier')}`}
              >
                <Ionicons name="mail-outline" size={20} color="#475569" />
                <TextInput
                  value={identifier}
                  onChangeText={(value) => {
                    setIdentifier(value);
                    if (errors.identifier)
                      setErrors((current) => ({ ...current, identifier: undefined }));
                  }}
                  onFocus={() => setFocused('identifier')}
                  onBlur={() => setFocused(null)}
                  placeholder={copy.identifierPlaceholder}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="username"
                  autoComplete="username"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  className={`mx-3 h-full flex-1 text-[15px] ${font.regular} text-ink-900`}
                  style={{ textAlign: isAr ? 'right' : 'left' }}
                />
              </View>
              {errors.identifier ? (
                <Text className={`mt-1.5 text-[12px] ${font.regular} text-rose-600 ${align}`}>
                  {errors.identifier}
                </Text>
              ) : null}

              <View className={`${row} mb-2 mt-5 items-center justify-between`}>
                <Text className={`text-[14px] ${font.medium} text-ink-700`}>
                  {copy.passwordLabel}
                </Text>
                <Pressable onPress={() => info(copy.forgotTitle, copy.forgotBody)} hitSlop={8}>
                  <Text className={`text-[14px] ${font.medium} text-brand-600`}>
                    {copy.forgotPassword}
                  </Text>
                </Pressable>
              </View>
              <View
                className={`${row} h-[52px] items-center rounded-full border bg-white px-4 ${inputBorder('password')}`}
              >
                <Ionicons name="lock-closed-outline" size={20} color="#475569" />
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (errors.password)
                      setErrors((current) => ({ ...current, password: undefined }));
                  }}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder={copy.passwordPlaceholder}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  autoComplete="password"
                  returnKeyType="go"
                  onSubmitEditing={submit}
                  className={`mx-3 h-full flex-1 text-[15px] ${font.regular} text-ink-900`}
                  style={{ textAlign: isAr ? 'right' : 'left' }}
                />
                <Pressable
                  onPress={() => setShowPassword((value) => !value)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? copy.hidePassword : copy.showPassword}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#475569"
                  />
                </Pressable>
              </View>
              {errors.password ? (
                <Text className={`mt-1.5 text-[12px] ${font.regular} text-rose-600 ${align}`}>
                  {errors.password}
                </Text>
              ) : null}

              <Pressable
                onPress={() => setRemember((value) => !value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: remember }}
                className={`${row} mt-5 items-center gap-3 self-start`}
                style={isAr ? { alignSelf: 'flex-end' } : undefined}
              >
                <View
                  className={`h-[22px] w-[22px] items-center justify-center rounded-md ${remember ? 'bg-brand-600' : 'border-2 border-slate-300 bg-white'}`}
                >
                  {remember ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                </View>
                <Text className={`text-[14px] ${font.regular} text-ink-700`}>
                  {copy.rememberMe}
                </Text>
              </Pressable>

              <Pressable
                onPress={submit}
                disabled={submitting}
                className="mt-6 active:opacity-90"
                style={styles.buttonShadow}
              >
                <LinearGradient
                  colors={['#1D6FE6', '#3B8BF5']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.button}
                >
                  <Text className={`text-[17px] ${font.semibold} text-white`}>{copy.signIn}</Text>
                  <View style={[styles.buttonIcon, isAr ? { left: 22 } : { right: 22 }]}>
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Ionicons
                        name={isAr ? 'arrow-back' : 'arrow-forward'}
                        size={22}
                        color="#FFFFFF"
                      />
                    )}
                  </View>
                </LinearGradient>
              </Pressable>

              <View className={`${row} my-6 items-center gap-3`}>
                <View className="h-px flex-1 bg-slate-200" />
                <Text className={`text-[13px] ${font.regular} text-ink-500`}>
                  {copy.orContinue}
                </Text>
                <View className="h-px flex-1 bg-slate-200" />
              </View>

              <View className={`${row} gap-2.5`}>
                {SOCIAL.map(({ key, label, Logo }) => (
                  <Pressable
                    key={key}
                    onPress={() => info(copy.ssoTitle, copy.ssoBody(label))}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    className="h-[50px] flex-1 flex-row items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white active:bg-slate-50"
                    style={styles.softShadow}
                  >
                    <Logo size={19} />
                    {!compact ? (
                      <Text className="font-inter-medium text-[13px] text-ink-900">{label}</Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>

              <View className={`${row} mt-6 flex-wrap items-center justify-center`}>
                <Text className={`text-[14px] ${font.regular} text-ink-500`}>
                  {copy.noAccount}{' '}
                </Text>
                <Pressable onPress={() => info(copy.signupTitle, copy.signupBody)} hitSlop={6}>
                  <Text className={`text-[14px] ${font.semibold} text-brand-600`}>
                    {copy.createAccount}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>

            <View className="mt-8 flex-row justify-center gap-1.5">
              <View className="h-1.5 w-7 rounded-full bg-brand-600" />
              <View className="h-1.5 w-4 rounded-full bg-brand-200" />
            </View>
            <Text
              className={`mt-5 text-center text-[11px] tracking-[3px] ${font.medium} text-ink-500`}
            >
              {copy.motto}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {menuOpen ? (
        <>
          <Pressable className="absolute inset-0" onPress={() => setMenuOpen(false)} />
          <View
            className="absolute w-44 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1.5"
            style={[styles.cardShadow, { top: insets.top + 62, [isAr ? 'left' : 'right']: 24 }]}
          >
            {(Object.keys(LANGUAGE_LABELS) as AppLanguage[]).map((code) => (
              <Pressable
                key={code}
                onPress={() => {
                  setLanguage(code);
                  setErrors({});
                  setMenuOpen(false);
                }}
                className={`${code === 'ar' ? 'flex-row-reverse' : 'flex-row'} items-center justify-between px-4 py-3 active:bg-slate-50`}
              >
                <Text
                  className={`text-[15px] ${code === 'ar' ? 'font-cairo-semibold' : 'font-inter-medium'} text-ink-900`}
                >
                  {LANGUAGE_LABELS[code]}
                </Text>
                {code === language ? <Ionicons name="checkmark" size={18} color="#1D6FE6" /> : null}
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  appIcon: { width: 52, height: 52, borderRadius: 14 },
  softShadow: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardShadow: {
    shadowColor: '#1E40AF',
    shadowOpacity: 0.1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  buttonShadow: {
    borderRadius: 999,
    shadowColor: '#1D6FE6',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  button: {
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
});
