import * as Location from 'expo-location';

/**
 * Prefer getForegroundPermissionsAsync so we only create a CoreLocation
 * client via request when status is still undetermined.
 */
export async function ensureForegroundLocationPermission(
  options: { promptIfNeeded?: boolean } = {},
): Promise<boolean> {
  const { promptIfNeeded = true } = options;

  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === Location.PermissionStatus.GRANTED) {
    return true;
  }

  if (!promptIfNeeded || current.status === Location.PermissionStatus.DENIED) {
    return false;
  }

  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.status === Location.PermissionStatus.GRANTED;
}
