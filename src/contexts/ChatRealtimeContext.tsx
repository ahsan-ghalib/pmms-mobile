import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChatService } from '../api/services/chat.service';
import { useAuth } from './AuthContext';
import echo from '../api/echo';
import { playNotificationSound } from '../utils/playToastSound';

type Conversation = Record<string, any>;

interface ChatRealtimeContextType {
  conversations: Conversation[];
  loading: boolean;
  hasUnread: boolean;
  unreadCount: number;
  refreshConversations: () => Promise<void>;
  markConversationRead: (conversationId: number) => void;
  setActiveConversationId: (id: number | null) => void;
}

const ChatRealtimeContext = createContext<ChatRealtimeContextType | undefined>(undefined);

function messagePreview(message: any): string {
  if (message?.body) return String(message.body);
  if (Array.isArray(message?.attachments) && message.attachments.length > 0) {
    return 'Attachment';
  }
  return 'New message';
}

export function ChatRealtimeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const activeConversationIdRef = useRef<number | null>(null);
  const userId = user?.id;

  const refreshConversations = useCallback(async () => {
    if (!isAuthenticated) {
      setConversations([]);
      return;
    }

    try {
      setLoading(true);
      const res = await ChatService.getConversations();
      if (res.success) {
        setConversations(res.data?.data || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const setActiveConversationId = useCallback((id: number | null) => {
    activeConversationIdRef.current = id;
  }, []);

  const markConversationRead = useCallback((conversationId: number) => {
    setConversations((prev) =>
      prev.map((conv) =>
        Number(conv.id) === Number(conversationId) ? { ...conv, unread_count: 0 } : conv,
      ),
    );
  }, []);

  const upsertFromMessageEvent = useCallback(
    (payload: any) => {
      const message = payload?.message;
      const conversation = payload?.conversation;
      if (!message || !conversation || !userId) return;

      // Keep AI support threads out of the vendor/customer Messages list.
      if (conversation.type === 'ai') return;

      const conversationId = Number(conversation.id || message.conversation_id);
      const isMine = Number(message.sender_id) === Number(userId);
      const isViewing =
        activeConversationIdRef.current != null &&
        Number(activeConversationIdRef.current) === conversationId;
      const unreadBump = !isMine && !isViewing ? 1 : 0;
      const preview = messagePreview(message);
      const lastMessageAt =
        message.created_at || conversation.last_message_at || new Date().toISOString();

      if (!isMine && !isViewing) {
        playNotificationSound('new-message');
      }

      setConversations((prev) => {
        const existingIndex = prev.findIndex((c) => Number(c.id) === conversationId);
        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          const updated = {
            ...existing,
            ...conversation,
            last_message_at: lastMessageAt,
            last_message_preview: preview,
            unread_count: Math.max(0, Number(existing.unread_count || 0) + unreadBump),
          };
          return [updated, ...prev.filter((_, index) => index !== existingIndex)];
        }

        return [
          {
            ...conversation,
            last_message_at: lastMessageAt,
            last_message_preview: preview,
            unread_count: unreadBump,
          },
          ...prev,
        ];
      });
    },
    [userId],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setConversations([]);
      return;
    }
    refreshConversations();
  }, [isAuthenticated, refreshConversations]);

  useEffect(() => {
    if (!isAuthenticated || !userId || !echo) return;

    const channelName = `user.${userId}`;
    const channel = echo.private(channelName);

    const handler = (event: any) => {
      upsertFromMessageEvent(event);
    };

    channel.listen('MessageSent', handler);

    return () => {
      try {
        channel.stopListening('MessageSent');
        echo.leave(channelName);
      } catch {
        // ignore
      }
    };
  }, [isAuthenticated, userId, upsertFromMessageEvent]);

  const unreadCount = useMemo(
    () => conversations.reduce((sum, conv) => sum + Math.max(0, Number(conv.unread_count || 0)), 0),
    [conversations],
  );

  const hasUnread = unreadCount > 0;

  const value = useMemo(
    () => ({
      conversations,
      loading,
      hasUnread,
      unreadCount,
      refreshConversations,
      markConversationRead,
      setActiveConversationId,
    }),
    [
      conversations,
      loading,
      hasUnread,
      unreadCount,
      refreshConversations,
      markConversationRead,
      setActiveConversationId,
    ],
  );

  return <ChatRealtimeContext.Provider value={value}>{children}</ChatRealtimeContext.Provider>;
}

export function useChatRealtime() {
  const context = useContext(ChatRealtimeContext);
  if (!context) {
    throw new Error('useChatRealtime must be used within a ChatRealtimeProvider');
  }
  return context;
}
