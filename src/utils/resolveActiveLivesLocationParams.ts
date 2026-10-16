import { resolveDeviceCoordinates } from './resolveDeviceCoordinates';

export type ActiveLivesLocationParams = {
  city_id?: number;
  city_name?: string;
  latitude?: number;
  longitude?: number;
};

/**
 * Query params for GET /youtube/active-lives.
 * Backend resolves city from city_id / city_name / nearest city by lat/lng.
 */
export async function resolveActiveLivesLocationParams(
  overrides: ActiveLivesLocationParams = {},
): Promise<ActiveLivesLocationParams> {
  if (
    overrides.city_id ||
    overrides.city_name ||
    (overrides.latitude != null && overrides.longitude != null)
  ) {
    return { ...overrides };
  }

  const coords = await resolveDeviceCoordinates({ allowDevFallback: true });
  if (!coords) {
    return {};
  }

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}
