import { DeviceEventEmitter } from 'react-native';

const PAUSE_FEED_VIDEOS_EVENT = 'soouqlive:pause-feed-videos';
const LEAVE_HOME_FEED_EVENT = 'soouqlive:leave-home-feed';
const CUSTOMER_HOME_TAB_OPENED_EVENT = 'soouqlive:customer-home-tab-opened';

export function pauseFeedVideos() {
  DeviceEventEmitter.emit(PAUSE_FEED_VIDEOS_EVENT);
}

/** Stop Home playback and keep it stopped until the Home tab is opened again. */
export function leaveHomeFeed() {
  DeviceEventEmitter.emit(LEAVE_HOME_FEED_EVENT);
  pauseFeedVideos();
}

export function notifyCustomerHomeTabOpened() {
  DeviceEventEmitter.emit(CUSTOMER_HOME_TAB_OPENED_EVENT);
}

/** Resume Home after a stack screen (live) pops back. Same as tapping Home. */
export function resumeFeedVideos() {
  notifyCustomerHomeTabOpened();
}

export function addPauseFeedVideosListener(listener: () => void) {
  return DeviceEventEmitter.addListener(PAUSE_FEED_VIDEOS_EVENT, listener);
}

export function addLeaveHomeFeedListener(listener: () => void) {
  return DeviceEventEmitter.addListener(LEAVE_HOME_FEED_EVENT, listener);
}

export function addCustomerHomeTabOpenedListener(listener: () => void) {
  return DeviceEventEmitter.addListener(CUSTOMER_HOME_TAB_OPENED_EVENT, listener);
}
