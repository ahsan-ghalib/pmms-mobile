import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  DeviceEventEmitter,
  Dimensions,
  Easing,
  Platform,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { SoouqNativeFeedView, type NativeFeedItem } from '../../modules/soouq-native-feed';
import { getPostDownloadUrl, getPostThumbnailUrl, getPostVideoUrl } from '../utils/feedFilterCache';
import {
  isPreferLocalPlayback,
  prefetchFeedDiskWindow,
  resolvePlayableVideoUrl,
  subscribeFeedVideoCache,
} from '../utils/feedVideoDiskCache';
import { readVideoDimensionsFromItem } from '../utils/videoContentFit';
import { getActivityTypeIconUri, getVendorMenuPath } from '../utils/vendor';
import CommentsModal, { COMMENTS_SHEET_HEIGHT_RATIO } from './CommentsModal';
import VideoOptionsModal from './VideoOptionsModal';
import { LiveProfileAvatar } from './LiveProfileAvatar';
import { LiveHubButton } from './LiveHubButton';
import { openActiveLivesHub } from '../utils/openActiveLivesHub';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { addPauseFeedVideosListener, pauseFeedVideos } from '../utils/feedVideoPlayback';
import { getPostCaption } from '../utils/postCaption';
import { globalSplashFinished } from './AnimatedSplashScreen2';

// While the comments sheet is up the player keeps playing as a TikTok-style
// mini window: a centred box that starts below the status bar and runs down to
// the sheet, instead of a cropped full-width strip.
const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');
const COMPACT_TOP_MARGIN = WINDOW_HEIGHT * 0.06;
const COMPACT_MEDIA_HEIGHT = WINDOW_HEIGHT * (1 - COMMENTS_SHEET_HEIGHT_RATIO) - COMPACT_TOP_MARGIN;
const COMPACT_FEED_WIDTH = COMPACT_MEDIA_HEIGHT * 0.8;
/** Matches the comments sheet slide, so player and sheet move as one gesture. */
const COMPACT_ANIM_DURATION = 300;

function formatPostDate(value?: string) {
  if (!value) return '';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('D MMMM, YYYY') : value;
}

type Props = {
  posts: any[];
  paused?: boolean;
  /** When true, force mute — used while the home refresh cover spinner is up. */
  coverLoading?: boolean;
  activeIndex?: number;
  hasActiveLives?: boolean;
  activeFilter?: 'shop' | 'user' | 'all';
  onFilterSelect?: (filter: 'shop' | 'user' | 'all') => void;
  onActiveIndexChange?: (index: number, id: string) => void;
  onEndReached?: () => void;
  onItemPress?: (index: number, id: string) => void;
  /** Discover player — hide logo + LiveHub (home keeps them). */
  hideTopIcons?: boolean;
};

function normalizeMediaUrl(value: string): string {
  const apiBase = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace(
    /\/api\/?$/,
    '',
  );
  let url = value;
  if (url.startsWith('/')) url = `${apiBase}${url}`;
  return url
    .replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/g, apiBase)
    .replace(/https?:\/\/soouq-live\.test/g, apiBase);
}

function extractVariants(post: any): any[] {
  return post?.postVariants || post?.post_variants || post?.postsFiles?.[0]?.variants || [];
}

function extractImageUrls(post: any): string[] {
  const postImages = Array.isArray(post?.images)
    ? post.images
    : Array.isArray(post?.postsFiles?.[0]?.images)
      ? post.postsFiles[0].images
      : [];

  const fromGallery = postImages
    .map((image: any) => {
      if (typeof image === 'string') return image;
      const url = image?.url || image?.path || image?.file || null;
      return typeof url === 'string' && url.startsWith('http') ? url : null;
    })
    .filter(Boolean) as string[];

  if (fromGallery.length > 0) return fromGallery;

  const thumb = getPostThumbnailUrl(post);
  return thumb ? [thumb] : [];
}

function resolveVideoUrl(
  post: any,
  selectedQuality: string,
  qualityTargetId: string | null,
): string | null {
  const id = String(post?.postId ?? post?.id ?? '');
  let videoUrl = getPostVideoUrl(post);

  if (selectedQuality !== 'auto' && qualityTargetId && id === qualityTargetId) {
    const variants = extractVariants(post);
    const selectedVariant = variants.find((v: any) => v.resolution === selectedQuality);
    if (selectedVariant?.path) {
      videoUrl = normalizeMediaUrl(String(selectedVariant.path));
    }
  }

  return videoUrl;
}

