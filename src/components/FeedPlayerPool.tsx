import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useVideoPlayer, type VideoPlayer } from 'expo-video';
import {
  getCachedPlayUri,
  resolvePlayableVideoUrl,
  subscribeFeedVideoCache,
} from '../utils/feedVideoDiskCache';
import { toCachedVideoSource } from '../utils/videoWindowPrefetch';

const POOL_SIZE = 3;

const ACTIVE_BUFFER = {
  preferredForwardBufferDuration: 8,
  minBufferForPlayback: 0.5,
  prioritizeTimeOverSizeThreshold: true,
  waitsToMinimizeStalling: false,
};

const NEIGHBOR_BUFFER = {
  preferredForwardBufferDuration: 6,
  minBufferForPlayback: 0.5,
  prioritizeTimeOverSizeThreshold: true,
  waitsToMinimizeStalling: false,
};

function toPlayerSource(url: string) {
  return toCachedVideoSource(url);
}

type SlotMeta = {
  feedIndex: number | null;
  url: string | null;
  hasFirstFrame: boolean;
};

type FeedPlayerPoolContextValue = {
  /** Bumps when slot assignments change so consumers re-read players. */
  version: number;
  getPlayerForIndex: (feedIndex: number) => VideoPlayer | null;
  getHasFirstFrame: (feedIndex: number) => boolean;
  markFirstFrame: (feedIndex: number) => void;
  clearFirstFrame: (feedIndex: number) => void;
  /**
   * Keep exactly active±1 loaded via replace() — recycle slots instead of
   * creating/destroying native players (TikTok-style pool).
   */
  syncWindow: (activeIndex: number, posts: any[], armed: boolean) => void;
  releaseAll: () => void;
  pauseAll: () => void;
};

const FeedPlayerPoolContext = createContext<FeedPlayerPoolContextValue | null>(null);

function setupPlayer(player: VideoPlayer) {
  player.loop = true;
  player.muted = true;
  player.timeUpdateEventInterval = 0;
  player.bufferOptions = NEIGHBOR_BUFFER;
}

