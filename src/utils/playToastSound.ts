import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

import {
  DEFAULT_NOTIFICATION_SOUND,
  NOTIFICATION_SOUNDS,
  type NotificationSoundKey,
} from './notificationSounds';

/**
 * Short in-app tones for toasts / cart / chat.
 * One player per sound key — seek+play, no alloc churn.
 */
const players = new Map<NotificationSoundKey, AudioPlayer>();
let audioModeReady = false;
let playChain: Promise<void> = Promise.resolve();

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
    allowsRecording: false,
    shouldRouteThroughEarpiece: false,
  });
  audioModeReady = true;
}

async function ensurePlayer(key: NotificationSoundKey): Promise<AudioPlayer | null> {
  await ensureAudioMode();
  const existing = players.get(key);
  if (existing) {
    try {
      // After Dev Menu reload, a stale native player can throw on seek/play.
      if (existing.isLoaded) return existing;
    } catch {
      players.delete(key);
    }
  }

  const def = NOTIFICATION_SOUNDS[key] ?? NOTIFICATION_SOUNDS[DEFAULT_NOTIFICATION_SOUND];
  try {
    const player = createAudioPlayer(def.asset, { keepAudioSessionActive: false });
    player.volume = 1;
    players.set(key, player);
    return player;
  } catch (error) {
    console.warn('[NotificationSound] Unable to create player:', error);
    return null;
  }
}

/** Fire-and-forget short tone. Safe to call often; does not block UI. */
export function playNotificationSound(
  key: NotificationSoundKey = DEFAULT_NOTIFICATION_SOUND,
): void {
  const resolved = NOTIFICATION_SOUNDS[key] ? key : DEFAULT_NOTIFICATION_SOUND;
  playChain = playChain
    .then(async () => {
      const player = await ensurePlayer(resolved);
      if (!player) return;
      try {
        await player.seekTo(0);
      } catch {
        // ignore seek race
      }
      player.play();
    })
    .catch((error) => {
      console.warn('[NotificationSound] Unable to play:', error);
    });
}

/** @deprecated Prefer playNotificationSound(key) */
export function playToastSound(key?: NotificationSoundKey): void {
  playNotificationSound(key ?? DEFAULT_NOTIFICATION_SOUND);
}
