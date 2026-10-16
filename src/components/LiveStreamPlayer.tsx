import React, { useState, useEffect, useRef } from 'react';
import {
  AppState,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { LiveProfileAvatar } from './LiveProfileAvatar';
import echo from '../api/echo';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useIsRTL } from '../hooks/useIsRTL';
import { startYouTubeWatchHeartbeat } from '../utils/youtubeWatchHeartbeat';
import ReportContentModal from './ReportContentModal';

/** Fixed comments panel height so the input never gets pushed off-screen. */
const COMMENTS_PANEL_HEIGHT = 220;

type LiveStreamPlayerProps = {
  item: any;
  isActive: boolean;
  onBack: () => void;
  /** When false, only chrome is rendered — native YT pager owns the video surface. */
  renderVideo?: boolean;
  /** Driven by native onFirstFrame when renderVideo is false. */
  isVideoPlaying?: boolean;
  /** Fired once when engagement says the live is gone (404/400). */
  onEnded?: () => void;
};

/** Hide YouTube's center play overlay inside the iframe (all frames). */
const HIDE_YT_PLAY_JS = `
(function(){
  if (window._soouqHideYtPlay) return;
  window._soouqHideYtPlay = true;
  var css = '.ytp-large-play-button,.ytp-large-play-button *,.ytp-cued-thumbnail-overlay,.ytp-play-button,.ytp-mobile-play-button,.ytp-pause-overlay,.ytp-inline-playpause-button,[aria-label="Play"],[aria-label="Play video"],.ytp-button[aria-label="Play"]{display:none!important;opacity:0!important;pointer-events:none!important;}video::-webkit-media-controls-start-playback-button,video::-webkit-media-controls-overlay-play-button{display:none!important;}';
  var sel = '.ytp-large-play-button,.ytp-cued-thumbnail-overlay,.ytp-play-button,.ytp-mobile-play-button,.ytp-pause-overlay,button[aria-label="Play"],button[aria-label="Play video"]';
  function apply(){
    try {
      if (!document.getElementById('soouq-hide-yt-play')) {
        var s=document.createElement('style'); s.id='soouq-hide-yt-play'; s.textContent=css;
        (document.head||document.documentElement).appendChild(s);
      }
      document.querySelectorAll(sel).forEach(function(el){ el.style.setProperty('display','none','important'); });
    } catch(e) {}
  }
  apply();
  try { new MutationObserver(apply).observe(document.documentElement||document,{childList:true,subtree:true}); } catch(e) {}
})();
true;
`;

function commentsSignature(list: any[]): string {
  if (!list.length) return '';
  return list.map((c) => `${c?.id ?? ''}:${c?.message ?? ''}:${c?.author ?? ''}`).join('|');
}

