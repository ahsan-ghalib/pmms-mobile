import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { ensureForegroundLocationPermission } from './locationPermission';

/** Default map center used when the simulator has no GPS fix. */
export const FALLBACK_MAP_COORDINATE = {
  latitude: 24.7136,
  longitude: 46.6753,
};

export type ResolvedDeviceLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  fromFallback: boolean;
};

/**
 * Resolve a usable lat/lng for cart / map flows.
 * iOS Simulator often throws kCLErrorDomain 0 unless Features → Location
 * is set — we try last-known, then current, then a Saudi fallback in __DEV__.
 */
export async function resolveDeviceCoordinates(
  options: { allowDevFallback?: boolean } = {},
): Promise<ResolvedDeviceLocation | null> {
  const { allowDevFallback = __DEV__ } = options;

  const granted = await ensureForegroundLocationPermission();
  if (!granted) {
    return null;
  }

  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: 1000 * 60 * 30,
    requiredAccuracy: 2000,
  });
  if (lastKnown?.coords) {
    return {
      latitude: lastKnown.coords.latitude,
      longitude: lastKnown.coords.longitude,
      accuracy: lastKnown.coords.accuracy ?? null,
      fromFallback: false,
    };
  }

  try {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Platform.OS === 'ios' ? Location.Accuracy.Balanced : Location.Accuracy.Lowest,
    });
    return {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
      accuracy: current.coords.accuracy ?? null,
      fromFallback: false,
    };
  } catch {
    if (!allowDevFallback) {
      return null;
    }

    return {
      ...FALLBACK_MAP_COORDINATE,
      accuracy: null,
      fromFallback: true,
    };
  }
}