function postMeta(post: any | null) {
  return {
    isVendorLive: Boolean(post?.is_youtube_live || post?.vendor?.is_youtube_live),
    liveVideoId: post?.youtube_video_id || post?.vendor?.youtube_video_id || null,
    profileImageUri:
      post?.vendor?.logo ||
      post?.user?.avatar ||
      post?.user?.user_profile_image ||
      post?.postedUserImageurl ||
      null,
    shopName:
      post?.vendor?.name ||
      post?.user?.name ||
      post?.user?.user_name ||
      post?.postedUserName ||
      'Shop',
    vendorId: String(post?.vendor?.id || post?.vendor_id || post?.user?.id || post?.user_id || ''),
    caption: getPostCaption(post),
  };
}

export function postsToNativeFeedItems(
  posts: any[],
  selectedQuality: string = 'auto',
  qualityTargetId: string | null = null,
): NativeFeedItem[] {
  return posts.map((post, index) => {
    const id = String(post?.postId ?? post?.id ?? index);

    // YouTube live is NEVER played in the home feed — avatar/live hub
    // redirects to LiveVendorsScreen. Keep the post's normal video/image media.
    const audioRaw = post?.audio?.url || post?.audio_url || null;
    const audioUrl =
      typeof audioRaw === 'string' && audioRaw.length > 0 ? normalizeMediaUrl(audioRaw) : null;

    const videoUrl =
      resolvePlayableVideoUrl(post) ||
      (isPreferLocalPlayback() ? null : resolveVideoUrl(post, selectedQuality, qualityTargetId));
    const imageUrls = extractImageUrls(post);
    const isImage = post?.type === 'image' || (!videoUrl && imageUrls.length > 0);
    const dims = isImage ? { width: 0, height: 0 } : readVideoDimensionsFromItem(post);

    const thumbnailUrl =
      (isImage
        ? imageUrls[0] || getPostThumbnailUrl(post)
        : getPostThumbnailUrl(post) || imageUrls[0]) || null;

    return {
      id,
      videoUrl: isImage ? undefined : (videoUrl ?? undefined),
      thumbnailUrl: thumbnailUrl ?? undefined,
      imageUrls: isImage ? imageUrls : [],
      mediaType: isImage ? 'image' : 'video',
      audioUrl: isImage ? (audioUrl ?? undefined) : undefined,
      youtubeVideoId: undefined,
      videoWidth: dims.width > 0 ? dims.width : undefined,
      videoHeight: dims.height > 0 ? dims.height : undefined,
    };
  });
}

function itemsSignature(items: NativeFeedItem[]): string {
  return items
    .map(
      (item) =>
        `${item.id}:${item.mediaType}:${item.videoUrl ?? ''}:${item.thumbnailUrl ?? ''}:${(item.imageUrls ?? []).join(',')}:${item.audioUrl ?? ''}:${item.youtubeVideoId ?? ''}:${item.videoWidth ?? 0}x${item.videoHeight ?? 0}`,
    )
    .join('|');
}

type PageChromeProps = {
  post: any | null;
  pageIndex: number;
  pageHeight: number;
  scrollY: Animated.Value;
  /** Matches native media bottom — captions sit above scrubber / tab bar. */
  bottomInset: number;
  hasActiveLives: boolean;
  activeFilter: 'shop' | 'user' | 'all';
  onFilterSelect?: (filter: 'shop' | 'user' | 'all') => void;
  onOpenComments: () => void;
  onOpenLiveHub: () => void;
  onOpenLiveOrShop: () => void;
  onOpenVendorMenu: () => void;
  onShare: () => void;
  hideTopIcons?: boolean;
};

