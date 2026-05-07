// utils/eventImages.ts

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
export const CATEGORY_FALLBACKS: Record<string, string> = {
  war_conflict:      'https://picsum.photos/seed/war_conflict/800/600',
  tech_innovation:   'https://picsum.photos/seed/tech_innovation/800/600',
  science_discovery: 'https://picsum.photos/seed/science_discovery/800/600',
  politics_state:    'https://picsum.photos/seed/politics_state/800/600',
  culture_arts:      'https://picsum.photos/seed/culture_arts/800/600',
  natural_disaster:  'https://picsum.photos/seed/natural_disaster/800/600',
  exploration:       'https://picsum.photos/seed/exploration/800/600',
  religion_phil:     'https://picsum.photos/seed/religion_phil/800/600',
  personalities:     'https://picsum.photos/seed/personalities/800/600',
  media:             'https://picsum.photos/seed/media/800/600',
  sport:             'https://picsum.photos/seed/sport/800/600',
  history:           'https://picsum.photos/seed/history/800/600',
};

const DEFAULT_FALLBACK = 'https://picsum.photos/seed/dailyhistory/800/600';

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
    `https://picsum.photos/seed/${id}_0/800/600`,
    `https://picsum.photos/seed/${id}_1/800/600`,
    `https://picsum.photos/seed/${id}_2/800/600`,
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
  const API = 'https://en.wikipedia.org/w/api.php';
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
  const API = 'https://commons.wikimedia.org/w/api.php';
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
 * Resolves exactly 3 image URLs for an event, cascading through:
 *   1. event.gallery / event.images (Cloudinary or Wikipedia URLs already on the event)
 *   2. Wikipedia search + image API
 *   3. Wikimedia Commons search
 *   4. Stable Picsum URLs seeded by event ID
 *
 * Results are cached per event ID for the app session.
 */
export async function resolveEventImages(event: EventForImages): Promise<string[]> {
  const eventId = getEventId(event);
  if (imageCache.has(eventId)) return imageCache.get(eventId)!;

  const picsum = getPicsumFallbacks(event);

  try {
    // 1. Use gallery / images already attached to the event
    const rawUrls = event.gallery ?? event.images ?? [];
    const validGallery = (rawUrls as unknown[]).filter(
      (u): u is string => typeof u === 'string' && u.startsWith('http'),
    );
    if (validGallery.length > 0) {
      const result = [...validGallery, ...picsum].slice(0, 3);
      imageCache.set(eventId, result);
      return result;
    }

    const titleForSearch = event.titleTranslations?.en ?? event.title ?? '';
    if (titleForSearch) {
      // 2. Wikipedia
      try {
        const wikiUrls = await fetchFromWikipedia(titleForSearch, event.year);
        if (wikiUrls.length > 0) {
          const result = [...wikiUrls, ...picsum].slice(0, 3);
          imageCache.set(eventId, result);
          return result;
        }
      } catch {}

      // 3. Wikimedia Commons
      try {
        const commonsQuery = event.year ? `${titleForSearch} ${event.year}` : titleForSearch;
        const commonsUrls = await fetchFromWikimediaCommons(commonsQuery);
        if (commonsUrls.length > 0) {
          const result = [...commonsUrls, ...picsum].slice(0, 3);
          imageCache.set(eventId, result);
          return result;
        }
      } catch {}
    }
  } catch {}

  // 4. Picsum stable fallback — always works offline
  imageCache.set(eventId, picsum);
  return picsum;
}

export async function getPrimaryImage(event: EventForImages): Promise<string> {
  const urls = await resolveEventImages(event);
  return urls[0];
}
