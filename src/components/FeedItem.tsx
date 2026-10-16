import { Text } from './Text';
import { LinearGradient } from 'expo-linear-gradient';

import { useRouter } from 'expo-router';
import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { memo, useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Animated,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YoutubeIframe from 'react-native-youtube-iframe';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAudioPlayer } from 'expo-audio';
import { readVideoDimensionsFromItem, resolveVideoContentFit } from '../utils/videoContentFit';
import { getActivityTypeIconUri, getVendorMenuPath } from '../utils/vendor';
import { getPostCaption } from '../utils/postCaption';
import { getPostDownloadUrl } from '../utils/feedFilterCache';
import { resolvePlayableVideoUrl } from '../utils/feedVideoDiskCache';
import CommentsModal from './CommentsModal';
import FeedMountedVideo from './FeedMountedVideo';
import { useFeedPlayerPoolOptional } from './FeedPlayerPool';
import VideoOptionsModal from './VideoOptionsModal';
import { LiveProfileAvatar } from './LiveProfileAvatar';
import { LiveHubButton } from './LiveHubButton';
import { openActiveLivesHub } from '../utils/openActiveLivesHub';
import dayjs from 'dayjs';

function formatPostDate(value?: string) {
  if (!value) return '';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('D MMMM, YYYY') : value;
}

const { width, height } = Dimensions.get('window');

// Space reserved for the bottom tab bar so the video frame ends right above
// it (TikTok/Snapchat style) instead of being covered by it.
function getTabBarReservedHeight(_insetsBottom: number): number {
  if (Platform.isPad) {
    // Floating pill tab bar in app-tabs.tsx: height 84 + bottom offset 24.
    return 84 + 24;
  }
  // Match NativeHomeFeed bottomInset — video ends just above the tab bar.
  return 80;
}

interface FeedItemProps {
  item: any;
  index?: number;
  isActive: boolean;
  isScreenFocused: boolean;
  isHomeScreen?: boolean;
  activeFilter?: string;
  onFilterSelect?: (type: 'shop' | 'user' | 'all') => void;
  hideTopRightIcons?: boolean;
  /** Home screen renders filters outside FlatList so they work when empty. */
  hideHomeFilters?: boolean;
  /** When true, parent shows the only loader — do not stack another spinner here. */
  suppressBufferingLoader?: boolean;
  /** When true, top live hub button animates and is tappable. */
  hasActiveLives?: boolean;
  /**
   * When false, this item sits outside the "near active" scroll window —
   * no real video player/decoder is mounted, only a static thumbnail is
   * shown. Defaults to true so callers that don't pass it keep old behavior.
   */
  isNearActive?: boolean;
  /**
   * Measured pager page height from the parent list. When set, the cell and
   * media use this instead of window height so paging stays in sync with NativeTabs.
   */
  pageHeight?: number;
}

import { globalSplashFinished } from './AnimatedSplashScreen2';

const ProgressBar = ({ player, scrubPercent }: { player: any; scrubPercent: number | null }) => {
  const timeUpdate = useEvent(player, 'timeUpdate');
  const currentTime = timeUpdate?.currentTime ?? player?.currentTime ?? 0;
  const duration = Number(timeUpdate?.duration ?? player?.duration ?? 0);
  const livePercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const progressPercent =
    scrubPercent != null ? Math.max(0, Math.min(100, scrubPercent * 100)) : livePercent;
  return <View style={[styles.scrubberProgress, { width: `${progressPercent}%` }]} />;
};

