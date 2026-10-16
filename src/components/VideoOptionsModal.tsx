import React, { useEffect, useRef, useState } from 'react';
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
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
// Shared Text swaps Inter → Cairo automatically when the language is Arabic.
import { Text } from './Text';
import { videoDownloadManager, type VideoDownloadState } from '../utils/videoDownloadManager';
import ReportContentModal from './ReportContentModal';

const { height } = Dimensions.get('window');

interface VideoOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: number;
  /** Progressive MP4 URL for gallery save. HLS-only posts leave this empty. */
  downloadUrl?: string | null;
  /** When false, the Download row is hidden entirely. Defaults to true. */
  isDownloadable?: boolean;
  onPiP: () => void;
  onSpeed: (speed: number) => void;
  currentSpeed: number;
  variants?: any[];
  selectedQuality?: string;
  onSelectQuality?: (quality: string) => void;
  /**
   * Hide all feed chrome until the next tap on the video. Omitted by the legacy
   * RN feed, which has no chrome host to hide — the row is dropped there.
   */
  onClearDisplay?: () => void;
  autoScroll?: boolean;
  onAutoScrollChange?: (enabled: boolean) => void;
}

export default function VideoOptionsModal({
  visible,
  onClose,
  postId,
  downloadUrl = null,
  isDownloadable = true,
  onPiP,
  onSpeed,
  currentSpeed,
  variants = [],
  selectedQuality = 'auto',
  onSelectQuality,
  onClearDisplay,
  autoScroll = false,
  onAutoScrollChange,
}: VideoOptionsModalProps) {
  const { t, i18n } = useTranslation();
  // Language only — `I18nManager.isRTL` is captured at app launch and doesn't
  // follow a live language switch, so it keeps this sheet RTL after the user
  // moves back to English until the app is restarted.
  const isArabic = (i18n.language || '').startsWith('ar');
  const slideAnim = useRef(new Animated.Value(height)).current;
  const [reportingOpen, setReportingOpen] = useState(false);
  const [downloadState, setDownloadState] = useState<VideoDownloadState>(
    videoDownloadManager.getState(),
  );

  useEffect(() => {
    return videoDownloadManager.subscribe(setDownloadState);
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  /**
   * iOS cannot present two Modals at once — opening report while options is
   * still visible leaves the feed hung with no form. Hide options in the same
   * update (`visible && !reportingOpen`), then show report alone.
   */
  const handleReportPress = () => {
    setReportingOpen(true);
    onClose();
  };

  const isThisDownloading =
    (downloadState.status === 'downloading' || downloadState.status === 'saving') &&
    downloadState.postId === postId;
  const isOtherDownloading =
    (downloadState.status === 'downloading' || downloadState.status === 'saving') &&
    downloadState.postId !== postId;
  const downloadPercent = Math.round((downloadState.progress || 0) * 100);

  const handleDownloadPress = async () => {
    if (isThisDownloading) {
      return;
    }
    if (isOtherDownloading || videoDownloadManager.isBusy()) {
      Alert.alert(
        t('download', 'Download'),
        t('download_busy', 'Please wait for the current download to finish.'),
      );
      return;
    }
    if (!downloadUrl) {
      Alert.alert(
        t('download', 'Download'),
        t('download_unavailable', 'This video cannot be downloaded right now.'),
      );
      return;
    }

    try {
      await videoDownloadManager.start({ postId, url: downloadUrl });
      Alert.alert(t('success', 'Success'), t('download_saved', 'Video saved to your gallery.'));
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'BUSY') {
        Alert.alert(
          t('download', 'Download'),
          t('download_busy', 'Please wait for the current download to finish.'),
        );
        return;
      }
      if (message === 'PERMISSION') {
        Alert.alert(
          t('download', 'Download'),
          t('download_permission', 'Photo library permission is required to save videos.'),
        );
        return;
      }
      if (message === 'NO_URL') {
        Alert.alert(
          t('download', 'Download'),
          t('download_unavailable', 'This video cannot be downloaded right now.'),
        );
        return;
      }
      Alert.alert(t('error', 'Error'), t('download_failed', 'Download failed. Please try again.'));
    }
  };

  const speedOptions = [0.5, 1.0, 1.5, 2.0];

  const renderItem = (
    icon: any,
    label: string,
    onPress: () => void,
    rightElement?: React.ReactNode,
    isFirst?: boolean,
    isLast?: boolean,
  ) => (
    <TouchableOpacity
      style={[
        styles.listItem,
        isArabic && styles.listItemArabic,
        isFirst && styles.listItemFirst,
        isLast && styles.listItemLast,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.listLeft, isArabic && styles.listLeftArabic]}>
        <Ionicons name={icon} size={22} color="#000" style={styles.listIcon} />
        <Text style={styles.listLabel}>{label}</Text>
      </View>
      {rightElement && <View>{rightElement}</View>}
    </TouchableOpacity>
  );

  const downloadLabel = isThisDownloading
    ? downloadState.status === 'saving'
      ? t('download_saving', 'Saving…')
      : t('download_progress', 'Downloading… {{percent}}%', { percent: downloadPercent })
    : isOtherDownloading
      ? t('download_busy_short', 'Download in progress')
      : downloadState.status === 'done' && downloadState.postId === postId
        ? t('download_done', 'Saved')
        : t('download', 'Download');

  return (
    <>
      <Modal
        visible={visible && !reportingOpen}
        transparent
        animationType="none"
        presentationStyle="overFullScreen"
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={handleClose} />

          <Animated.View
            style={[
              styles.container,
              isArabic ? styles.containerArabic : styles.containerEnglish,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.handleBar} />

            <Pressable
              onPress={handleClose}
              style={[
                styles.closeButton,
                isArabic ? styles.closeButtonArabic : styles.closeButtonEnglish,
              ]}
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color="#000" />
            </Pressable>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Group 1 */}
              <View style={styles.groupContainer}>
                {isDownloadable ? (
                  <TouchableOpacity
                    style={[
                      styles.listItem,
                      isArabic && styles.listItemArabic,
                      styles.listItemFirst,
                      isThisDownloading && styles.listItemDownloading,
                    ]}
                    onPress={handleDownloadPress}
                    activeOpacity={0.7}
                    disabled={isThisDownloading}
                  >
                    <View style={[styles.listLeft, isArabic && styles.listLeftArabic, { flex: 1 }]}>
                      <Ionicons
                        name={
                          downloadState.status === 'done' && downloadState.postId === postId
                            ? 'checkmark-circle-outline'
                            : 'download-outline'
                        }
                        size={22}
                        color="#000"
                        style={styles.listIcon}
                      />
                      <View style={styles.downloadTextCol}>
                        <Text style={styles.listLabel}>{downloadLabel}</Text>
                        {isThisDownloading ? (
                          <View style={styles.progressTrack}>
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  width: `${Math.max(
                                    4,
                                    downloadState.status === 'saving' ? 100 : downloadPercent,
                                  )}%`,
                                },
                              ]}
                            />
                          </View>
                        ) : null}
                      </View>
                    </View>
                    {isThisDownloading ? <ActivityIndicator size="small" color="#666" /> : null}
                  </TouchableOpacity>
                ) : null}
                {renderItem(
                  'flag-outline',
                  t('report', 'Report'),
                  handleReportPress,
                  undefined,
                  !isDownloadable,
                  true,
                )}
              </View>

              {/* Group 2 */}
              <View style={styles.groupContainer}>
                <View
                  style={[styles.listItem, isArabic && styles.listItemArabic, styles.listItemFirst]}
                >
                  <View style={[styles.listLeft, isArabic && styles.listLeftArabic]}>
                    <Ionicons
                      name="speedometer-outline"
                      size={22}
                      color="#000"
                      style={styles.listIcon}
                    />
                    <Text style={styles.listLabel}>{t('speed', 'Speed')}</Text>
                  </View>
                  <View style={styles.speedPillContainer}>
                    {speedOptions.map((s, index) => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.speedPillItem,
                          currentSpeed === s && styles.speedPillItemActive,
                          index === 0 && { borderTopStartRadius: 6, borderBottomStartRadius: 6 },
                          index === speedOptions.length - 1 && {
                            borderTopEndRadius: 6,
                            borderBottomEndRadius: 6,
                          },
                        ]}
                        onPress={() => onSpeed(s)}
                      >
                        <Text
                          style={[
                            styles.speedPillText,
                            currentSpeed === s && styles.speedPillTextActive,
                          ]}
                        >
                          {s.toFixed(1)}x
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {variants && variants.length > 0 && (
                  <View style={[styles.listItem, isArabic && styles.listItemArabic]}>
                    <View style={[styles.listLeft, isArabic && styles.listLeftArabic]}>
                      <Ionicons
                        name="settings-outline"
                        size={22}
                        color="#000"
                        style={styles.listIcon}
                      />
                      <Text style={styles.listLabel}>{t('quality', 'Quality')}</Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.speedPillContainer}
                    >
                      <TouchableOpacity
                        style={[
                          styles.speedPillItem,
                          selectedQuality === 'auto' && styles.speedPillItemActive,
                          { borderTopStartRadius: 6, borderBottomStartRadius: 6 },
                        ]}
                        onPress={() => onSelectQuality?.('auto')}
                      >
                        <Text
                          style={[
                            styles.speedPillText,
                            selectedQuality === 'auto' && styles.speedPillTextActive,
                          ]}
                        >
                          {t('auto', 'Auto')}
                        </Text>
                      </TouchableOpacity>
                      {variants.map((v: any, index: number) => (
                        <TouchableOpacity
                          key={v.id}
                          style={[
                            styles.speedPillItem,
                            selectedQuality === v.resolution && styles.speedPillItemActive,
                            index === variants.length - 1 && {
                              borderTopEndRadius: 6,
                              borderBottomEndRadius: 6,
                            },
                          ]}
                          onPress={() => onSelectQuality?.(v.resolution)}
                        >
                          <Text
                            style={[
                              styles.speedPillText,
                              selectedQuality === v.resolution && styles.speedPillTextActive,
                            ]}
                          >
                            {v.resolution}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {onClearDisplay &&
                  renderItem('scan-outline', t('clear_display', 'Clear display'), () => {
                    onClearDisplay();
                    handleClose();
                  })}

                {onAutoScrollChange && (
                  <View style={[styles.listItem, isArabic && styles.listItemArabic]}>
                    <View style={[styles.listLeft, isArabic && styles.listLeftArabic]}>
                      <Ionicons
                        name="push-outline"
                        size={22}
                        color="#000"
                        style={styles.listIcon}
                      />
                      <Text style={styles.listLabel}>{t('auto_scroll', 'Auto scroll')}</Text>
                    </View>
                    <Switch
                      value={autoScroll}
                      onValueChange={onAutoScrollChange}
                      trackColor={{ false: '#e4e4e4', true: '#34C759' }}
                      ios_backgroundColor="#e4e4e4"
                    />
                  </View>
                )}

                {renderItem(
                  'albums-outline',
                  t('picture_in_picture', 'Picture-in-Picture'),
                  () => {
                    onPiP();
                    handleClose();
                  },
                  undefined,
                  false,
                  true,
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
      <ReportContentModal
        visible={reportingOpen}
        onClose={() => {
          setReportingOpen(false);
        }}
        target={{ kind: 'video', postId }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  container: {
    backgroundColor: '#F3F4F6',
    borderTopStartRadius: 16,
    borderTopEndRadius: 16,
    paddingBottom: 40,
    maxHeight: height * 0.85,
    zIndex: 2,
    elevation: 2,
  },
  containerArabic: {
    direction: 'rtl',
  },
  containerEnglish: {
    direction: 'ltr',
  },
  handleBar: {
    width: 36,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    width: 48,
    height: 48,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
  },
  closeButtonEnglish: {
    right: 16,
  },
  closeButtonArabic: {
    left: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 42,
    paddingBottom: 20,
  },
  groupContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 12,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  listItemDownloading: {
    paddingVertical: 16,
  },
  listItemArabic: {
    flexDirection: 'row',
    direction: 'rtl',
  },
  listItemFirst: {
    borderTopStartRadius: 12,
    borderTopEndRadius: 12,
  },
  listItemLast: {
    borderBottomStartRadius: 12,
    borderBottomEndRadius: 12,
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listLeftArabic: {
    flexDirection: 'row',
    direction: 'rtl',
  },
  listIcon: {
    marginEnd: 12,
  },
  listLabel: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  downloadTextCol: {
    flex: 1,
    paddingEnd: 12,
  },
  progressTrack: {
    marginTop: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#ff2c55',
  },
  speedPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    padding: 2,
  },
  speedPillItem: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  speedPillItemActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  speedPillText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  speedPillTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
});