function FeedPageChrome({
  post,
  pageIndex,
  pageHeight,
  scrollY,
  bottomInset,
  hasActiveLives,
  activeFilter,
  onFilterSelect,
  onOpenComments,
  onOpenLiveHub,
  onOpenLiveOrShop,
  onOpenVendorMenu,
  onShare,
  hideTopIcons = false,
}: PageChromeProps) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const captionTextAlign = {
    textAlign: (isArabic ? 'right' : 'left') as 'left' | 'right',
    writingDirection: (isArabic ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
  };
  const meta = postMeta(post);
  const activityTypeIconUri = useMemo(() => getActivityTypeIconUri(post), [post]);
  const translateY = useMemo(() => {
    if (pageHeight <= 0) {
      return new Animated.Value(pageIndex === 0 ? 0 : 9999);
    }
    // pageIndex * pageH - scrollY — continuous with the native pager (no setState).
    return Animated.subtract(pageIndex * pageHeight, scrollY);
  }, [pageIndex, pageHeight, scrollY]);

  // Explicit height — the Expo host view gives RN children a width but no
  // height, so `bottom:`-anchored icons resolve against a 0-height box.
  // Memoized so parent re-renders don't re-apply layout every frame.
  const chromeStyle = useMemo(
    () => [styles.pageChrome, { height: pageHeight, transform: [{ translateY }] }],
    [pageHeight, translateY],
  );

  return (
    <Animated.View style={chromeStyle} pointerEvents="box-none" collapsable={false}>
      {!hideTopIcons ? (
        <>
          <View style={styles.topLeft} pointerEvents="box-none">
            <Image
              source={require('../../assets/images/logo-white.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>
          <View style={styles.topRight} pointerEvents="box-none">
            <LiveHubButton size={48} active={hasActiveLives} onPress={onOpenLiveHub} />
          </View>
        </>
      ) : null}

      {onFilterSelect ? (
        <View style={styles.sideFilters} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.iconCircle, activeFilter === 'shop' && styles.activeIconCircle]}
            onPress={() => onFilterSelect('shop')}
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
            onPress={() => onFilterSelect('user')}
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
            onPress={() => onFilterSelect('all')}
          >
            <Image
              source={require('../../assets/icons/all-videos.png')}
              style={styles.filterGlyph}
              contentFit="contain"
              tintColor={activeFilter === 'all' ? '#ff2c55' : '#fff'}
            />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.sideActions} pointerEvents="box-none">
        <TouchableOpacity onPress={onOpenLiveOrShop} style={styles.profileWrap}>
          <LiveProfileAvatar uri={meta.profileImageUri} size={54} isLive={meta.isVendorLive} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onOpenComments}>
          <View style={styles.actionIconBackground}>
            <Image
              source={require('../../assets/images/message.png')}
              style={styles.actionImage}
              tintColor="#fff"
              contentFit="contain"
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onOpenVendorMenu}>
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

        <TouchableOpacity style={styles.actionButton} onPress={onShare}>
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

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        style={[styles.bottomGradient, { bottom: bottomInset }]}
        pointerEvents="none"
      />

      <View style={[styles.bottomOverlay, { bottom: bottomInset }]} pointerEvents="box-none">
        <View style={styles.bottomSection} pointerEvents="box-none">
          <Text style={[styles.titleText, captionTextAlign]}>
            <Text style={{ fontWeight: 'bold' }}>{meta.shopName}</Text>{' '}
            <Text style={{ fontWeight: '300', fontSize: 14 }}>
              {formatPostDate(post?.created_at || post?.postCreatedAt)}
            </Text>
          </Text>
          {!!meta.caption && (
            <Text style={[styles.subtitleText, captionTextAlign]} numberOfLines={2}>
              {meta.caption}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Thin RN host around the iOS UICollectionView + AVPlayer pool.
 * Dual page chrome scrolls with each feed item (RN FeedItem style) — no flash on settle.
 */
export default function NativeHomeFeed({
  posts,
  paused = false,
  coverLoading = false,
  activeIndex,
  hasActiveLives = false,
  activeFilter = 'all',
  onFilterSelect,
  onActiveIndexChange,
  onEndReached,
  onItemPress,
  hideTopIcons = false,
}: Props) {
  const router = useRouter();
  const cachedItemsRef = useRef<NativeFeedItem[]>([]);
  const cachedSigRef = useRef('');
  const endReachedLock = useRef(false);
  const pageHeightRef = useRef(0);
  const chromeScrollY = useRef(new Animated.Value(0)).current;
  const [pageHeight, setPageHeight] = useState(0);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [splashDone, setSplashDone] = useState(globalSplashFinished);
  const [eventPaused, setEventPaused] = useState(false);
  const [localActiveIndex, setLocalActiveIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  // Stays true through the expand animation, after the sheet itself is gone.
  const [compactActive, setCompactActive] = useState(false);
  const compactAnim = useRef(new Animated.Value(0)).current;
  const commentsOpenRef = useRef(false);
  const muted = false;
  // RN FeedItem parity: long press options sheet (speed / quality / PiP).
  const [showVideoOptions, setShowVideoOptions] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [qualityTargetId, setQualityTargetId] = useState<string | null>(null);
  const [pipRequested, setPipRequested] = useState(false);
  // Options sheet toggles: distraction-free chrome + end-of-video paging.
  const [clearDisplay, setClearDisplay] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [cacheEpoch, setCacheEpoch] = useState(0);

  // `startPictureInPicture` is edge-triggered on the native side.
  useEffect(() => {
    if (!pipRequested) return;
    const timer = setTimeout(() => setPipRequested(false), 60);
    return () => clearTimeout(timer);
  }, [pipRequested]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const nextActive = next === 'active';
      setAppActive(nextActive);
      if (!nextActive) {
        setPipRequested(true);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = addPauseFeedVideosListener(() => {
      setEventPaused(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (globalSplashFinished) {
      setSplashDone(true);
      return;
    }
    const sub = DeviceEventEmitter.addListener('splashFinished', () => {
      setSplashDone(true);
    });
    return () => sub.remove();
  }, []);

  // Parent resumed (screen focused again) — clear event pause latch.
  useEffect(() => {
    if (!paused) {
      setEventPaused(false);
    }
  }, [paused]);

  // Filter/home skeleton cover calls pauseFeedVideos while `paused` may never
  // flip (hard-pause set+cleared in the same tick). Clear the latch when the
  // cover drops so the new clip can play — but never while the parent still
  // wants the feed paused (Profile / login / other tabs).
  useEffect(() => {
    if (!coverLoading && !paused) {
      setEventPaused(false);
    }
  }, [coverLoading, paused]);

  useEffect(() => {
    if (typeof activeIndex === 'number') {
      setLocalActiveIndex(activeIndex);
      const h = pageHeightRef.current;
      if (h > 200) {
        chromeScrollY.setValue(activeIndex * h);
      } else {
        chromeScrollY.setValue(0);
      }
    }
  }, [activeIndex, chromeScrollY]);

  useEffect(() => subscribeFeedVideoCache(() => setCacheEpoch((value) => value + 1)), []);

  useEffect(() => {
    if (!posts.length) {
      return;
    }
    prefetchFeedDiskWindow(posts, localActiveIndex).catch(() => {});
  }, [posts, localActiveIndex]);

  const items = useMemo(() => {
    const next = postsToNativeFeedItems(posts, selectedQuality, qualityTargetId);
    const sig = itemsSignature(next);
    if (sig === cachedSigRef.current) {
      return cachedItemsRef.current;
    }
    cachedSigRef.current = sig;
    cachedItemsRef.current = next;
    return next;
  }, [posts, selectedQuality, qualityTargetId, cacheEpoch]);

  const itemsJson = useMemo(() => JSON.stringify(items), [items]);

  // Splash used to wait for a playing first frame — cached clips then audibly
  // started under the overlay. Signal "content is mounted" instead; playback
  // stays paused until splashFinished.
  useEffect(() => {
    if (splashDone || items.length === 0) {
      return;
    }
    DeviceEventEmitter.emit('firstVideoReady');
  }, [items.length, splashDone]);

  // New filter feed — drop the pause latch so the opening clip can warm under
  // the skeleton and emit firstVideoReady (paused prop often never flips).
  // Keep the latch if the parent is still paused (left Home / logged out).
  useEffect(() => {
    if (!paused) {
      setEventPaused(false);
    }
  }, [itemsJson, paused]);
  const activePost = posts[localActiveIndex] ?? posts[0] ?? null;
  // Prefer real DB `id` — `postId` can be a synthetic feed key (e.g. live_*).
  const activePostId = (() => {
    const raw = activePost?.id ?? activePost?.postId;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  })();

  // Neither sheet pauses — PiP only starts from a playing player, and RN
  // FeedItem kept the video running (shrunk) behind the comments sheet too.
  const activeIsVideo =
    items[localActiveIndex]?.mediaType === 'video' && Boolean(items[localActiveIndex]?.videoUrl);
  // Keep the focused clip playing through minimize so system PiP can attach.
  // Image / soundtrack posts still pause when the app leaves the foreground.
  const effectivePaused = paused || eventPaused || !splashDone || (!appActive && !activeIsVideo);
  // Clearance to the top of the floating NativeTabs pill (+ small breathing gap).
  // Scrubber overlays the media bottom, so this only reserves the tab-bar band.
  const bottomInset = Platform.OS === 'android' ? 80 : Platform.isPad ? 110 : 80;
  // Keep logo / filters / LiveHub visible during buffer cover — only hide for sheets.
  const chromeHidden = showComments || showVideoOptions || clearDisplay;
  const activeVariants = useMemo(() => extractVariants(activePost), [activePost]);

  const handleActiveIndexChange = useCallback(
    (index: number, id: string) => {
      setLocalActiveIndex(index);
      onActiveIndexChange?.(index, id);
    },
    [onActiveIndexChange],
  );

  const openComments = useCallback(() => {
    commentsOpenRef.current = true;
    setCompactActive(true);
    setShowComments(true);
    Animated.timing(compactAnim, {
      toValue: 1,
      duration: COMPACT_ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [compactAnim]);

  // Fired as the sheet starts sliding away, so the player grows back in step
  // with it rather than snapping once the sheet is already gone.
  const expandFromComments = useCallback(() => {
    Animated.timing(compactAnim, {
      toValue: 0,
      duration: COMPACT_ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      // Always restore full-screen host — interrupted anims used to leave the
      // feed shrunk (wrong page height) so the next swipe hung.
      commentsOpenRef.current = false;
      setCompactActive(false);
      compactAnim.setValue(0);
    });
  }, [compactAnim]);

  const closeComments = useCallback(() => {
    setShowComments(false);
  }, []);

  // If the sheet closes without onDismissStart (or the expand anim is
  // interrupted), force the player back to full-screen so paging geometry
  // and hit-testing stay correct.
  useEffect(() => {
    if (showComments) {
      return;
    }
    if (!compactActive && !commentsOpenRef.current) {
      return;
    }
    compactAnim.stopAnimation();
    compactAnim.setValue(0);
    commentsOpenRef.current = false;
    setCompactActive(false);
  }, [showComments, compactActive, compactAnim]);

  const handleScrollOffsetChange = useCallback(
    (offsetY: number, viewportHeight: number, _index: number) => {
      // The comments sheet shrinks the native feed, so its viewport/offset stop
      // describing full-screen pages. Chrome keeps the geometry it already has.
      if (commentsOpenRef.current) return;
      const h = viewportHeight > 200 ? viewportHeight : pageHeightRef.current;
      // Only adopt the first solid viewport — resizing pageHeight mid-scroll
      // reflows native bounds and freezes paging after the first swipe.
      if (h > 200 && pageHeightRef.current < 200) {
        pageHeightRef.current = h;
        setPageHeight(h);
      }
      if (!Number.isFinite(offsetY)) return;
      // No React setState on scroll — only drive the shared Animated offset.
      chromeScrollY.setValue(Math.max(0, offsetY));
      void _index;
    },
    [chromeScrollY],
  );

  const openLiveHub = useCallback(() => {
    if (!hasActiveLives) {
      return;
    }
    void openActiveLivesHub(router, { pauseFeed: true });
  }, [hasActiveLives, router]);

  const openLiveOrShopFor = useCallback(
    (post: any | null) => {
      const meta = postMeta(post);
      if (meta.isVendorLive && meta.liveVideoId) {
        void openActiveLivesHub(router, {
          videoId: String(meta.liveVideoId),
          vendorId: meta.vendorId,
          pauseFeed: true,
        });
        return;
      }
      pauseFeedVideos();
      router.push({
        pathname: '/shop/ShopDetailScreen',
        params: {
          shopName: meta.shopName,
          vendor_id: meta.vendorId,
        },
      });
    },
    [router],
  );

  const openVendorMenuFor = useCallback(
    (post: any | null) => {
      const meta = postMeta(post);
      pauseFeedVideos();
      router.push({
        pathname: getVendorMenuPath(post?.vendor),
        params: {
          shopName: post?.vendor?.name || meta.shopName,
          vendor_id: String(post?.vendor?.id || post?.vendor_id || meta.vendorId),
        },
      });
    },
    [router],
  );

  const sharePostFor = useCallback(async (post: any | null) => {
    const meta = postMeta(post);
    try {
      await Share.share({
        message: `${meta.shopName}${meta.caption ? `\n${meta.caption}` : ''}`.trim(),
      });
    } catch {
      // ignore cancel
    }
  }, []);

  // Window around focused page — mounts/unmounts only on activeIndex change, not per scroll tick.
  const chromePages = useMemo(() => {
    const pages: number[] = [];
    for (let i = localActiveIndex - 1; i <= localActiveIndex + 1; i += 1) {
      if (i >= 0 && i < posts.length) pages.push(i);
    }
    return pages.length > 0 ? pages : posts.length > 0 ? [0] : [];
  }, [localActiveIndex, posts.length]);

  // Scrubber overlays the media bottom; host only needs tab-bar clearance.
  const compactHostHeight = COMPACT_MEDIA_HEIGHT + Math.max(8, bottomInset);

  const compactSizeStyle = useMemo(() => {
    const fullHeight = pageHeight > 200 ? pageHeight : WINDOW_HEIGHT;
    return {
      width: compactAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [WINDOW_WIDTH, COMPACT_FEED_WIDTH],
      }),
      height: compactAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [fullHeight, compactHostHeight],
      }),
      marginTop: compactAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, COMPACT_TOP_MARGIN],
      }),
    };
  }, [compactAnim, compactHostHeight, pageHeight]);

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { height } = e.nativeEvent.layout;
        if (height > 200) {
          pageHeightRef.current = height;
          setPageHeight((prev) => (prev === height ? prev : height));
        }
      }}
    >
      {/* The native view just fills this box; animating the RN wrapper keeps
          Animated away from the Expo view's own props. */}
      <Animated.View
        style={compactActive ? [styles.feedBoxCompact, compactSizeStyle] : styles.feedBox}
      >
        <SoouqNativeFeedView
          style={styles.feed}
          items={items}
          itemsJson={itemsJson}
          paused={effectivePaused}
          muted={muted || coverLoading || !splashDone}
          playbackRate={currentSpeed}
          bottomInset={bottomInset}
          startPictureInPicture={pipRequested}
          autoScroll={autoScroll}
          clearDisplay={clearDisplay}
          {...(typeof activeIndex === 'number' ? { activeIndex } : {})}
          onActiveIndexChange={(event) => {
            handleActiveIndexChange(event.nativeEvent.index, event.nativeEvent.id);
          }}
          onEndReached={() => {
            if (endReachedLock.current) return;
            endReachedLock.current = true;
            onEndReached?.();
            setTimeout(() => {
              endReachedLock.current = false;
            }, 800);
          }}
          onItemPress={(event) => {
            // First tap out of clear display only restores the chrome; native
            // skips its play/pause toggle for exactly this press.
            if (clearDisplay) {
              setClearDisplay(false);
              return;
            }
            onItemPress?.(event.nativeEvent.index, event.nativeEvent.id);
          }}
          onItemLongPress={() => {
            setShowVideoOptions(true);
          }}
          onScrollOffsetChange={(event) => {
            const { offsetY, viewportHeight, index } = event.nativeEvent;
            handleScrollOffsetChange(offsetY, viewportHeight, index);
          }}
          onFirstFrame={() => {
            // Home uses this to drop the filter-switch thumbnail cover.
            DeviceEventEmitter.emit('firstVideoReady');
          }}
        >
          {/* Must be children of the Expo view — Fabric draws Expo UIViews above RN siblings.
              Always mounted: unmounting a direct child of the Expo view is what made
              Fabric throw "unmount a view which has a different index". Hide instead. */}
          <View
            style={[styles.overlay, chromeHidden && styles.overlayHidden]}
            pointerEvents={chromeHidden ? 'none' : 'box-none'}
            collapsable={false}
          >
            {chromePages.map((page) => {
              const post = posts[page] ?? null;
              return (
                <FeedPageChrome
                  key={String(post?.postId ?? post?.id ?? page)}
                  post={post}
                  pageIndex={page}
                  pageHeight={pageHeight}
                  scrollY={chromeScrollY}
                  bottomInset={bottomInset}
                  hasActiveLives={hasActiveLives}
                  activeFilter={activeFilter}
                  onFilterSelect={onFilterSelect}
                  onOpenComments={openComments}
                  onOpenLiveHub={openLiveHub}
                  onOpenLiveOrShop={() => openLiveOrShopFor(post)}
                  onOpenVendorMenu={() => openVendorMenuFor(post)}
                  onShare={() => sharePostFor(post)}
                  hideTopIcons={hideTopIcons}
                />
              );
            })}
          </View>
          {/* Cover UI lives in a Modal from HomeScreen — Expo children get height 0 / clip. */}
        </SoouqNativeFeedView>
      </Animated.View>

      <CommentsModal
        visible={showComments}
        onClose={closeComments}
        onDismissStart={expandFromComments}
        postId={activePostId}
      />

      <VideoOptionsModal
        visible={showVideoOptions}
        onClose={() => setShowVideoOptions(false)}
        postId={activePostId}
        downloadUrl={getPostDownloadUrl(activePost)}
        isDownloadable={
          activePost?.is_downloadable !== false && activePost?.isDownloadable !== false
        }
        currentSpeed={currentSpeed}
        onSpeed={setCurrentSpeed}
        onPiP={() => setPipRequested(true)}
        onClearDisplay={() => setClearDisplay(true)}
        autoScroll={autoScroll}
        onAutoScrollChange={setAutoScroll}
        variants={activeVariants}
        selectedQuality={selectedQuality}
        onSelectQuality={(quality) => {
          setQualityTargetId(String(activePost?.postId ?? activePost?.id ?? ''));
          setSelectedQuality(quality);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  feed: {
    flex: 1,
  },
  feedBox: {
    flex: 1,
  },
  feedBoxCompact: {
    flex: 0,
    alignSelf: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    // Keep feed chrome (logo / filters / actions) on fixed physical sides
    // regardless of app RTL (Arabic).
    direction: 'ltr',
  },
  overlayHidden: {
    opacity: 0,
  },
  // No `bottom` — height is supplied per-page so `bottom:`-anchored children
  // have a real box to resolve against.
  pageChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    direction: 'ltr',
  },
  // Logo left-aligned to the same inset as the actions column below.
  topLeft: {
    position: 'absolute',
    top: 52,
    left: 6,
    height: 70,
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
    overflow: 'visible',
    direction: 'ltr',
  },
  logo: {
    width: 120,
    height: 30,
  },
  // LiveHub column — same right/width as sideFilters so centers line up.
  topRight: {
    position: 'absolute',
    top: 52,
    right: 6,
    width: 56,
    zIndex: 20,
    alignItems: 'center',
    overflow: 'visible',
    direction: 'ltr',
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
  filterGlyph: {
    width: 34,
    height: 34,
  },
  // Shop / user / all filters — right side (same column as LiveHub)
  sideFilters: {
    position: 'absolute',
    top: 120,
    right: 6,
    width: 56,
    zIndex: 20,
    alignItems: 'center',
  },
  // Profile + actions — left side (same inset as logo)
  sideActions: {
    position: 'absolute',
    left: 6,
    bottom: Platform.isPad ? 240 : 195,
    width: 56,
    alignItems: 'center',
    gap: 11,
    zIndex: 20,
    overflow: 'visible',
  },
  profileWrap: {
    overflow: 'visible',
    marginBottom: 4,
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
  actionImage: {
    width: 30,
    height: 30,
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
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: Platform.isPad ? 130 : 96,
    zIndex: 15,
  },
  // `bottom` comes from tab-bar clearance; paddingBottom clears the overlay scrubber.
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    justifyContent: 'flex-end',
    paddingBottom: 36,
  },
  bottomSection: {
    paddingHorizontal: 14,
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
    width: '100%',
  },
});