function FeedItem({
  item,
  index = 0,
  isActive,
  isScreenFocused,
  isHomeScreen,
  activeFilter,
  onFilterSelect,
  hideTopRightIcons,
  hideHomeFilters,
  suppressBufferingLoader = false,
  hasActiveLives = false,
  isNearActive = true,
  pageHeight,
}: FeedItemProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const captionTextAlign = {
    textAlign: (isArabic ? 'right' : 'left') as 'left' | 'right',
    writingDirection: (isArabic ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
  };
  const router = useRouter();
  const playerPool = useFeedPlayerPoolOptional();
  const pooledPlayer = playerPool && isNearActive ? playerPool.getPlayerForIndex(index) : null;
  const pooledHasFirstFrame = playerPool ? playerPool.getHasFirstFrame(index) : false;
  // Re-read pool assignments when version bumps (slot recycle).
  const poolVersion = playerPool?.version ?? 0;
  void poolVersion;
  const insets = useSafeAreaInsets();
  // Pager cell must stay full page height (same as FlatList page). Video frame
  // alone is shortened so it ends above the floating tab bar.
  const cellHeight = typeof pageHeight === 'number' && pageHeight > 200 ? pageHeight : height;
  const usableHeight = isHomeScreen
    ? Math.max(200, cellHeight - getTabBarReservedHeight(insets.bottom))
    : cellHeight;

  // New backend directly exposes variants or hls_url
  const variants = item.postVariants || item.post_variants || item.postsFiles?.[0]?.variants || [];
  const postImages = Array.isArray(item?.images)
    ? item.images
    : Array.isArray(item?.postsFiles?.[0]?.images)
      ? item.postsFiles[0].images
      : [];
  const isImagePost = item?.type === 'image' || postImages.length > 0;
  const imageUrls = postImages
    .map((image: any) => {
      const url = image.url || image.path;
      return url && url.startsWith('http') ? url : null;
    })
    .filter(Boolean);
  const galleryUrls = imageUrls.length ? imageUrls : [item?.thumbnail_url].filter(Boolean);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const imageListRef = useRef<ScrollView>(null);
  const moveImage = (direction: number) => {
    const nextIndex = Math.max(0, Math.min(activeImageIndex + direction, galleryUrls.length - 1));
    setActiveImageIndex(nextIndex);
    imageListRef.current?.scrollTo({ x: nextIndex * width, animated: true });
  };
  const imageSwipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 40) moveImage(event.translationX < 0 ? 1 : -1);
    });
  const audioPlayer = useAudioPlayer(item?.audio?.url || null);
  useEffect(() => {
    if (isImagePost && isActive && isScreenFocused && item?.audio?.url) audioPlayer.play();
    else {
      audioPlayer.pause();
      audioPlayer.seekTo(0);
    }
  }, [audioPlayer, isImagePost, isActive, isScreenFocused, item?.audio?.url]);

  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showVideoOptions, setShowVideoOptions] = useState(false);
  const videoRef = useRef<any>(null);
  const [currentSpeed, setCurrentSpeed] = useState(1);

  const isModalOpen = showComments || showVideoOptions;

  const isVendorLive = Boolean(item.is_youtube_live || item.vendor?.is_youtube_live);
  const liveVideoId = item.youtube_video_id || item.vendor?.youtube_video_id || null;
  const profileImageUri =
    item.vendor?.logo ||
    item.user?.avatar ||
    item.user?.user_profile_image ||
    item.postedUserImageurl ||
    null;
  const shopName =
    item.vendor?.name || item.user?.name || item.user?.user_name || item.postedUserName || 'Shop';
  const vendorId = String(item.vendor?.id || item.vendor_id || item.user?.id || item.user_id || '');
  const activityTypeIconUri = getActivityTypeIconUri(item);
  const caption = getPostCaption(item);

  const openLiveOrShop = () => {
    if (isVendorLive && liveVideoId) {
      void openActiveLivesHub(router, {
        videoId: String(liveVideoId),
        vendorId,
        pauseFeed: true,
      });
      return;
    }

    router.push({
      pathname: '/shop/ShopDetailScreen',
      params: {
        shopName,
        vendor_id: vendorId,
      },
    });
  };

  // Live ring/badge animation lives in LiveProfileAvatar

  // Prioritize direct video URLs over HLS for faster initial load times
  const apiBase = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace(
    /\/api\/?$/,
    '',
  );
  const normalizeMediaUrl = (value: any): string => {
    if (!value || typeof value !== 'string') return '';
    if (value.startsWith('/')) return `${apiBase}${value}`;
    return value
      .replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/g, apiBase)
      .replace(/https?:\/\/soouq-live\.test/g, apiBase);
  };

  let videoUrl = resolvePlayableVideoUrl(item) || '';

  if (selectedQuality !== 'auto') {
    const selectedVariant = variants.find((v: any) => v.resolution === selectedQuality);
    if (selectedVariant?.path) {
      videoUrl = normalizeMediaUrl(selectedVariant.path);
    }
  }

  // Never fall back to a public dummy clip — empty/missing media stays black.
  const hasPlayableVideo = Boolean(videoUrl);
  // Native player comes from the 3-slot pool (replace, not remount).
  const shouldAttachPlayer = hasPlayableVideo && isNearActive && Boolean(pooledPlayer);

  const metadataDimensions = readVideoDimensionsFromItem(item);
  const hasKnownDims = metadataDimensions.width > 0 && metadataDimensions.height > 0;
  // Unknown dims: assume square so we don't stretch to fake 9:16 fullscreen.
  const videoAspectRatio = hasKnownDims ? metadataDimensions.height / metadataDimensions.width : 1;

  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isSplashDone, setIsSplashDone] = useState(globalSplashFinished);
  const [scrubberWidth, setScrubberWidth] = useState(0);
  const scrubberRef = useRef<View>(null);
  const scrubberLayoutRef = useRef({ x: 0, width: 0 });
  const playerSeekRef = useRef<any>(null);
  const [scrubPercent, setScrubPercent] = useState<number | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [hasFirstFrame, setHasFirstFrame] = useState(pooledHasFirstFrame);

  useEffect(() => {
    if (pooledHasFirstFrame) {
      setHasFirstFrame(true);
    }
  }, [pooledHasFirstFrame]);
  playerSeekRef.current = player;

  const onPlayerChange = useCallback((next: any | null) => {
    setPlayer(next);
  }, []);

  const onFirstFrameChange = useCallback((ready: boolean) => {
    setHasFirstFrame(ready);
  }, []);

  useEffect(() => {
    if (globalSplashFinished) {
      setIsSplashDone(true);
      return;
    }
    const { DeviceEventEmitter } = require('react-native');
    const listener = DeviceEventEmitter.addListener('splashFinished', () => {
      setIsSplashDone(true);
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    setHasFirstFrame(false);
  }, [videoUrl]);

  useEffect(() => {
    if (!isNearActive) {
      setHasFirstFrame(false);
      setPlayer(null);
    }
  }, [isNearActive]);

  const resolvedContentFit = resolveVideoContentFit(
    width,
    height,
    metadataDimensions.width,
    metadataDimensions.height,
  );
  const scaledVideoHeight = width * videoAspectRatio;
  // Small videos are centered in the usable area; videos as tall or taller
  // than the usable area are bottom-anchored to it (TikTok/Snapchat style),
  // so the frame always ends right above the tab bar instead of behind it.
  const contentTop =
    scaledVideoHeight >= usableHeight
      ? usableHeight - scaledVideoHeight
      : (usableHeight - scaledVideoHeight) / 2;
  const videoStyle =
    resolvedContentFit === 'cover'
      ? [styles.video, { height: usableHeight, top: 0 }]
      : [
          styles.video,
          { width, height: scaledVideoHeight, position: 'absolute' as const, top: contentTop },
        ];

  const thumbnailUrl =
    item.thumbnail_url ||
    item.thumbnail ||
    item.cover ||
    item.cover_url ||
    item.postsFiles?.[0]?.thumbnail ||
    item.postsFiles?.[0]?.thumbnail_url ||
    null;

  // Never reveal the native surface until a real frame exists — isPlaying alone
  // still shows a black textureView for ~200–500ms on Android.
  const showPosterCover = isActive && !item.is_youtube_live && !hasFirstFrame && !isManuallyPaused;

  const togglePlayPause = () => {
    setIsManuallyPaused(!isManuallyPaused);
  };

  const seekFromPageX = useCallback((pageX: number) => {
    const nextPlayer = playerSeekRef.current;
    const { x, width } = scrubberLayoutRef.current;
    if (!nextPlayer || width <= 0) {
      return null;
    }
    const duration = Number(nextPlayer.duration ?? 0);
    if (!(duration > 0) || !Number.isFinite(duration)) {
      return null;
    }
    const percent = Math.max(0, Math.min(1, (pageX - x) / width));
    try {
      nextPlayer.currentTime = percent * duration;
    } catch {
      // ignore seek races while source swaps
    }
    return percent;
  }, []);

  const refreshScrubberLayout = useCallback(() => {
    scrubberRef.current?.measureInWindow((x, _y, measuredWidth) => {
      if (measuredWidth > 0) {
        scrubberLayoutRef.current = { x, width: measuredWidth };
        setScrubberWidth(measuredWidth);
      }
    });
  }, []);

  const scrubberGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        // Vertical move → fail so FlatList paging still works.
        .failOffsetY([-8, 8])
        .hitSlop({ top: 14, bottom: 14 })
        .onBegin((event) => {
          refreshScrubberLayout();
          const percent = seekFromPageX(event.absoluteX);
          if (percent != null) {
            setScrubPercent(percent);
          }
        })
        .onUpdate((event) => {
          const percent = seekFromPageX(event.absoluteX);
          if (percent != null) {
            setScrubPercent(percent);
          }
        })
        .onFinalize(() => {
          setScrubPercent(null);
        }),
    [refreshScrubberLayout, seekFromPageX],
  );

  return (
    <>
      <TouchableWithoutFeedback
        onPress={isImagePost ? undefined : togglePlayPause}
        onLongPress={() => setShowVideoOptions(true)}
      >
        <View style={[styles.container, { height: cellHeight }]}>
          {isImagePost ? (
            <>
              <GestureDetector gesture={imageSwipe}>
                <ScrollView
                  ref={imageListRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={[styles.imageGallery, { height: cellHeight }]}
                  scrollEventThrottle={16}
                  onMomentumScrollEnd={(event) =>
                    setActiveImageIndex(Math.round(event.nativeEvent.contentOffset.x / width))
                  }
                >
                  {galleryUrls.map((uri: string, index: number) =>
                    Math.abs(index - activeImageIndex) <= 1 ? (
                      <Image
                        key={`${uri}-${index}`}
                        source={{ uri }}
                        style={[styles.imageSlide, { height: cellHeight }]}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View
                        key={`${uri}-${index}`}
                        style={[styles.imageSlide, { height: cellHeight, backgroundColor: '#000' }]}
                      />
                    ),
                  )}
                </ScrollView>
              </GestureDetector>
              {galleryUrls.length > 1 && (
                <View style={styles.imageDots} pointerEvents="none">
                  {galleryUrls.map((uri: string, index: number) => (
                    <View
                      key={`${uri}-dot-${index}`}
                      style={[styles.imageDot, index === activeImageIndex && styles.imageDotActive]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : item.is_youtube_live && item.youtube_video_id ? (
            <View
              style={[
                styles.video,
                styles.youtubeCover,
                { height: usableHeight },
                isModalOpen && styles.modalOpenVideo,
              ]}
              // Let the parent FlatList own vertical paging — WKWebView eats pans otherwise.
              pointerEvents="none"
            >
              <View
                style={{
                  position: 'absolute',
                  width: Math.ceil(cellHeight * 1.2 * (16 / 9)),
                  height: Math.ceil(cellHeight * 1.2),
                  left: (width - Math.ceil(cellHeight * 1.2 * (16 / 9))) / 2,
                  top: (usableHeight - Math.ceil(cellHeight * 1.2)) / 2,
                }}
              >
                <YoutubeIframe
                  height={Math.ceil(cellHeight * 1.2)}
                  width={Math.ceil(cellHeight * 1.2 * (16 / 9))}
                  videoId={item.youtube_video_id}
                  play={isActive && isScreenFocused && !isManuallyPaused}
                  initialPlayerParams={{
                    controls: false,
                    modestbranding: true,
                    rel: false,
                    iv_load_policy: 3,
                    preventFullScreen: true,
                  }}
                  webViewProps={{
                    allowsInlineMediaPlayback: true,
                    mediaPlaybackRequiresUserAction: false,
                    scrollEnabled: false,
                    bounces: false,
                    pointerEvents: 'none',
                    injectedJavaScriptBeforeContentLoadedForMainFrameOnly: false,
                    injectedJavaScriptForMainFrameOnly: false,
                    injectedJavaScriptBeforeContentLoaded: `
                      (function(){
                        if (window._soouqHideYtPlay) return;
                        window._soouqHideYtPlay = true;
                        var css = '.ytp-large-play-button,.ytp-cued-thumbnail-overlay,.ytp-play-button,.ytp-pause-overlay,[aria-label="Play"]{display:none!important;opacity:0!important;}video::-webkit-media-controls-start-playback-button{display:none!important;}';
                        function apply(){
                          try {
                            if (!document.getElementById('soouq-hide-yt-play')) {
                              var s=document.createElement('style'); s.id='soouq-hide-yt-play'; s.textContent=css;
                              (document.head||document.documentElement).appendChild(s);
                            }
                            document.querySelectorAll('.ytp-large-play-button,.ytp-cued-thumbnail-overlay,.ytp-play-button,button[aria-label="Play"]').forEach(function(el){ el.style.setProperty('display','none','important'); });
                          } catch(e) {}
                        }
                        apply();
                        try { new MutationObserver(apply).observe(document.documentElement||document,{childList:true,subtree:true}); } catch(e) {}
                      })();
                      true;
                    `,
                    style: { opacity: 0.99, backgroundColor: '#000' },
                  }}
                />
              </View>
              <View style={styles.youtubeChromeTop} pointerEvents="none" />
              <View style={styles.youtubeChromeBottom} pointerEvents="none" />
            </View>
          ) : hasPlayableVideo ? (
            <>
              {/* Always keep a poster under the native surface so fast scroll
                  never shows a black cell while the pooled player catches up. */}
              {thumbnailUrl ? (
                <Image
                  source={{ uri: thumbnailUrl }}
                  style={
                    resolvedContentFit === 'cover'
                      ? [styles.video, { height: usableHeight, top: 0 }]
                      : videoStyle
                  }
                  contentFit={resolvedContentFit}
                  cachePolicy="memory-disk"
                  priority="high"
                  recyclingKey={thumbnailUrl}
                />
              ) : (
                <View
                  style={
                    resolvedContentFit === 'cover'
                      ? [styles.video, { height: usableHeight, top: 0, backgroundColor: '#111' }]
                      : [videoStyle, { backgroundColor: '#111' }]
                  }
                />
              )}
              {shouldAttachPlayer && pooledPlayer ? (
                <FeedMountedVideo
                  player={pooledPlayer}
                  feedIndex={index}
                  videoUrl={videoUrl}
                  isActive={isActive}
                  isScreenFocused={isScreenFocused}
                  isManuallyPaused={isManuallyPaused}
                  isSplashDone={isSplashDone}
                  isHomeScreen={isHomeScreen}
                  videoStyle={videoStyle}
                  contentFit={resolvedContentFit}
                  isModalOpen={isModalOpen}
                  usableHeight={usableHeight}
                  thumbnailUrl={thumbnailUrl}
                  showPosterCover={showPosterCover}
                  hasPooledFirstFrame={pooledHasFirstFrame}
                  onPlayerChange={onPlayerChange}
                  onFirstFrameChange={onFirstFrameChange}
                  onPooledFirstFrame={playerPool!.markFirstFrame}
                  onPooledClearFirstFrame={playerPool!.clearFirstFrame}
                  videoViewRef={videoRef}
                />
              ) : null}
            </>
          ) : (
            <View style={[styles.video, { backgroundColor: '#000' }]} />
          )}

          <View
            style={[styles.overlay, isModalOpen && { display: 'none' }]}
            pointerEvents="box-none"
          >
            {!isImagePost && isManuallyPaused && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  right: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 999,
                }}
                pointerEvents="none"
              >
                <Ionicons name="play" color="rgba(255,255,255,0.7)" size={64} />
              </View>
            )}

            {/* Top Section */}
            {!hideTopRightIcons && (
              <View pointerEvents="box-none">
                <View style={styles.topLeftFixed} pointerEvents="box-none">
                  <Image
                    source={require('../../assets/images/logo-white.png')}
                    style={styles.logoImage}
                    contentFit="contain"
                  />
                </View>
                <View style={styles.topRightFixed} pointerEvents="box-none">
                  <LiveHubButton
                    size={48}
                    active={hasActiveLives}
                    onPress={() => {
                      if (!hasActiveLives) {
                        return;
                      }
                      void openActiveLivesHub(router, { pauseFeed: true });
                    }}
                  />
                </View>
              </View>
            )}

            {/* Side filters — right */}
            {isHomeScreen && !hideHomeFilters && (
              <View style={styles.sideFiltersFixed} pointerEvents="box-none">
                <View style={styles.leftColumn}>
                  <TouchableOpacity
                    style={[styles.iconCircle, activeFilter === 'shop' && styles.activeIconCircle]}
                    onPress={() => onFilterSelect && onFilterSelect('shop')}
                  >
                    <Ionicons
                      name="storefront"
                      color={activeFilter === 'shop' ? '#ff2c55' : '#fff'}
                      size={26}
                      style={styles.iconGlyph}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconCircle, activeFilter === 'user' && styles.activeIconCircle]}
                    onPress={() => onFilterSelect && onFilterSelect('user')}
                  >
                    <Ionicons
                      name="person"
                      color={activeFilter === 'user' ? '#ff2c55' : '#fff'}
                      size={26}
                      style={styles.iconGlyph}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconCircle, activeFilter === 'all' && styles.activeIconCircle]}
                    onPress={() => onFilterSelect && onFilterSelect('all')}
                  >
                    <Image
                      source={require('../../assets/icons/all-videos.png')}
                      style={{ width: 34, height: 34 }}
                      contentFit="contain"
                      tintColor={activeFilter === 'all' ? '#ff2c55' : '#fff'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Side actions — left */}
            <View style={styles.sideActionsFixed} pointerEvents="box-none">
              <View style={styles.rightColumn}>
                <TouchableOpacity onPress={openLiveOrShop} style={{ overflow: 'visible' }}>
                  <View style={styles.profileContainer}>
                    <LiveProfileAvatar uri={profileImageUri} size={54} isLive={isVendorLive} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => setShowComments(true)}>
                  <View style={styles.actionIconBackground}>
                    <Image
                      source={require('../../assets/images/message.png')}
                      style={{ width: 30, height: 30 }}
                      tintColor="#fff"
                      contentFit="contain"
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() =>
                    router.push({
                      pathname: getVendorMenuPath(item.vendor),
                      params: {
                        shopName: item.vendor?.name,
                        vendor_id: String(item.vendor?.id || item.vendor_id || ''),
                      },
                    })
                  }
                >
                  <View style={styles.giftIconContainer}>
                    {activityTypeIconUri ? (
                      <Image
                        source={{ uri: activityTypeIconUri }}
                        style={styles.activityTypeImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <Ionicons name="gift" color="#fff" size={28} style={styles.iconGlyph} />
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                  <View style={styles.shareIconBackground}>
                    <Image
                      source={require('../../assets/images/share.png')}
                      style={styles.shareImage}
                      tintColor="#fff"
                      contentFit="contain"
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.55)']}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: Platform.isPad ? 130 : 96,
                zIndex: 15,
              }}
              pointerEvents="none"
            />

            {/* Bottom Overlay (Text + Scrubber) — anchored to video bottom / above tab bar */}
            <View
              style={[
                styles.bottomOverlayContainer,
                { bottom: isHomeScreen ? getTabBarReservedHeight(insets.bottom) : 0 },
              ]}
              pointerEvents="box-none"
            >
              <View style={styles.bottomSection} pointerEvents="box-none">
                <Text style={[styles.titleText, captionTextAlign]}>
                  <Text style={{ fontWeight: 'bold' }}>{shopName}</Text>{' '}
                  <Text style={{ fontWeight: '300', fontSize: 14 }}>
                    {formatPostDate(item.created_at || item.postCreatedAt)}
                  </Text>
                </Text>
                {!!caption && (
                  <Text style={[styles.subtitleText, captionTextAlign]} numberOfLines={2}>
                    {caption}
                  </Text>
                )}
              </View>

              {/* Scrubber sits on the video's bottom edge */}
              <GestureDetector gesture={scrubberGesture}>
                <View
                  ref={scrubberRef}
                  style={styles.scrubberWrapper}
                  collapsable={false}
                  onLayout={(e) => {
                    const layoutWidth = e.nativeEvent.layout.width;
                    if (layoutWidth > 0) {
                      setScrubberWidth(layoutWidth);
                    }
                    requestAnimationFrame(refreshScrubberLayout);
                  }}
                  onStartShouldSetResponder={() => true}
                >
                  <View style={styles.scrubberContainer}>
                    <View style={styles.scrubberBar}>
                      {isActive && player ? (
                        <ProgressBar player={player} scrubPercent={scrubPercent} />
                      ) : (
                        <View style={[styles.scrubberProgress, { width: '0%' }]} />
                      )}
                    </View>
                  </View>
                </View>
              </GestureDetector>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>

      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        postId={Number(item.id ?? item.postId) || 0}
      />

      <VideoOptionsModal
        visible={showVideoOptions}
        onClose={() => setShowVideoOptions(false)}
        postId={Number(item.id ?? item.postId) || 0}
        downloadUrl={getPostDownloadUrl(item)}
        isDownloadable={item?.is_downloadable !== false && item?.isDownloadable !== false}
        currentSpeed={currentSpeed}
        onSpeed={(speed) => {
          setCurrentSpeed(speed);
          if (player) {
            player.playbackRate = speed;
          }
        }}
        onPiP={() => {
          videoRef.current
            ?.startPictureInPicture()
            ?.catch((e: any) => console.log('PiP not supported', e));
        }}
        variants={variants}
        selectedQuality={selectedQuality}
        onSelectQuality={setSelectedQuality}
      />
    </>
  );
}

function areEqual(prev: FeedItemProps, next: FeedItemProps) {
  return (
    (prev.item?.id ?? prev.item?.postId) === (next.item?.id ?? next.item?.postId) &&
    prev.index === next.index &&
    prev.isActive === next.isActive &&
    prev.isScreenFocused === next.isScreenFocused &&
    prev.isNearActive === next.isNearActive &&
    prev.isHomeScreen === next.isHomeScreen &&
    prev.pageHeight === next.pageHeight &&
    prev.activeFilter === next.activeFilter &&
    prev.hideTopRightIcons === next.hideTopRightIcons &&
    prev.hideHomeFilters === next.hideHomeFilters &&
    prev.suppressBufferingLoader === next.suppressBufferingLoader &&
    prev.hasActiveLives === next.hasActiveLives &&
    prev.onFilterSelect === next.onFilterSelect
  );
}

export default memo(FeedItem, areEqual);

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: '#000',
    overflow: 'hidden',
    // Keep feed chrome on fixed physical sides in Arabic/English.
    direction: 'ltr',
    ...(Platform.isPad && {
      maxWidth: 600,
      alignSelf: 'center',
    }),
  },
  video: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#000',
  },
  imageGallery: {
    width,
    height,
  },
  imageSlide: {
    width,
    height,
  },
  // Keep the dots above the title and its optional two-line description.
  imageDots: {
    position: 'absolute',
    bottom: 155,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    zIndex: 25,
  },
  imageDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  imageDotActive: { width: 18, backgroundColor: '#fff' },
  youtubeCover: {
    overflow: 'hidden',
    justifyContent: 'center',
  },
  youtubeChromeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#000',
    zIndex: 2,
  },
  youtubeChromeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#000',
    zIndex: 2,
  },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 20,
  },
  videoLoadingThumbnail: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },
  videoLoadingSpinner: {
    zIndex: 21,
  },
  videoHiddenUntilReady: {
    opacity: 0,
  },
  modalOpenVideo: {
    height: height * 0.35,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#000',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 10,
    justifyContent: 'space-between',
    direction: 'ltr',
  },
  logoFixed: {
    position: 'absolute',
    top: 52,
    left: 8,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 120,
    height: 30,
  },
  topLeftFixed: {
    position: 'absolute',
    top: 52,
    left: 6,
    height: 70,
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
    overflow: 'visible',
  },
  topRightFixed: {
    position: 'absolute',
    top: 52,
    right: 6,
    width: 56,
    zIndex: 20,
    alignItems: 'center',
    overflow: 'visible',
  },
  leftFiltersFixed: {
    position: 'absolute',
    top: 120,
    left: 8,
    zIndex: 20,
    alignItems: 'center',
  },
  sideFiltersFixed: {
    position: 'absolute',
    top: 120,
    right: 6,
    width: 56,
    zIndex: 20,
    alignItems: 'center',
  },
  rightActionsFixed: {
    position: 'absolute',
    right: 6,
    bottom: Platform.isPad ? 240 : 195,
    zIndex: 20,
  },
  sideActionsFixed: {
    position: 'absolute',
    left: 6,
    bottom: Platform.isPad ? 240 : 195,
    width: 56,
    zIndex: 20,
    alignItems: 'center',
  },
  topSection: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    direction: 'ltr',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topRightIcons: {
    alignItems: 'center',
    gap: 10,
    overflow: 'visible',
  },
  iconCircle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.7,
    shadowRadius: 2.5,
    elevation: 6,
  },
  activeIconCircle: {
    backgroundColor: 'transparent',
  },
  iconGlyph: {
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  leftColumnContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    direction: 'ltr',
    zIndex: 20,
  },
  leftColumn: {
    alignItems: 'center',
  },
  rightColumnContainer: {
    position: 'absolute',
    bottom: Platform.isPad ? 240 : 195,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    direction: 'ltr',
    zIndex: 20,
    overflow: 'visible',
  },
  rightColumn: {
    alignItems: 'center',
    gap: 11,
    overflow: 'visible',
    paddingHorizontal: 2,
  },
  profileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    marginBottom: 4,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#A020F0',
  },
  followButton: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#ff2c55',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadgeContainer: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#ff0000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconBackground: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.7,
    shadowRadius: 2.5,
    elevation: 6,
  },
  shareIconBackground: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.7,
    shadowRadius: 2.5,
    elevation: 6,
  },
  shareImage: {
    width: 38,
    height: 38,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  giftIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.7,
    shadowRadius: 2.5,
    elevation: 6,
  },
  activityTypeImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  bottomOverlayContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    justifyContent: 'flex-end',
  },
  bottomSection: {
    paddingHorizontal: 20,
    marginBottom: 0,
    alignItems: 'flex-start',
  },
  titleText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
    textAlign: 'left',
    writingDirection: 'ltr',
    width: '100%',
  },
  subtitleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
    textAlign: 'left',
    writingDirection: 'ltr',
    width: '100%',
  },
  scrubberWrapper: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    direction: 'ltr',
    zIndex: 30,
  },
  scrubberContainer: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  scrubberBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  scrubberProgress: {
    height: '100%',
    backgroundColor: '#fff',
  },
});