export default function LiveStreamPlayer({
  item,
  isActive,
  onBack,
  renderVideo = true,
  isVideoPlaying: isVideoPlayingProp,
  onEnded,
}: LiveStreamPlayerProps) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const paddingTop = Math.max(insets.top, 50);
  const [reportOpen, setReportOpen] = useState(false);

  const videoId = item.youtube_video_id || '';
  const webviewRef = useRef<WebView>(null);
  const endedNotified = useRef(false);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const commentsSigRef = useRef('');
  const activeVideoIdRef = useRef(videoId);
  activeVideoIdRef.current = videoId;

  const [isVideoPlayingLocal, setIsVideoPlaying] = useState(false);
  const isVideoPlaying = renderVideo ? isVideoPlayingLocal : !!isVideoPlayingProp;
  const [isEnded, setIsEnded] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [viewCount, setViewCount] = useState<number>(0);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const applyComments = (next: any[]) => {
    const sig = commentsSignature(next);
    if (sig === commentsSigRef.current) return;
    commentsSigRef.current = sig;
    setComments(next);
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (!renderVideo || !isActive || !videoId) return;
      if (state !== 'inactive' && state !== 'background') return;
      webviewRef.current?.injectJavaScript(`
        (function(){
          try {
            var videos = document.querySelectorAll('video');
            for (var i = 0; i < videos.length; i++) {
              var v = videos[i];
              if (!v) continue;
              if (v.webkitSetPresentationMode) {
                v.webkitSetPresentationMode('picture-in-picture');
                break;
              }
              if (v.requestPictureInPicture && !document.pictureInPictureElement) {
                v.requestPictureInPicture();
                break;
              }
            }
            if (typeof player !== 'undefined' && player && player.playVideo) { player.playVideo(); }
          } catch (e) {}
          true;
        })();
      `);
    });
    return () => sub.remove();
  }, [isActive, renderVideo, videoId]);

  useEffect(() => {
    endedNotified.current = false;
    setIsEnded(false);
    setViewCount(0);
    commentsSigRef.current = '';
    setComments([]);
  }, [videoId]);

  // App-side watch telemetry (open → heartbeat → leave) for admin monitoring.
  useEffect(() => {
    if (!isActive || !videoId) return;
    return startYouTubeWatchHeartbeat({
      youtubeVideoId: videoId,
      vendorId: item?.vendor_id ?? item?.id ?? null,
    });
  }, [isActive, videoId, item?.vendor_id, item?.id]);

  const markEnded = () => {
    if (endedNotified.current) return;
    endedNotified.current = true;
    setIsEnded(true);
    onEndedRef.current?.();
  };

  useEffect(() => {
    if (!renderVideo) return;
    if (!isActive) {
      webviewRef.current?.injectJavaScript(
        `if (typeof player !== 'undefined' && player && player.mute) { player.mute(); player.pauseVideo(); } true;`,
      );
      return;
    }

    // When becoming active, ensure it plays and unmutes
    webviewRef.current?.injectJavaScript(
      `if (typeof player !== 'undefined' && player && player.unMute) { player.unMute(); player.playVideo(); } true;`,
    );

    const timer = setTimeout(() => {
      setIsVideoPlaying(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [isActive, renderVideo]);

  useEffect(() => {
    if (!isActive || !videoId) return;

    let channel: any = null;
    let channelName = '';
    let cancelled = false;
    const boundVideoId = videoId;

    const setupEcho = (liveId: string | number) => {
      if (channel || cancelled) return;
      channelName = `youtube-live.${liveId}`;
      channel = echo.channel(channelName);
      channel.listen('.YouTubeLiveEngagementUpdated', (e: any) => {
        if (cancelled || activeVideoIdRef.current !== boundVideoId) return;
        if (e?.concurrent_viewers !== undefined) setViewCount(Number(e.concurrent_viewers));
        if (Array.isArray(e?.comments)) applyComments(e.comments.slice().reverse());
      });
    };

    const pullInitial = async () => {
      try {
        const res = await axiosInstance.get('/youtube/live/engagement', {
          params: { video_id: boundVideoId },
        });
        if (cancelled || activeVideoIdRef.current !== boundVideoId) return;
        const data = res.data?.oData;
        if (data?.youtube_live_id) setupEcho(data.youtube_live_id);
        if (data?.concurrent_viewers !== undefined) setViewCount(Number(data.concurrent_viewers));
        if (Array.isArray(data?.comments)) applyComments(data.comments.slice().reverse());
      } catch (e: any) {
        if (cancelled || activeVideoIdRef.current !== boundVideoId) return;
        if (e.response?.status === 404 || e.response?.status === 400) {
          markEnded();
        }
        console.log('[LiveStreamPlayer] Error fetching initial engagement', e);
      }
    };

    pullInitial();
    const interval = setInterval(pullInitial, 8000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (channel && channelName) echo.leave(channelName);
    };
  }, [videoId, isActive]);

  const handleSendComment = async () => {
    const msg = commentText.trim();
    if (!msg || !videoId || isSending) return;
    setIsSending(true);
    try {
      await axiosInstance.post('/youtube/live/comment', { video_id: videoId, message: msg });
      setCommentText('');
      Keyboard.dismiss();
    } catch (e) {
    } finally {
      setIsSending(false);
    }
  };

  const renderComment = ({ item: c }: any) => {
    const isReaction = c.type && c.type !== 'textMessageEvent';
    const reactionEmoji =
      c.type === 'superChatEvent'
        ? '💰'
        : c.type === 'superStickerEvent'
          ? '⭐'
          : c.type === 'newSponsorEvent'
            ? '🎉'
            : c.type === 'memberMilestoneChatEvent'
              ? '🏆'
              : c.type === 'giftEvent'
                ? '🎁'
                : null;
    return (
      <View style={styles.commentRow}>
        {c.avatar ? (
          <Image source={{ uri: c.avatar }} style={styles.commentAvatar} />
        ) : (
          <View style={[styles.commentAvatar, styles.commentAvatarFallback]}>
            <Ionicons name="person" size={14} color="#fff" />
          </View>
        )}
        <View
          style={[
            styles.commentBubble,
            isReaction && { backgroundColor: 'rgba(142, 84, 233, 0.4)' },
          ]}
        >
          <Text style={styles.commentAuthor}>
            {reactionEmoji ? `${reactionEmoji} ` : ''}
            {c.author}
          </Text>
          <Text style={styles.commentMessage}>{c.message || (reactionEmoji ?? '❤️')}</Text>
        </View>
      </View>
    );
  };

  const customHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
      <style>
        html, body { margin:0; padding:0; height:100%; width:100%; background:black; overflow:hidden; }
        .video-container { position:absolute; top:0; left:0; width:100%; height:100%; background:black; }
        #player { width:100%; height:100%; border:0; background:black; }
        .ytp-large-play-button, .ytp-large-play-button-bg, .ytp-cued-thumbnail-overlay,
        .ytp-play-button, .ytp-mobile-play-button, .ytp-pause-overlay,
        [aria-label="Play"], [aria-label="Play video"] { display:none !important; opacity:0 !important; }
      </style>
      <script>
        var tag=document.createElement('script'); tag.src="https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
        var player;
        function onYouTubeIframeAPIReady(){
          player = new YT.Player('player', {
            videoId: '${videoId}',
            playerVars: {
              playsinline: 1, autoplay: ${isActive ? 1 : 0}, mute: 1, controls: 0, modestbranding: 1, rel: 0,
              fs: 0, iv_load_policy: 3, vq: 'hd1080', disablekb: 1, origin: 'https://soouqlive.com'
            },
            events: {
              onReady: function(event){ 
                player.mute();
                if (${isActive}) { 
                  player.unMute(); 
                  player.playVideo(); 
                }
                window.ReactNativeWebView.postMessage('READY'); 
              },
              onStateChange: function(event){
                if(event.data === 1) window.ReactNativeWebView.postMessage('PLAYING');
              }
            }
          });
        }
      </script>
    </head>
    <body>
      <div class="video-container"><div id="player"></div></div>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, !renderVideo && styles.chromeOnly]} pointerEvents="box-none">
      {renderVideo ? (
        !isEnded && videoId ? (
          <View style={{ flex: 1, overflow: 'hidden', backgroundColor: 'black' }}>
            <WebView
              ref={webviewRef}
              originWhitelist={['*']}
              source={{ html: customHTML, baseUrl: 'https://soouqlive.com' }}
              allowsInlineMediaPlayback
              allowsPictureInPictureMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              injectedJavaScriptBeforeContentLoaded={HIDE_YT_PLAY_JS}
              injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
              injectedJavaScript={HIDE_YT_PLAY_JS}
              injectedJavaScriptForMainFrameOnly={false}
              bounces={false}
              scrollEnabled={false}
              style={{ flex: 1, backgroundColor: 'black', transform: [{ scale: 1.35 }] }}
              onMessage={(event) => {
                if (event.nativeEvent.data === 'PLAYING' && !isVideoPlayingLocal) {
                  setIsVideoPlaying(true);
                }
              }}
            />
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'black',
            }}
          >
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )
      ) : null}

      <View style={[styles.header, { top: paddingTop }]} pointerEvents="box-none">
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.vendorRow}
          onPress={() => {
            if (item.vendor_id) {
              router.push({
                pathname: '/shop/ShopDetailScreen',
                params: { vendor_id: String(item.vendor_id), shopName: item.name || 'Shop' },
              });
            }
          }}
        >
          <LiveProfileAvatar uri={item.logo || null} size={40} isLive showBadge={false} />
          <View style={{ marginLeft: 10, flexShrink: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name || 'Live'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.livePillText}>
                  {t('live', { defaultValue: 'LIVE' }).toUpperCase()}
                </Text>
              </View>
              <View
                style={[styles.livePill, { backgroundColor: 'rgba(0,0,0,0.5)', marginLeft: 6 }]}
              >
                <Ionicons name="eye" size={10} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.livePillText}>{viewCount}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        {user && item.vendor_id && videoId ? (
          <TouchableOpacity
            onPress={() => setReportOpen(true)}
            style={styles.reportBtn}
            hitSlop={8}
          >
            <Ionicons name="flag-outline" size={20} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={styles.bottomOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <View style={styles.commentsContainer} pointerEvents="box-none">
          <MaskedView
            style={styles.commentsMask}
            pointerEvents="box-none"
            maskElement={
              <View style={styles.commentsMaskFill}>
                {/* Transparent at top → opaque below = TikTok comment dissolve */}
                <LinearGradient
                  colors={['transparent', '#000000', '#000000']}
                  locations={[0, 0.32, 1]}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            }
          >
            <FlatList
              data={comments}
              keyExtractor={(c, index) =>
                String(c.id ?? `${c.author ?? 'a'}-${c.message ?? 'm'}-${index}`)
              }
              renderItem={renderComment}
              inverted
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, paddingTop: 28 }}
              keyboardShouldPersistTaps="handled"
              // Empty list still steals vertical pans from the native live pager.
              scrollEnabled={comments.length > 2}
              pointerEvents={comments.length > 0 ? 'auto' : 'none'}
              removeClippedSubviews
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={5}
              style={styles.commentsList}
            />
          </MaskedView>
        </View>
        {user ? (
          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.textInput, { textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t('write_a_comment', { defaultValue: 'Write a comment...' })}
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={200}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!commentText.trim() || isSending) && { opacity: 0.5 }]}
                onPress={handleSendComment}
                disabled={!commentText.trim() || isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="send"
                    size={16}
                    color="#fff"
                    style={isRTL ? { transform: [{ rotate: '180deg' }] } : undefined}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Text style={{ color: 'white', opacity: 0.7, textAlign: 'center', width: '100%' }}>
              {t('login_to_join_chat', { defaultValue: 'Login to join the chat' })}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {isActive && !isVideoPlaying && !isEnded && renderVideo ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              elevation: 9999,
            },
          ]}
        >
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : null}

      {isEnded && !onEnded && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(0,0,0,0.85)',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              elevation: 10000,
            },
          ]}
        >
          <Ionicons name="videocam-off" size={48} color="#E11D48" style={{ marginBottom: 16 }} />
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>
            {t('live_ended', { defaultValue: 'Live Stream Ended' })}
          </Text>
          <Text
            style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: 40 }}
          >
            {t('live_ended_desc', {
              defaultValue: 'This stream has ended. Swipe up to watch another one!',
            })}
          </Text>
        </View>
      )}

      <ReportContentModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        target={
          item.vendor_id && videoId
            ? {
                kind: 'live',
                vendorId: Number(item.vendor_id),
                youtubeVideoId: String(videoId),
              }
            : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  chromeOnly: { backgroundColor: 'transparent' },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 100,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  vendorRow: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  livePill: {
    marginTop: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E11D48',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#fff', marginRight: 4 },
  livePillText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Do not grow with comment count — input stays pinned above home indicator.
  },
  commentsContainer: {
    height: COMMENTS_PANEL_HEIGHT,
    marginBottom: 4,
  },
  commentsMask: {
    flex: 1,
  },
  commentsMaskFill: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  commentsList: {
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'transparent',
    flexShrink: 0,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textInput: {
    flex: 1,
    color: '#fff',
    maxHeight: 100,
    minHeight: 24,
    fontSize: 14,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  commentRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#444',
  },
  commentAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  commentBubble: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '85%',
  },
  commentAuthor: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  commentMessage: { color: '#fff', fontSize: 13, lineHeight: 18 },
});
