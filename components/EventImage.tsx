// components/EventImage.tsx
import { Image, ImageContentFit } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
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
  const [imageIndex, setImageIndex] = useState(0);

  // When the hook delivers a new set of images (e.g. Wikipedia resolved),
  // restart the fallback chain from index 0.
  useEffect(() => {
    setImageIndex(0);
  }, [images[0]]);

  // images has 3 slots; index 3 is the absolute category-based Picsum fallback
  const currentSource =
    imageIndex < images.length ? images[imageIndex] : getCategoryFallback(event);

  const handleError = useCallback(() => {
    setImageIndex(prev => Math.min(prev + 1, images.length));
  }, [images.length]);

  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri: currentSource }}
        style={StyleSheet.absoluteFill}
        contentFit={resizeMode}
        transition={650}
        onError={handleError}
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
