// store/useMapLayerPassStore.ts
// 24-hour passes for the ad-unlockable half of the map layers.
//
// The nine non-free layers used to be identical 1-coin permanent buys, which meant the
// `pro` / `video` badge distinction in the data had no behaviour behind it. They now
// split along a real seam:
//
//   AD_LAYERS  — point-marker datasets. Pleasant, interchangeable, worth one clip.
//                Open for 24h, then close again, which makes the map a recurring
//                reason to come back rather than a one-time purchase.
//   PRO_LAYERS — the crown jewels. No ad path exists.
//
// The window is deliberately temporary. A permanent unlock spends the layer's pull
// once; a daily one keeps the rewarded inventory alive without ever touching what the
// subscription sells.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const MAP_LAYER_WINDOW_MS = 24 * 60 * 60 * 1000;

interface MapLayerPassState {
  /** layer id → epoch ms when its pass lapses. */
  passes: Record<string, number>;
  unlock: (layer: string) => void;
  isUnlocked: (layer: string) => boolean;
  reset: () => void;
}

export const useMapLayerPassStore = create<MapLayerPassState>()(
  persist(
    (set, get) => ({
      passes: {},

      unlock: (layer) => set(s => {
        // Drop lapsed entries on write so the map cannot grow without bound.
        const now = Date.now();
        const live = Object.fromEntries(
          Object.entries(s.passes).filter(([, until]) => until > now),
        );
        return { passes: { ...live, [layer]: now + MAP_LAYER_WINDOW_MS } };
      }),

      isUnlocked: (layer) => {
        const until = get().passes[layer];
        return !!until && Date.now() < until;
      },

      reset: () => set({ passes: {} }),
    }),
    {
      name: 'map_layer_passes_v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Re-renders when the earliest pass lapses, so a layer re-locks without a nudge. */
export function useMapLayerPasses(): Record<string, number> {
  const passes = useMapLayerPassStore(s => s.passes);
  const [, force] = useState(0);

  const soonest = Object.values(passes).filter(t => t > Date.now()).sort((a, b) => a - b)[0];
  useEffect(() => {
    if (!soonest) return;
    const ms = soonest - Date.now();
    if (ms <= 0) return;
    const id = setTimeout(() => force(x => x + 1), ms + 250);
    return () => clearTimeout(id);
  }, [soonest]);

  return passes;
}
