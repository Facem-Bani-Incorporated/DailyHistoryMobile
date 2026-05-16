// utils/eventImages.ts
import {
  buildPicsumUrl,
  WIKIMEDIA_COMMONS_API_URL,
  WIKIPEDIA_API_URL,
} from '../config/urls';

const SKIP_PATTERNS = ['icon', 'logo', 'flag', 'map', 'symbol', 'coat', 'seal', 'blank', 'arrow', 'button'];

export interface EventForImages {
  id?: string;
  eventId?: string;
  daily_content_id?: string;
  dailyContentId?: string;
  _id?: string;
  eventDate?: string | Date;
  event_date?: string | Date;
  gallery?: string[] | null;
  images?: string[] | null;
  titleTranslations?: { en?: string; [key: string]: string | undefined };
  title?: string;
  year?: number | string;
  category?: string;
}

// One stable Picsum seed per category — last-resort fallback
const CATEGORY_SEEDS = [
  'war_conflict', 'tech_innovation', 'science_discovery', 'politics_state',
  'culture_arts', 'natural_disaster', 'exploration', 'religion_phil',
  'personalities', 'media', 'sport', 'history',
] as const;

export const CATEGORY_FALLBACKS: Record<string, string> = Object.fromEntries(
  CATEGORY_SEEDS.map(seed => [seed, buildPicsumUrl(seed)]),
);

const DEFAULT_FALLBACK = buildPicsumUrl('dailyhistory');

// Module-level cache — persists for the whole app session
const imageCache = new Map<string, string[]>();

// Mirrors useSavedStore.getEventId so the same event always maps to the same key
export function getEventId(event: EventForImages): string {
  const id =
    event?.id ??
    event?.eventId ??
    event?.daily_content_id ??
    event?.dailyContentId ??
    event?._id;
  if (id !== undefined && id !== null) return String(id);
  const date = event?.eventDate ?? event?.event_date ?? event?.year ?? '';
  const title = event?.titleTranslations?.en ?? event?.title ?? '';
  return `${date}_${title}`.slice(0, 80);
}

// Three stable Picsum URLs seeded by event ID — same every render, offline-safe
export function getPicsumFallbacks(event: EventForImages): string[] {
  const id = getEventId(event);
  return [
    buildPicsumUrl(`${id}_0`),
    buildPicsumUrl(`${id}_1`),
    buildPicsumUrl(`${id}_2`),
  ];
}

export function getCategoryFallback(event: EventForImages): string {
  return CATEGORY_FALLBACKS[event.category ?? ''] ?? DEFAULT_FALLBACK;
}

// ─── Network helpers ──────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function resolveWikiFileUrl(fileTitle: string, apiBase: string): Promise<string | null> {
  const filename = fileTitle.startsWith('File:') ? fileTitle.slice(5) : fileTitle;
  const url =
    `${apiBase}?action=query&titles=File:${encodeURIComponent(filename)}` +
    `&prop=imageinfo&iiprop=url%7Csize&iiurlwidth=800&format=json&origin=*`;
  try {
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) return null;
    const data = await resp.json() as {
      query?: { pages?: Record<string, { imageinfo?: Array<{ thumburl?: string; url?: string; width?: number; height?: number }> }> };
    };
    const page = Object.values(data?.query?.pages ?? {})[0];
    const info = page?.imageinfo?.[0];
    if (!info) return null;
    if ((info.width ?? 9999) < 200 || (info.height ?? 9999) < 200) return null;
    const resolved = info.thumburl ?? info.url ?? null;
    if (!resolved || resolved.toLowerCase().endsWith('.svg')) return null;
    return resolved;
  } catch {
    return null;
  }
}

// ─── Wikipedia ───────────────────────────────────────────────────────────────

