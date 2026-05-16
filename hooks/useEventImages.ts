// hooks/useEventImages.ts
import { useEffect, useRef, useState } from 'react';

import { isPicsumUrl } from '../config/urls';
import {
  EventForImages,
  getCategoryFallback,
  getEventId,
  getPicsumFallbacks,
  resolveEventImages,
} from '../utils/eventImages';

export type { EventForImages };

export interface UseEventImagesResult {
  images: string[];
  primaryImage: string;
  isLoading: boolean;
  hasRealImages: boolean;
}

/**
 * Resolves images for an event with instant fallbacks.
 *
 * On first render the hook returns stable Picsum URLs immediately (synchronous,
 * no flicker). As soon as the async resolution completes the state is updated
 * with real images (Cloudinary / Wikipedia). Subsequent renders for the same
 * event ID are served from the module-level cache without any network round-trip.
 */
export function useEventImages(event: EventForImages): UseEventImagesResult {
  const eventId = getEventId(event);

  const [images, setImages] = useState<string[]>(() => getPicsumFallbacks(event));
  const [isLoading, setIsLoading] = useState(true);
  const [hasRealImages, setHasRealImages] = useState(false);

  // Track which event ID the current state belongs to so we can reset instantly
  // when the event changes before the previous fetch completes.
  const resolvedForId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Reset to fresh fallbacks whenever we switch to a different event
    if (resolvedForId.current !== eventId) {
      const freshFallbacks = getPicsumFallbacks(event);
      setImages(freshFallbacks);
      setIsLoading(true);
      setHasRealImages(false);
    }

    resolveEventImages(event)
      .then(resolved => {
        if (cancelled) return;
        resolvedForId.current = eventId;
        setImages(resolved);
        setIsLoading(false);
        // hasRealImages is true when at least the first URL is NOT a Picsum seed
        setHasRealImages(!isPicsumUrl(resolved[0]));
      })
      .catch(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    images,
    primaryImage: images[0] ?? getCategoryFallback(event),
    isLoading,
    hasRealImages,
  };
}
