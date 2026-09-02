// components/EventImage.tsx
import { Image, ImageContentFit } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { EventForImages, getCategoryFallback } from '../utils/eventImages';
import { useEventImages } from '../hooks/useEventImages';

interface EventImageProps {
  event: EventForImages;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ImageContentFit;
  showLoader?: boolean;
}

/**
 * How long a single source may take before we stop waiting and try the next one.
 *
 * The fallback chain used to advance on `onError` alone, which is not enough: expo-image
 * reports an error for a refused or 404'd request, but a request that simply hangs — a
 * slow Wikimedia thumbnail, a captive network, a CDN that accepts the connection and then
 * stalls — produces no event at all. The card then sits on its dark background with the
 * title over it and never recovers, which is what "sometimes there is no photo" looks
 * like. Four seconds is longer than a real image needs on a slow connection and shorter
 * than a user will stare at an empty card.
 */
const SOURCE_TIMEOUT_MS = 4000;

/**
 * Drop-in Image component with an automatic multi-source fallback chain:
 *   images[0] → images[1] → images[2] → category Picsum seed
 *
 * The first render always shows a stable Picsum URL (no blank flash). Once
 * the hook resolves real images they replace the fallbacks seamlessly.
 */
export default function EventImage({
  event,
  style,
  resizeMode = 'cover',
  showLoader = true,
}: EventImageProps) {
  const { images, isLoading } = useEventImages(event);

  // The chain the component actually walks: every resolved image, then the category
  // seed as a floor. Blanks and repeats are dropped — a duplicate URL is a slot that
  // fails twice for the same reason and only delays reaching a source that works.
  const sources = useMemo(() => {
    const out: string[] = [];
    for (const url of [...images, getCategoryFallback(event)]) {
      if (typeof url === 'string' && url.startsWith('http') && !out.includes(url)) {
        out.push(url);
      }
    }
    return out;
  }, [images, event]);

  const [index, setIndex] = useState(0);
  const [settled, setSettled] = useState(false);

  // Restart the chain whenever the resolved set changes (e.g. Wikipedia came back with
  // real images after the Picsum placeholders). Keyed on the contents, not the array
  // identity, so a re-render with the same URLs does not reset a source mid-load.
  const key = sources.join('|');
  useEffect(() => {
    setIndex(0);
    setSettled(false);
  }, [key]);

  const advance = useCallback(() => {
    setSettled(false);
    setIndex(prev => (prev + 1 < sources.length ? prev + 1 : prev));
  }, [sources.length]);

  // The watchdog: give the current source a fixed window to produce something, then move
  // on. Cleared as soon as the image loads or errors, so a healthy image costs nothing.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (settled || index + 1 >= sources.length) return;
    timer.current = setTimeout(advance, SOURCE_TIMEOUT_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [index, settled, sources.length, advance]);

  const currentSource = sources[index] ?? getCategoryFallback(event);

  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri: currentSource }}
        style={StyleSheet.absoluteFill}
        contentFit={resizeMode}
        transition={650}
        onLoad={() => setSettled(true)}
        onError={advance}
      />
      {showLoader && isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.loaderOverlay]}>
          <ActivityIndicator size="small" color="rgba(255,255,255,0.55)" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#121418',
  },
  loaderOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
