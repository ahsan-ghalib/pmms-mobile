import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { Text } from './Text';

const { height } = Dimensions.get('window');

export const REPORT_PROBLEMS = [
  'Nudity or sexual activity',
  'Hate Speech or symbols',
  'Scam or fraud',
  'Violence or dangerous organisations',
  'Sale of illegal or regulated goods',
  'Bullying or harassment',
  'Pretending to be someone else',
] as const;

export type ReportProblem = (typeof REPORT_PROBLEMS)[number];

type ReportTarget =
  { kind: 'video'; postId: number } | { kind: 'live'; vendorId: number; youtubeVideoId: string };

type ReportContentModalProps = {
  visible: boolean;
  onClose: () => void;
  target: ReportTarget | null;
};

export default function ReportContentModal({ visible, onClose, target }: ReportContentModalProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  // Language only — do not use CSS `direction` / row-reverse together (double-flips).
  const isArabic = (i18n.language || '').startsWith('ar');
  const slideAnim = useRef(new Animated.Value(height)).current;
  const [step, setStep] = useState<'reason' | 'details'>('reason');
  const [selectedProblem, setSelectedProblem] = useState<ReportProblem | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(() => {
    if (target?.kind === 'live') {
      return t('report_live', 'Report Live Stream');
    }
    return t('report_video', 'Report Video');
  }, [t, target?.kind]);

  const intro = useMemo(() => {
    if (target?.kind === 'live') {
      return t(
        'report_live_intro',
        "You can report this live stream if you think it goes against our community guidelines. We won't notify the account that you submitted this report.",
      );
    }
    return t(
      'report_video_intro',
      "You can report this video if you think it goes against our community guidelines. We won't notify the account that you submitted this report.",
    );
  }, [t, target?.kind]);

  useEffect(() => {
    if (visible) {
      setStep('reason');
      setSelectedProblem(null);
      setComment('');
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const problemLabel = (problem: string) =>
    t(`report_problem_${problem}`, { defaultValue: problem });

  const submit = async () => {
    if (!target || !selectedProblem) {
      return;
    }
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      handleClose();
      router.push({ pathname: '/(auth)', params: { returnUrl: '/' } });
      return;
    }

    const trimmed = comment.trim();
    if (!trimmed) {
      Alert.alert(
        t('error', 'Error'),
        t('report_comment_required', 'Please enter details about the issue.'),
      );
      return;
    }

    if (target.kind === 'video' && (!Number.isFinite(target.postId) || target.postId <= 0)) {
      Alert.alert(t('error', 'Error'), t('report_failed', 'Failed to submit report.'));
      return;
    }

    try {
      setSubmitting(true);
      if (target.kind === 'video') {
        await axiosInstance.post(`/posts/${target.postId}/reports`, {
          problem: selectedProblem,
          reason: trimmed,
        });
      } else {
        await axiosInstance.post('/live-reports', {
          vendor_id: target.vendorId,
          youtube_video_id: target.youtubeVideoId,
          problem: selectedProblem,
          reason: trimmed,
        });
      }
      Alert.alert(
        t('success', 'Success'),
        t('report_submitted', 'Thank you. Your report has been submitted.'),
      );
      handleClose();
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        handleClose();
        router.push({ pathname: '/(auth)', params: { returnUrl: '/' } });
        return;
      }
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.problem?.[0] ||
        error?.response?.data?.errors?.reason?.[0] ||
        error?.message;
      Alert.alert(
        t('error', 'Error'),
        typeof apiMessage === 'string' && apiMessage.trim()
          ? apiMessage
          : t('report_failed', 'Failed to submit report.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handleBar} />
          <View style={styles.headerRow}>
            {isArabic ? (
              <>
                <TouchableOpacity onPress={handleClose} hitSlop={8} style={styles.headerBtn}>
                  <Ionicons name="close" size={22} color="#000" />
                </TouchableOpacity>
                <Text style={[styles.title, styles.textRtl]}>{title}</Text>
                {step === 'details' ? (
                  <TouchableOpacity
                    onPress={() => setStep('reason')}
                    hitSlop={8}
                    style={styles.headerBtn}
                  >
                    <Ionicons name="chevron-forward" size={22} color="#000" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.headerBtn} />
                )}
              </>
            ) : (
              <>
                {step === 'details' ? (
                  <TouchableOpacity
                    onPress={() => setStep('reason')}
                    hitSlop={8}
                    style={styles.headerBtn}
                  >
                    <Ionicons name="chevron-back" size={22} color="#000" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.headerBtn} />
                )}
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={8} style={styles.headerBtn}>
                  <Ionicons name="close" size={22} color="#000" />
                </TouchableOpacity>
              </>
            )}
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 'reason' ? (
              <>
                <Text style={[styles.intro, isArabic && styles.textRtl]}>{intro}</Text>
                <View style={styles.group}>
                  {REPORT_PROBLEMS.map((problem, index) => (
                    <TouchableOpacity
                      key={problem}
                      style={[
                        styles.row,
                        index === 0 && styles.rowFirst,
                        index === REPORT_PROBLEMS.length - 1 && styles.rowLast,
                      ]}
                      onPress={() => {
                        setSelectedProblem(problem);
                        setStep('details');
                      }}
                      activeOpacity={0.7}
                    >
                      {isArabic ? (
                        <>
                          <Ionicons name="chevron-back" size={18} color="#9CA3AF" />
                          <Text style={[styles.rowLabel, styles.textRtl, styles.rowLabelRtl]}>
                            {problemLabel(problem)}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.rowLabel}>{problemLabel(problem)}</Text>
                          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                        </>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={styles.selectedBox}>
                  <Text style={[styles.selectedLabel, isArabic && styles.textRtl]}>
                    {t('selected_problem', 'Selected problem')}
                  </Text>
                  <Text style={[styles.selectedValue, isArabic && styles.textRtl]}>
                    {selectedProblem ? problemLabel(selectedProblem) : ''}
                  </Text>
                </View>
                <Text style={[styles.commentHeading, isArabic && styles.textRtl]}>
                  {t('report_comment_heading', 'Enter your comments below')}
                </Text>
                <TextInput
                  style={[styles.commentInput, isArabic && styles.commentInputRtl]}
                  value={comment}
                  onChangeText={setComment}
                  placeholder={t('report_comment_placeholder', 'TYPE YOUR COMMENT HERE...')}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  textAlignVertical="top"
                  textAlign={isArabic ? 'right' : 'left'}
                  maxLength={1000}
                  autoFocus
                />
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (!comment.trim() || submitting) && styles.submitDisabled,
                  ]}
                  onPress={submit}
                  disabled={!comment.trim() || submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>{t('submit', 'Submit')}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  container: {
    backgroundColor: '#F3F4F6',
    borderTopStartRadius: 16,
    borderTopEndRadius: 16,
    maxHeight: height * 0.88,
    paddingBottom: 28,
  },
  handleBar: {
    width: 36,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111' },
  textRtl: { textAlign: 'right', writingDirection: 'rtl' },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  intro: { fontSize: 13, lineHeight: 20, color: '#4B5563', marginBottom: 12, marginTop: 4 },
  group: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  rowFirst: { borderTopStartRadius: 12, borderTopEndRadius: 12 },
  rowLast: {
    borderBottomWidth: 0,
    borderBottomStartRadius: 12,
    borderBottomEndRadius: 12,
  },
  rowLabel: { flex: 1, fontSize: 15, color: '#111', fontWeight: '500', paddingEnd: 8 },
  rowLabelRtl: { paddingEnd: 0, paddingStart: 8 },
  selectedBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  selectedLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  selectedValue: { fontSize: 15, fontWeight: '600', color: '#111' },
  commentHeading: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 8 },
  commentInput: {
    minHeight: 140,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commentInputRtl: { textAlign: 'right', writingDirection: 'rtl' },
  submitBtn: {
    marginTop: 16,
    backgroundColor: '#E11D48',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
