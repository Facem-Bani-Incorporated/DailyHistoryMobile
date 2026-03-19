// hooks/useGamificationSync.ts
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useGamificationStore } from '../store/useGamificationStore';

/**
 * Syncs gamification data with the current authenticated user.
 *
 * Place this hook ONCE in your root layout / App component:
 *
 *   function App() {
 *     useGamificationSync();
 *     return <Navigation />;
 *   }
 *
 * What it does:
 *  - On login  → loads that user's streak/calendar data from AsyncStorage
 *  - On logout → clears in-memory gamification state
 *  - On user switch → saves old user's data, loads new user's data
 *  - On app open (already logged in) → rehydrates + records daily visit
 *  - Every Monday → generates weekly recap for previous week
 */
export function useGamificationSync() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const switchUser = useGamificationStore((s) => s.switchUser);
  const clearUserData = useGamificationStore((s) => s.clearUserData);
  const recordDailyVisit = useGamificationStore((s) => s.recordDailyVisit);
  const generateWeeklyRecap = useGamificationStore((s) => s.generateWeeklyRecap);

  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handle = async () => {
      if (isAuthenticated && user?.id) {
        // User logged in (or app opened while logged in)
        if (prevUserIdRef.current !== user.id) {
          await switchUser(user.id);
          prevUserIdRef.current = user.id;
        }

        // Record today's visit (updates streak)
        recordDailyVisit();

        // Generate weekly recap if it's a new week (Monday or later)
        // We try to generate it every time — the store will skip if already exists
        try {
          generateWeeklyRecap();
        } catch {
          // Silent — recap generation is non-critical
        }
      } else {
        // Logged out
        if (prevUserIdRef.current !== null) {
          clearUserData();
          prevUserIdRef.current = null;
        }
      }
    };

    handle();
  }, [isAuthenticated, user?.id]);
}