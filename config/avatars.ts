// config/avatars.ts
//
// Profile avatars = real portraits of iconic historical figures (fitting for a
// history app). Portraits are pulled from the Wikipedia REST summary endpoint
// (the same source the app already uses), so there are no bundled image assets.
// Resolved thumbnail URLs are cached and the chosen one is stored per-user.

export interface HistoricalFigure {
  /** Wikipedia page title (used to resolve the portrait + as a stable id). */
  id: string;
  /** Short display name shown under the avatar. */
  name: string;
}

// Diverse, instantly recognizable figures with strong lead portraits.
export const HISTORICAL_FIGURES: HistoricalFigure[] = [
  { id: 'Albert_Einstein', name: 'Einstein' },
  { id: 'Marie_Curie', name: 'Curie' },
  { id: 'Leonardo_da_Vinci', name: 'Da Vinci' },
  { id: 'Cleopatra', name: 'Cleopatra' },
  { id: 'Napoleon', name: 'Napoleon' },
  { id: 'Abraham_Lincoln', name: 'Lincoln' },
  { id: 'Nikola_Tesla', name: 'Tesla' },
  { id: 'Frida_Kahlo', name: 'Frida Kahlo' },
  { id: 'Mahatma_Gandhi', name: 'Gandhi' },
  { id: 'Nelson_Mandela', name: 'Mandela' },
  { id: 'William_Shakespeare', name: 'Shakespeare' },
  { id: 'Vincent_van_Gogh', name: 'Van Gogh' },
  { id: 'Ada_Lovelace', name: 'Lovelace' },
  { id: 'Wolfgang_Amadeus_Mozart', name: 'Mozart' },
  { id: 'Charles_Darwin', name: 'Darwin' },
];

// Resolve a figure's portrait thumbnail via the Wikipedia REST summary API.
// Returns null if the page has no lead image (caller shows a fallback).
export async function fetchFigureThumb(title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.thumbnail?.source ?? json?.originalimage?.source ?? null;
  } catch {
    return null;
  }
}

// Fetch every figure's portrait in parallel → { [id]: url }.
export async function fetchAllFigureThumbs(): Promise<Record<string, string>> {
  const entries = await Promise.all(
    HISTORICAL_FIGURES.map(async (f) => [f.id, await fetchFigureThumb(f.id)] as const),
  );
  const out: Record<string, string> = {};
  for (const [id, url] of entries) if (url) out[id] = url;
  return out;
}