export function FeedPlayerPoolProvider({ children }: { children: React.ReactNode }) {
  const player0 = useVideoPlayer(null, setupPlayer);
  const player1 = useVideoPlayer(null, setupPlayer);
  const player2 = useVideoPlayer(null, setupPlayer);
  const players = useMemo(() => [player0, player1, player2], [player0, player1, player2]);

  const slotsRef = useRef<SlotMeta[]>([
    { feedIndex: null, url: null, hasFirstFrame: false },
    { feedIndex: null, url: null, hasFirstFrame: false },
    { feedIndex: null, url: null, hasFirstFrame: false },
  ]);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const findSlotForIndex = useCallback((feedIndex: number) => {
    return slotsRef.current.findIndex((s) => s.feedIndex === feedIndex);
  }, []);

  const getPlayerForIndex = useCallback(
    (feedIndex: number) => {
      const slot = findSlotForIndex(feedIndex);
      return slot >= 0 ? (players[slot] ?? null) : null;
    },
    [findSlotForIndex, players],
  );

  const getHasFirstFrame = useCallback(
    (feedIndex: number) => {
      const slot = findSlotForIndex(feedIndex);
      return slot >= 0 ? slotsRef.current[slot].hasFirstFrame : false;
    },
    [findSlotForIndex],
  );

  const markFirstFrame = useCallback(
    (feedIndex: number) => {
      const slot = findSlotForIndex(feedIndex);
      if (slot < 0 || slotsRef.current[slot].hasFirstFrame) {
        return;
      }
      slotsRef.current[slot] = { ...slotsRef.current[slot], hasFirstFrame: true };
      bump();
    },
    [findSlotForIndex, bump],
  );

  const clearFirstFrame = useCallback(
    (feedIndex: number) => {
      const slot = findSlotForIndex(feedIndex);
      if (slot < 0 || !slotsRef.current[slot].hasFirstFrame) {
        return;
      }
      slotsRef.current[slot] = { ...slotsRef.current[slot], hasFirstFrame: false };
      bump();
    },
    [findSlotForIndex, bump],
  );

  const assignSlot = useCallback(
    (slotIdx: number, feedIndex: number, url: string) => {
      const player = players[slotIdx];
      const prev = slotsRef.current[slotIdx];
      if (!player) {
        return false;
      }
      if (prev.feedIndex === feedIndex && prev.url === url) {
        return false;
      }
      try {
        player.pause();
        player.muted = true;
        player.bufferOptions = NEIGHBOR_BUFFER;
        void player.replaceAsync(toPlayerSource(url)).catch(() => {});
      } catch {
        // ignore replace races
      }
      slotsRef.current[slotIdx] = {
        feedIndex,
        url,
        hasFirstFrame: false,
      };
      return true;
    },
    [players],
  );

  const clearSlot = useCallback(
    (slotIdx: number) => {
      const player = players[slotIdx];
      const prev = slotsRef.current[slotIdx];
      if (!prev.url && prev.feedIndex == null) {
        return false;
      }
      try {
        player?.pause();
        player && (player.muted = true);
        player?.replace(null as any);
      } catch {
        // ignore
      }
      slotsRef.current[slotIdx] = {
        feedIndex: null,
        url: null,
        hasFirstFrame: false,
      };
      return true;
    },
    [players],
  );

  const syncWindow = useCallback(
    (activeIndex: number, posts: any[], armed: boolean) => {
      if (!Array.isArray(posts) || posts.length === 0) {
        let changed = false;
        for (let i = 0; i < POOL_SIZE; i += 1) {
          changed = clearSlot(i) || changed;
        }
        if (changed) {
          bump();
        }
        return;
      }

      const needed: { index: number; url: string }[] = [];
      const deltas = armed ? [-1, 0, 1] : [0];
      for (const delta of deltas) {
        const index = activeIndex + delta;
        if (index < 0 || index >= posts.length) {
          continue;
        }
        const url = resolvePlayableVideoUrl(posts[index]);
        if (!url) {
          continue;
        }
        needed.push({ index, url });
      }

      const neededIndexes = new Set(needed.map((n) => n.index));
      const usedSlots = new Set<number>();
      let changed = false;

      // Keep slots that already match a needed index+url.
      for (const item of needed) {
        const existing = slotsRef.current.findIndex(
          (s) => s.feedIndex === item.index && s.url === item.url,
        );
        if (existing >= 0) {
          usedSlots.add(existing);
        }
      }

      // In-place URL updates for same feed index.
      for (const item of needed) {
        const sameIndex = slotsRef.current.findIndex((s) => s.feedIndex === item.index);
        if (sameIndex >= 0 && !usedSlots.has(sameIndex)) {
          changed = assignSlot(sameIndex, item.index, item.url) || changed;
          usedSlots.add(sameIndex);
        }
      }

      // Assign remaining needed indexes onto free slots (recycle old neighbors).
      for (const item of needed) {
        if (slotsRef.current.some((s) => s.feedIndex === item.index && s.url === item.url)) {
          continue;
        }
        const free =
          [0, 1, 2].find((i) => !usedSlots.has(i)) ??
          [0, 1, 2].find((i) => {
            const fi = slotsRef.current[i].feedIndex;
            return fi == null || !neededIndexes.has(fi);
          });
        if (free == null) {
          continue;
        }
        changed = assignSlot(free, item.index, item.url) || changed;
        usedSlots.add(free);
      }

      // Clear anything not in the window.
      for (let i = 0; i < POOL_SIZE; i += 1) {
        if (!usedSlots.has(i)) {
          changed = clearSlot(i) || changed;
        }
      }

      // Active slot gets a slightly larger buffer.
      const activeSlot = slotsRef.current.findIndex((s) => s.feedIndex === activeIndex);
      for (let i = 0; i < POOL_SIZE; i += 1) {
        const player = players[i];
        if (!player || !slotsRef.current[i].url) {
          continue;
        }
        try {
          player.bufferOptions = i === activeSlot ? ACTIVE_BUFFER : NEIGHBOR_BUFFER;
        } catch {
          // ignore
        }
      }

      if (changed) {
        bump();
      }
    },
    [assignSlot, clearSlot, bump, players],
  );

  const releaseAll = useCallback(() => {
    let changed = false;
    for (let i = 0; i < POOL_SIZE; i += 1) {
      changed = clearSlot(i) || changed;
    }
    if (changed) {
      bump();
    }
  }, [clearSlot, bump]);

  const pauseAll = useCallback(() => {
    for (let i = 0; i < POOL_SIZE; i += 1) {
      try {
        players[i]?.pause();
        if (players[i]) {
          players[i].muted = true;
        }
      } catch {
        // ignore
      }
    }
  }, [players]);

  useEffect(() => {
    return subscribeFeedVideoCache(() => {
      for (let i = 0; i < POOL_SIZE; i += 1) {
        const slot = slotsRef.current[i];
        const player = players[i];
        if (!slot.url || !player || !getCachedPlayUri(slot.url)) {
          continue;
        }
        try {
          void player.replaceAsync(toCachedVideoSource(slot.url)).catch(() => {});
        } catch {
          // ignore
        }
      }
    });
  }, [players]);

  useEffect(() => {
    return () => {
      for (let i = 0; i < POOL_SIZE; i += 1) {
        try {
          players[i]?.pause();
          players[i]?.replace(null as any);
        } catch {
          // ignore
        }
      }
    };
  }, [players]);

  const value = useMemo(
    () => ({
      version,
      getPlayerForIndex,
      getHasFirstFrame,
      markFirstFrame,
      clearFirstFrame,
      syncWindow,
      releaseAll,
      pauseAll,
    }),
    [
      version,
      getPlayerForIndex,
      getHasFirstFrame,
      markFirstFrame,
      clearFirstFrame,
      syncWindow,
      releaseAll,
      pauseAll,
    ],
  );

  return <FeedPlayerPoolContext.Provider value={value}>{children}</FeedPlayerPoolContext.Provider>;
}

export function useFeedPlayerPool(): FeedPlayerPoolContextValue {
  const ctx = useContext(FeedPlayerPoolContext);
  if (!ctx) {
    throw new Error('useFeedPlayerPool must be used within FeedPlayerPoolProvider');
  }
  return ctx;
}

export function useFeedPlayerPoolOptional(): FeedPlayerPoolContextValue | null {
  return useContext(FeedPlayerPoolContext);
}
