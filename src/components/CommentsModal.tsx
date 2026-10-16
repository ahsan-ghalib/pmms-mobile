import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
  StyleSheet,
  Dimensions,
  FlatList,
  TextInput,
  Platform,
  Image,
  ActivityIndicator,
  Animated,
  PanResponder,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';
import storage from '../storage/storage';
import { useKeyboardAvoidance } from '../contexts/KeyboardAvoidanceContext';
// Shared Text swaps Inter → Cairo automatically when the language is Arabic.
import { Text } from './Text';

const { height, width } = Dimensions.get('window');

/** Shared with the feed so the shrunk player can sit exactly on top of the sheet. */
export const COMMENTS_SHEET_HEIGHT_RATIO = 0.74;

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  /** Fires when the slide-out starts, so the host can animate along with it. */
  onDismissStart?: () => void;
  postId: number;
}

interface Comment {
  id: number;
  comment: string;
  created_at: string;
  user: {
    id: number;
    name: string;
    username: string;
    avatar: string | null;
  };
  replies?: Comment[];
}

export default function CommentsModal({
  visible,
  onClose,
  onDismissStart,
  postId,
}: CommentsModalProps) {
  const { t, i18n } = useTranslation();
  // Language only — `I18nManager.isRTL` is captured at app launch and doesn't
  // follow a live language switch, so it keeps this sheet RTL after the user
  // moves back to English until the app is restarted.
  const isArabic = (i18n.language || '').startsWith('ar');
  const { setEnabled } = useKeyboardAvoidance();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [totalComments, setTotalComments] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => setKeyboardHeight(event.endCoordinates?.height ?? 0);
    const onHide = () => setKeyboardHeight(0);
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow,
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide,
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    setEnabled(false);
    return () => setEnabled(true);
  }, [setEnabled]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await storage.getToken();
      setIsLoggedIn(!!token);
    };

    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      fetchComments();
      checkAuth();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/posts/${postId}/comments`);
      setComments(res.data.data || []);
      setTotalComments(res.data.total || res.data.data?.length || 0);
    } catch (error) {
      console.error('Failed to fetch comments', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && postId) {
      const channel = require('../utils/echo').default.channel(`public-post.${postId}`);

      channel.listen('.PostCommentCreated', (e: any) => {
        console.log('💬 New comment received via Reverb!', e);
        if (e.comment) {
          setComments((prev) => {
            // Avoid duplicates
            if (prev.some((c) => c.id === e.comment.id)) return prev;
            return [e.comment, ...prev];
          });
          setTotalComments(e.total_comments);
        }
      });

      return () => {
        channel.stopListening('.PostCommentCreated');
      };
    }
  }, [visible, postId]);

  const postComment = async () => {
    if (!newComment.trim()) return;

    Keyboard.dismiss();

    try {
      setPosting(true);
      const res = await axiosInstance.post(`/posts/${postId}/comments`, {
        comment: newComment.trim(),
      });
      if (res.data?.data) {
        setComments((prev) => [res.data.data, ...prev]);
        setTotalComments((prev) => prev + 1);
        setNewComment('');
      }
    } catch (error) {
      console.error('Failed to post comment', error);
    } finally {
      setPosting(false);
    }
  };

  const handleClose = () => {
    onDismissStart?.();
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View>
      <View style={styles.commentItem}>
        <Image
          source={
            item.user.avatar
              ? { uri: item.user.avatar }
              : require('../../assets/images/profile.png')
          }
          style={[styles.avatar, styles.avatarEnglish]}
        />
        <View style={styles.commentContent}>
          <Text style={styles.userName}>{item.user.name}</Text>
          <Text style={styles.commentText}>{item.comment}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
            <Text style={styles.timeText}>{new Date(item.created_at).toLocaleDateString()} AH</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.timeText}>10:45 AM</Text>
          </View>
        </View>
      </View>
      {(item.replies || []).map((reply) => (
        <View key={reply.id} style={styles.replyItem}>
          <View style={styles.vendorAvatar}>
            <Ionicons name="storefront" size={25} color="#B45309" />
          </View>
          <View style={styles.commentContent}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{reply.user.name}</Text>
              <Text style={styles.vendorBadge}>{t('vendor', 'Vendor')}</Text>
            </View>
            <Text style={styles.commentText}>{reply.comment}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
              <Text style={styles.timeText}>
                {new Date(reply.created_at).toLocaleDateString()} AH
              </Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.timeText}>11:02 AM</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.container,
            isArabic ? styles.containerArabic : styles.containerEnglish,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.dragHandle} />
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={30} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {totalComments}{' '}
              {totalComments === 1 ? t('comment_singular', 'Comment') : t('comments', 'Comments')}
            </Text>
            <View style={{ width: 30 }} />
          </View>

          {/* Comments List */}
          {loading && comments.length === 0 ? (
            <ActivityIndicator style={{ flex: 1, marginTop: 20 }} size="large" color="#8E54E9" />
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={comments}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderComment}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {t('no_comments_yet', 'No comments yet. Be the first to comment!')}
                </Text>
              }
            />
          )}

          {/* Input Area */}
          {isLoggedIn && (
            <View
              style={[
                styles.inputContainer,
                isArabic && styles.inputContainerArabic,
                { bottom: keyboardHeight },
              ]}
            >
              <Image
                source={require('../../assets/images/profile.png')}
                style={styles.inputAvatar}
              />
              <TextInput
                style={[styles.input, isArabic && styles.rtlInput]}
                placeholder={t('add_comment', 'Add comment...')}
                placeholderTextColor="#999"
                value={newComment}
                onChangeText={setNewComment}
                onSubmitEditing={postComment}
                returnKeyType="send"
                multiline
                maxLength={500}
              />
              <Pressable
                style={[styles.sendButton, !newComment.trim() && { opacity: 0.5 }]}
                onPressIn={postComment}
                disabled={!newComment.trim() || posting}
                hitSlop={10}
              >
                {posting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="send"
                    size={20}
                    color="#fff"
                    style={{ transform: [{ scaleX: isArabic ? -1 : 1 }] }}
                  />
                )}
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dragHandle: {
    width: 96,
    height: 12,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 14,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  container: {
    backgroundColor: '#fff',
    height: height * COMMENTS_SHEET_HEIGHT_RATIO,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  // Direction is pinned on the sheet root (children inherit it) so the layout
  // never falls back to the stale app-launch RTL flag.
  containerArabic: {
    direction: 'rtl',
  },
  containerEnglish: {
    direction: 'ltr',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 90,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 18,
    direction: 'ltr',
  },
  replyItem: {
    flexDirection: 'row',
    direction: 'ltr',
    marginLeft: 28,
    marginRight: 0,
    marginBottom: 16,
    padding: 14,
    borderRadius: 22,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
    backgroundColor: '#FFF9F2',
  },
  replyAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E4E4E7' },
  vendorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF0DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eee',
  },
  commentItemArabic: {
    flexDirection: 'row-reverse',
  },
  avatarEnglish: {
    marginRight: 12,
  },
  avatarArabic: {
    marginLeft: 12,
  },
  commentContent: {
    flex: 1,
    direction: 'ltr',
  },
  commentBubble: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vendorBadge: {
    color: '#B45309',
    backgroundColor: '#FEEDD8',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'left',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 },
  dot: { color: '#9CA3AF', fontSize: 16, textAlign: 'left' },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    // Comment rows stay LTR (avatar on the left) even in Arabic.
    textAlign: 'left',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    textAlign: 'left',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'left',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  inputAvatar: { width: 42, height: 42, borderRadius: 21, marginRight: 10 },
  inputContainerArabic: {
    flexDirection: 'row-reverse',
    // Keep the visual order stable even when the native RTL direction
    // mirrors the flex row: input on the right, send button on the left.
    direction: 'ltr',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    maxHeight: 100,
    minHeight: 40,
    color: '#333',
    fontFamily: 'Inter_400Regular',
  },
  rtlInput: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'PlaypenSansArabic_400Regular',
  },
  sendButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8E54E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    zIndex: 30,
    elevation: 30,
  },
});
