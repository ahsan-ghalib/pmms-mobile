export type VideoContentFit = 'cover' | 'contain';

/** Compare screen vs video aspect ratio (within tolerance). */
export function aspectRatiosMatch(
  screenWidth: number,
  screenHeight: number,
  videoWidth: number,
  videoHeight: number,
  tolerance = 0.06,
): boolean {
  if (screenWidth <= 0 || screenHeight <= 0 || videoWidth <= 0 || videoHeight <= 0) {
    return false;
  }

  const screenRatio = screenWidth / screenHeight;
  const videoRatio = videoWidth / videoHeight;

  return Math.abs(screenRatio - videoRatio) / screenRatio <= tolerance;
}

/**
 * Reels-style display policy:
 * - Portrait ~9:16 → full screen (cover)
 * - Everything else (1:1, landscape, short, etc.) → original size (contain)
 */
export function resolveVideoContentFit(
  _screenWidth: number,
  _screenHeight: number,
  videoWidth: number,
  videoHeight: number,
): VideoContentFit {
  if (videoWidth <= 0 || videoHeight <= 0) return 'contain';

  const videoRatio = videoWidth / videoHeight; // 9:16 = 0.5625
  const targetRatio = 9 / 16;
  const isPortrait916 = videoRatio < 1 && Math.abs(videoRatio - targetRatio) / targetRatio <= 0.12;

  return isPortrait916 ? 'cover' : 'contain';
}

function parsePositiveNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = parseFloat(String(value));
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

/** Parse "9:16", "1:1", "16/9", "0.5625" into width/height pair. */
export function parseAspectRatioString(raw: unknown): { width: number; height: number } | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;

  const sep = text.includes(':') ? ':' : text.includes('/') ? '/' : text.includes('x') ? 'x' : null;

  if (sep) {
    const [wRaw, hRaw] = text.split(sep);
    const w = parsePositiveNumber(wRaw);
    const h = parsePositiveNumber(hRaw);
    if (w && h) return { width: w, height: h };
    return null;
  }

  const ratio = parsePositiveNumber(text);
  if (!ratio) return null;
  // Store as width=ratio, height=1 for consistent ratio math.
  return { width: ratio, height: 1 };
}

function pickLargestVariantDims(item: any): { width: number; height: number } | null {
  const variants =
    item?.postVariants || item?.post_variants || item?.postsFiles?.[0]?.variants || [];

  if (!Array.isArray(variants) || variants.length === 0) return null;

  let best: { width: number; height: number } | null = null;
  let bestArea = 0;

  for (const variant of variants) {
    const w = parsePositiveNumber(variant?.width);
    const h = parsePositiveNumber(variant?.height);
    if (!w || !h) continue;
    const area = w * h;
    if (area >= bestArea) {
      bestArea = area;
      best = { width: w, height: h };
    }
  }

  return best;
}

/**
 * Resolve display dimensions for feed layout.
 * Prefer real HLS variant size (what actually plays), then post metadata.
 * Never invent 9:16 — that made square/short clips look fullscreen.
 */
export function readVideoDimensionsFromItem(item: any): {
  width: number;
  height: number;
} {
  // 1) Actual encoded variants (e.g. 720x720 from master.m3u8 ladder)
  const fromVariant = pickLargestVariantDims(item);
  if (fromVariant) return fromVariant;

  // 2) Post width/height from API
  const postFile = item?.postsFiles?.[0] || item;
  const rawWidth = parsePositiveNumber(postFile?.width) ?? parsePositiveNumber(item?.width);
  const rawHeight = parsePositiveNumber(postFile?.height) ?? parsePositiveNumber(item?.height);
  if (rawWidth && rawHeight) {
    return { width: rawWidth, height: rawHeight };
  }

  // 3) aspect_ratio string ("1:1", "9:16", …)
  const fromRatio =
    parseAspectRatioString(item?.aspect_ratio) || parseAspectRatioString(postFile?.aspect_ratio);
  if (fromRatio) return fromRatio;

  // Unknown → 0 so caller uses contain + square fallback (not fullscreen 9:16)
  return { width: 0, height: 0 };
}
