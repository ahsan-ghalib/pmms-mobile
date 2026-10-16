/**
 * Great-circle distance between two WGS84 points (kilometers).
 */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type DistanceParts = {
  value: string;
  unit: 'm' | 'km';
};

/** Split a km distance into display value + unit key (m under 1 km). */
export function distanceDisplayParts(km: number): DistanceParts | null {
  if (!Number.isFinite(km) || km < 0) {
    return null;
  }

  if (km < 1) {
    return {
      value: String(Math.max(1, Math.round(km * 1000))),
      unit: 'm',
    };
  }

  return {
    value: km < 10 ? km.toFixed(1) : String(Math.round(km)),
    unit: 'km',
  };
}

/**
 * English default: "333 km away"
 * Pass `template` for i18n word order, e.g. Arabic "يبعد {{value}} {{unit}}"
 */
export function formatDistanceAway(
  km: number,
  labels: {
    away?: string;
    m: string;
    km: string;
    /** "{{value}} {{unit}} away" | "يبعد {{value}} {{unit}}" */
    template?: string;
  } = {
    away: 'away',
    m: 'm',
    km: 'km',
  },
): string {
  const parts = distanceDisplayParts(km);
  if (!parts) {
    return '';
  }

  const unitLabel = parts.unit === 'm' ? labels.m : labels.km;

  if (labels.template) {
    return labels.template
      .replace(/\{\{\s*value\s*\}\}/g, parts.value)
      .replace(/\{\{\s*unit\s*\}\}/g, unitLabel);
  }

  return `${parts.value} ${unitLabel} ${labels.away ?? 'away'}`;
}

export function parseCoord(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
