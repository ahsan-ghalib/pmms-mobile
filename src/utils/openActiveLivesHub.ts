import type { Router } from 'expo-router';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import { pauseFeedVideos } from './feedVideoPlayback';
import {
  resolveActiveLivesLocationParams,
  type ActiveLivesLocationParams,
} from './resolveActiveLivesLocationParams';

export type ActiveLiveVendor = {
  vendor_id: number;
  youtube_video_id: string;
  name?: string;
  logo?: string | null;
};

export type OpenActiveLivesHubOptions = {
  /** Prefer these when already known (e.g. discover card / avatar). */
  videoId?: string | null;
  vendorId?: string | number | null;
  /** City / coords override — Discover filter city, otherwise device location. */
  location?: ActiveLivesLocationParams;
  /** Pause home feed videos before navigating. */
  pauseFeed?: boolean;
};

function asParam(value: string | number | null | undefined): string | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  return String(value);
}

export function locationParamsForRoute(
  location: ActiveLivesLocationParams,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (location.city_id != null) {
    params.city_id = String(location.city_id);
  }
  if (location.city_name) {
    params.city_name = location.city_name;
  }
  if (location.latitude != null) {
    params.latitude = String(location.latitude);
  }
  if (location.longitude != null) {
    params.longitude = String(location.longitude);
  }
  return params;
}

export function locationOverridesFromRouteParams(params: {
  city_id?: string | string[];
  city_name?: string | string[];
  latitude?: string | string[];
  longitude?: string | string[];
}): ActiveLivesLocationParams {
  const one = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  const cityIdRaw = one(params.city_id);
  const cityName = one(params.city_name);
  const latRaw = one(params.latitude);
  const lngRaw = one(params.longitude);
  const city_id = cityIdRaw != null && cityIdRaw !== '' ? Number(cityIdRaw) : undefined;
  const latitude = latRaw != null && latRaw !== '' ? Number(latRaw) : undefined;
  const longitude = lngRaw != null && lngRaw !== '' ? Number(lngRaw) : undefined;

  return {
    ...(city_id != null && Number.isFinite(city_id) ? { city_id } : {}),
    ...(cityName ? { city_name: cityName } : {}),
    ...(latitude != null && Number.isFinite(latitude) ? { latitude } : {}),
    ...(longitude != null && Number.isFinite(longitude) ? { longitude } : {}),
  };
}

/**
 * Open the live hub for the resolved city.
 * - If videoId/vendorId given: jump straight to that stream (still city-scoped list).
 * - Else: fetch same-city lives and open the first one directly.
 * Returns false when there is nothing live for that city.
 */
export async function openActiveLivesHub(
  router: Pick<Router, 'push' | 'replace'>,
  options: OpenActiveLivesHubOptions = {},
): Promise<boolean> {
  const location = await resolveActiveLivesLocationParams(options.location ?? {});
  const routeLocation = locationParamsForRoute(location);

  let videoId = asParam(options.videoId);
  let vendorId = asParam(options.vendorId);

  if (!videoId && !vendorId) {
    try {
      const res = await apiClient.get<any>(ENDPOINTS.YOUTUBE.ACTIVE_LIVES, location);
      const data = res?.data ?? res ?? [];
      const lives: ActiveLiveVendor[] = Array.isArray(data) ? data : [];
      const first = lives[0];
      if (!first?.youtube_video_id) {
        return false;
      }
      videoId = String(first.youtube_video_id);
      vendorId = first.vendor_id != null ? String(first.vendor_id) : undefined;
    } catch {
      return false;
    }
  }

  if (options.pauseFeed) {
    pauseFeedVideos();
  }

  router.push({
    pathname: '/live/LiveVendorsScreen',
    params: {
      ...(videoId ? { videoId } : {}),
      ...(vendorId ? { vendorId } : {}),
      ...routeLocation,
    },
  } as any);

  return true;
}