async function fetchFromWikipedia(title: string, year?: number | string): Promise<string[]> {
  const API = WIKIPEDIA_API_URL;
  const query = year ? `${title} ${year}` : title;

  // Step 1 — find the page
  const searchResp = await fetchWithTimeout(
    `${API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1&origin=*`,
  );
  if (!searchResp.ok) return [];
  const searchData = await searchResp.json() as { query?: { search?: Array<{ title: string }> } };
  const hits = searchData?.query?.search ?? [];
  if (!hits.length) return [];

  const pageTitle = hits[0].title;

  // Step 2 — get image filenames from that page
  const imagesResp = await fetchWithTimeout(
    `${API}?action=query&titles=${encodeURIComponent(pageTitle)}&prop=images&format=json&imlimit=20&origin=*`,
  );
  if (!imagesResp.ok) return [];
  const imagesData = await imagesResp.json() as {
    query?: { pages?: Record<string, { images?: Array<{ title: string }> }> };
  };
  const page = Object.values(imagesData?.query?.pages ?? {})[0];
  const imageList = page?.images ?? [];

  const candidates = imageList
    .map(img => img.title)
    .filter(name => {
      const lower = name.toLowerCase();
      if (lower.endsWith('.svg')) return false;
      return !SKIP_PATTERNS.some(p => lower.includes(p));
    })
    .slice(0, 8);

  if (!candidates.length) return [];

  // Step 3 — resolve direct URLs in parallel
  const settled = await Promise.allSettled(candidates.map(name => resolveWikiFileUrl(name, API)));

  return settled
    .filter((r): r is PromiseFulfilledResult<string | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((url): url is string => url !== null)
    .slice(0, 3);
}

// ─── Wikimedia Commons fallback ───────────────────────────────────────────────

async function fetchFromWikimediaCommons(query: string): Promise<string[]> {
  const API = WIKIMEDIA_COMMONS_API_URL;
  const searchResp = await fetchWithTimeout(
    `${API}?action=query&list=search&srnamespace=6&srsearch=${encodeURIComponent(query)}&format=json&srlimit=5&origin=*`,
  );
  if (!searchResp.ok) return [];
  const searchData = await searchResp.json() as { query?: { search?: Array<{ title: string }> } };
  const hits = searchData?.query?.search ?? [];
  if (!hits.length) return [];

  const settled = await Promise.allSettled(
    hits.slice(0, 5).map(r => resolveWikiFileUrl(r.title, API)),
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<string | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((url): url is string => {
      if (!url) return false;
      const lower = url.toLowerCase();
      return !lower.endsWith('.svg') && !SKIP_PATTERNS.some(p => lower.includes(p));
    })
    .slice(0, 3);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Resolves exactly 3 image URLs for an event.
 *
 * Composition strategy — gallery URLs come first (Cloudinary, best quality),
 * Wikipedia fills every remaining slot so that when a Cloudinary URL fails at
 * render time the onError chain falls through to a *relevant* image, not a
 * random Picsum placeholder.
 *
 *   gallery ≥ 3  →  use gallery as-is (all slots covered, skip Wikipedia call)
 *   gallery 1-2  →  [gallery…, wiki…] padded to 3
 *   gallery 0    →  [wiki…] padded to 3
 *   all fail     →  stable Picsum seeded by event ID (offline-safe last resort)
 *
 * Results are cached per event ID for the whole app session.
 */
export async function resolveEventImages(event: EventForImages): Promise<string[]> {
  const eventId = getEventId(event);
  if (imageCache.has(eventId)) return imageCache.get(eventId)!;

  const picsum = getPicsumFallbacks(event);

  try {
    const rawUrls = event.gallery ?? event.images ?? [];
    const validGallery = (rawUrls as unknown[]).filter(
      (u): u is string => typeof u === 'string' && u.startsWith('http'),
    );

    // Enough Cloudinary / pipeline images — no Wikipedia call needed
    if (validGallery.length >= 3) {
      const result = validGallery.slice(0, 3);
      imageCache.set(eventId, result);
      return result;
    }

    // Fetch Wikipedia to fill every slot not covered by the gallery.
    // This makes Wikipedia the real fallback for Cloudinary failures at render time.
    const titleForSearch = event.titleTranslations?.en ?? event.title ?? '';
    let netImages: string[] = [];

    if (titleForSearch) {
      try {
        netImages = await fetchFromWikipedia(titleForSearch, event.year);
      } catch {}

      if (netImages.length < 3 - validGallery.length) {
        try {
          const commonsQuery = event.year ? `${titleForSearch} ${event.year}` : titleForSearch;
          const commonsExtra = await fetchFromWikimediaCommons(commonsQuery);
          // Merge without duplicates
          const seen = new Set(netImages);
          for (const url of commonsExtra) {
            if (!seen.has(url)) { seen.add(url); netImages.push(url); }
          }
        } catch {}
      }
    }

    // gallery first, then Wikipedia/Commons, then Picsum as last resort
    const result = [...validGallery, ...netImages, ...picsum].slice(0, 3);
    imageCache.set(eventId, result);
    return result;
  } catch {}

  // Absolute fallback — Picsum always resolves, even fully offline
  imageCache.set(eventId, picsum);
  return picsum;
}

export async function getPrimaryImage(event: EventForImages): Promise<string> {
  const urls = await resolveEventImages(event);
  return urls[0];
}
