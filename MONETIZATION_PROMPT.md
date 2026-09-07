# Role

You are a **senior mobile growth & monetization strategist who is also a hands-on React Native / Expo engineer**. You have shipped freemium consumer apps that moved from ad-heavy to subscription-led, and you know the trade-off curve between rewarded-ad revenue, retention, and IAP conversion. You think in terms of activation → habit → paywall intent, not in terms of features.

You will be working in a real, live production codebase (v1.2.0, on the App Store and Google Play, RevenueCat is already taking real money). Treat every recommendation as something that will ship.

---

# The app: Daily History

A daily-history mobile app (Expo / React Native, iOS + Android). Every day the backend publishes a set of historical events for that date. The user reads short "stories", takes quizzes, keeps a streak, saves events, and explores an interactive world map with historical layers.

**Package/bundle:** `com.rexinus.dailyhistorymobile` (Android) / `com.rexinus.DailyHistoryMobile` (iOS)

## Stack

- **Expo SDK 54**, React Native 0.81.5, React 19, TypeScript **strict**
- **expo-router** with typed routes. Two route groups: `app/(auth)/` (welcome/login/register) and `app/(main)/` (`index`, `saved`). The tab bar is **not** expo-router tabs — `app/(main)/index.tsx` (1898 lines) renders its own `<TabBar>` and switches internally between `today / discover / timeline / map / saved`.
- **Zustand** stores in `store/`, all persisted to AsyncStorage, most partitioned per-user under a `_perUser` key.
- **axios** single instance in `api.ts` (Railway backend, `/api/v1`), token from `useAuthStore`, 401 → logout.
- **RevenueCat** (`react-native-purchases` + `react-native-purchases-ui`) for the subscription.
- **AdMob** via `react-native-google-mobile-ads`.
- **PostHog** analytics via a hand-rolled pure-JS fetch client at `src/analytics/posthog.ts` (no native module, so it ships over `eas update`).
- **Firebase Analytics**, Google/Apple sign-in, expo-notifications, react-native-maps.
- i18n: `context/LanguageContext.tsx` — inline translations object for **5 languages: `en | ro | fr | de | es`**. Many components also carry their own local `L`/`T` translation tables. Any new user-facing string must be added in all five.
- Theming: `context/ThemeContext.tsx` — `dark | light | system | premium` palettes.
- **No test runner is configured.** `react-test-renderer` is installed but there is no `test` script — do not invent one. Typecheck with `npx tsc --noEmit`.
- Builds: `eas build --profile preview|production`. Expo Go does not work (dev client required).

---

# CURRENT monetization architecture (this is what you must change)

## 1. Subscription — RevenueCat

`context/RevenueCatContext.tsx`, config in `config/revenuecat.ts`.

- Entitlement identifier is exactly `"Daily History Pro"`.
- `isPro = referralPass || (!subscriptionRevoked && (RC entitlement || user.is_pro))`. Backend `is_pro` (set by the RevenueCat webhook) is the durable fallback; `refreshMe()` (`GET /users/me`) pulls it on identity sync and on foreground.
- Cancellation is treated as immediate: reading `unsubscribeDetectedAt` or `billingIssueDetectedAt` drops PRO on the spot.
- `presentPaywall(trigger)` opens **RevenueCat's own hosted paywall UI**. The paywall design, pricing, packages, and whether a close button exists are configured in the RevenueCat dashboard, **not in this repo**. Code only decides *when* it opens.

> **This integration is live and taking real money. Do not modify the RevenueCat wiring, entitlement id, or purchase flow.** You may change *when* and *where* `presentPaywall()` is called, and what the trigger strings are.

## 2. Paywall timing policy

`store/usePaywallStore.ts` + `hooks/usePaywallTrigger.ts`.

The paywall is deliberately **not** in onboarding. It is intent-based, three triggers, each firing **once ever**, with a **72h global cooldown** so two triggers can't stack:

| Trigger | Condition |
|---|---|
| `second_session` | `sessions >= 2` |
| `failed_unlocks` | `failedUnlocks >= 3` (user tried to unlock with no coins) |
| `rewarded_milestone` | `rewardedWatched >= 5` (at which point "no ads" is a credible pitch) |

`usePaywallTrigger.maybeShow()` gates on RevenueCat's `ready` flag — firing before entitlements resolve would show a paywall to a paying subscriber. It marks the trigger as spent *before* presenting.

Direct `presentPaywall('...')` calls also exist at various call sites (`saved_screen`, `pro_card_tap`, `locked_tomorrow_main_day1`, `locked_tomorrow_discover_day1`, `locked_tomorrow_main_day2`, `locked_tomorrow_discover_day2`, etc.).

## 3. The coin economy — THE THING TO DELETE

`config/coins.ts` + `store/useCoinStore.ts` (16KB) + `store/useCoinPopupStore.ts` + `hooks/useCoins.ts` + `components/CoinIcon.tsx` + `components/CoinRewardModal.tsx` + `components/UnlockStoryModal.tsx`.

**Costs (spend):**
```
COIN_COST_EVENT          = 2   // unlock one PRO event/story
COIN_COST_MAP_LAYER      = 1   // unlock one PRO map layer
COIN_COST_DAY            = 1   // unlock a locked future/archive day
COIN_COST_STREAK_RESTORE = 3
```

**Earning:**
```
COINS_PER_REWARDED_AD = 1     // one coin per rewarded clip
XP_PER_COIN           = 1000  // one coin per 1000 total XP
COINS_PERFECT_QUIZ    = 1
COINS_WEEKLY_RECAP    = 2
REFERRAL_COINS        = 5     // both sides of a new friendship
STREAK_MILESTONES     = { 3:1, 7:2, 14:3, 30:5 }
```

**Caps:**
```
REWARDED_DAILY_CAP     = 4      // rewarded clips that pay a coin per day
PRO_UNLOCKS_PER_DAY    = 4      // PRO stories buyable with coins per day
COIN_POPUP_COOLDOWN_MS = 25 min
EVENTS_OPEN_TRIGGER    = 6      // open >6 events → arm the coin pop-up
REFERRAL_PASS_MS       = 24h    // an accepted invite = 1 free day of full PRO
```

`useCoinStore` persists per-user: `coins`, `unlockedEvents[]`, `unlockedMapLayers[]`, `unlockedDays[]`, `xpCoinsClaimed`, `referralPassUntil`, `creditedReferralFriendIds[]`, `claimedStreakMilestones[]`, `claimedRecapWeeks[]`, plus device-local counters. A subset (`SYNCED_KEYS`) rides along in the gamification sync blob (see below) so it survives reinstall and syncs across devices.

**Files that touch coins (all of these will need work):**
```
app/(main)/index.tsx              components/CoinRewardModal.tsx
app/_layout.tsx                   components/DiscoverSection.tsx
components/AchievementToast.tsx   components/FriendsModal.tsx
components/CelebrationOverlay.tsx components/LockedTomorrowCard.tsx
components/CoinIcon.tsx           components/MapScreen.tsx
components/OfflineState.tsx       components/ProfileModal.tsx
components/StoryModal.tsx         components/StreakRestoreModal.tsx
components/UnlockStoryModal.tsx   components/WeeklyRecapModal.tsx
components/XpBoostOffer.tsx       config/coins.ts
context/RevenueCatContext.tsx     hooks/useCoins.ts
hooks/useGamificationSync.ts      hooks/useQuiz.ts
hooks/useReferralRewards.ts       store/useCoinPopupStore.ts
store/useCoinStore.ts             store/useGamificationStore.ts
store/usePaywallStore.ts          utils/Notifications.ts
```

Note: `COIN_GOLD` / `COIN_GOLD_DEEP` from `config/coins.ts` are also used purely as **colour tokens** by `AchievementToast`, `CelebrationOverlay`, `OfflineState`, `LockedTomorrowCard` — those usages are cosmetic and must survive the removal.

## 4. Ads — AdMob

`config/ads.ts`, `hooks/useAdsInit.ts`, `hooks/useRewardedAd.ts`, `hooks/useRewardedUnlock.ts`, `hooks/useInterstitialAd.ts`, `services/rewardedAdManager.ts`.

- `USE_TEST_IDS = false` — **real ad units are live**.
- **Policy: every ad is user-initiated. There are no interstitials anywhere** (the post-quiz one was removed deliberately). `useInterstitialAd.ts` still exists but is unused.
- `services/rewardedAdManager.ts` is a **single app-wide rewarded ad instance**. It exists because five permanently-mounted components each used to load their own ad — AdMob counted 5 requests per 1 impression, which held the show rate near 22% and drew a fill throttle on 2 Aug (290 requests, 17% match rate). Max 4 retries with exponential backoff.
- `useRewardedUnlock().showForUnlock(cb, placement)` — **if no ad is loaded, the unlock is granted anyway** rather than punishing the user for a fill problem.
- Ad surfaces that remain:
  - **Banner** — `app/(main)/index.tsx:1623`, shown on tabs `['today','discover','timeline','saved']` when `!isPro`.
  - **AdCard** — a full-slot "Sponsored" card inside the horizontal day pager, every `AD_CARD_DAY_FREQUENCY = 7` days in the *past* archive only (`dayOff < 0 && tab === 'today'`), preloaded 2 pages out.
  - **Rewarded clips** — `REWARDED_XP_BONUS = 500` XP.

## 5. Content gating today

- Backend `/daily-content/by-date` returns FREE and PRO events **mixed** in one payload; the client splits on `event.isPro`. Cache key prefix `dh_v3_<iso>` in AsyncStorage.
- **Today / past days:** free events open; PRO events show `ProCardSection` (today tab) or a locked PRO card (Discover) → coin spend or `UnlockStoryModal`.
- **Future days (+1, +2):** `LockedTomorrowCard` with `coinCost={COIN_COST_DAY}` — currently unlocked by **spending 1 coin**, not by watching an ad. The card supports both modes (`coinMode` when `coinCost` is a number, otherwise a "Watch & Unlock" clip CTA) and has a secondary "Get PRO" link. Unlock state is **React state only, resets daily** (`tomorrowMainUnlocked`, `tomorrowDiscoverUnlocked`, `day2MainUnlocked`, `day2DiscoverUnlocked`) — four separate flags for main vs discover × day1 vs day2.
- **Map layers** (`components/MapScreen.tsx`, 3793 lines): 14 selectable layers.
  - badge `free` (5): `heatmap`, `battles`, `ww1`, `ww2`, `religion`
  - badge `pro` (6): `time`, `empires`, `plagues`, `pirates`, `nuclear`, `dinosaurs`
  - badge `video` (3): `routes`, `cities`, `trade`
  - Currently **all 9 non-free layers cost 1 coin**, permanently unlocked once bought. The `pro` vs `video` badge distinction exists in the data but has **no behavioural difference** anymore — both paths are identical coin spends.
- **Saved events** (`app/(main)/saved.tsx`, `store/useSavedStore.ts`): saving is **completely unlimited and free**. Only **Collections** (custom folders) are PRO-gated — `openCreateCollection()` calls `presentPaywall('saved_screen')`.
- **Streak restore** (`components/StreakRestoreModal.tsx`): 3 coins **or** watch a clip.
- **Referral** (`hooks/useReferralRewards.ts`, `components/FriendsModal.tsx`): an accepted invite grants 5 coins to both sides + a 24h full-PRO pass that is OR'd into `isPro`.

## 6. Gamification (context — mostly out of scope)

`store/useGamificationStore.ts` (54KB) + `hooks/useGamificationSync.ts`. XP, streaks, achievements, daily-goal log, calendar log, weekly recaps. 100 levels at `level * 100` XP each. Syncs `GET /gamification` on login and `PUT /gamification` every 5 min / on background / on logout, sending a flat header plus an opaque `gamificationData` JSON blob the backend just stores. **The coin data rides inside that blob** — removing coins must not break the sync contract or orphan existing users' data.

## 7. Analytics available (PostHog)

```
app_opened, story_opened, story_completed, quiz_started, quiz_completed,
paywall_viewed {trigger}, paywall_dismissed {trigger, seconds_visible, outcome},
rewarded_ad_started {placement}, rewarded_ad_completed {placement},
rewarded_ad_abandoned {placement}, pro_story_unlocked {event_id, used_today, cap},
coin_earned {amount, source, balance}, coin_spent {amount, sink, balance},
streak_freeze_used, streak_lost, notification_opened
```

`paywall_dismissed.outcome` ∈ `PURCHASED | RESTORED | CANCELLED | ERROR | NOT_PRESENTED`.

---

# WHAT I WANT — the target model

My goals, in priority order:

1. **Raise subscription conversion.** The subscription is the business; ads are a distant second.
2. **Reduce total ad load** — fewer, better-placed, always user-initiated ads.
3. **Kill the coin economy entirely.**

## Hard requirements

### A. Remove coins — completely

- No coin balance, no coin icon, no coin pop-up, no "earn a coin" anywhere.
- **Nothing in the app may be unlocked by spending a coin.** Not stories, not map layers, not days, not streak restores.
- Delete/retire `config/coins.ts` (keeping the two colour tokens somewhere sane), `store/useCoinStore.ts`, `store/useCoinPopupStore.ts`, `hooks/useCoins.ts`, `components/CoinIcon.tsx`, `components/CoinRewardModal.tsx`, and the coin paths in every file listed above.
- Handle the **migration** for existing users who have banked coins and coin-bought unlocks (`unlockedEvents`, `unlockedMapLayers`, `unlockedDays`) — permanently-owned content must not silently disappear, and the gamification sync blob must stay valid.
- Decide and propose what replaces coins in the places that used them as a *reward* rather than a currency: perfect quiz, weekly recap, streak milestones, XP thresholds, referral.

### B. The only rewarded-ad unlock that survives: future days

- "**Watch an ad to unlock the next 2 days of events**" — days +1 and +2.
- This is the single remaining rewarded-ad unlock for content. `LockedTomorrowCard` goes back to clip mode.
- Think about whether one clip should unlock **both** days and **both** surfaces (main + discover) at once instead of the current four separate flags — four unlock states for what the user perceives as "tomorrow" is friction that costs conversion, and four clips for two days is exactly the ad load I want to cut.
- Whether the unlock should persist beyond the current day, and whether PRO should be pitched next to it, is your call — argue it.

### C. Map layers: half ads, half subscription

- Split the 9 currently-coin-gated layers into two groups:
  - one group unlockable by **watching a rewarded clip**,
  - one group **subscription-only** (no ad path at all).
- The existing `pro` (6) vs `video` (3) badges are the obvious seam but the split is uneven — propose the actual allocation and justify it by which layers are the strongest "I want this" hooks. The subscription-only set should contain the most desirable layers, because those are the ones that sell PRO.
- The 5 free layers stay free.

### D. Saved events: subscription-gated

- Saving events becomes a PRO feature. Collections already are.
- Propose the exact shape: a small free allowance (e.g. N saves, then the paywall) vs. hard gate from the first save. I lean toward a free allowance because a hard gate on save kills the habit before it forms — but make the call, give me the number, and justify it.
- Existing users already have saved events. They must not lose them.

### E. Everything else

- Streak restore keeps its rewarded-clip path (no coin path).
- Keep the "no interstitials, every ad user-initiated" policy.
- Reconsider the banner and the AdCard: with fewer rewarded unlocks, the banner becomes a larger share of the ad experience *and* of the "remove ads" pitch. Tell me whether to keep, shrink, or move them.
- Revisit the paywall timing policy in `usePaywallStore.ts` — the `failed_unlocks` trigger is defined in terms of failed **coin** unlocks and will be dead code once coins are gone. Replace it with something that fires on real intent under the new model.

---

# What I want from you

Do **not** start editing files yet. First produce:

## 1. A monetization diagnosis

Where the current model leaks conversion. Be specific and cite the code — e.g. what the coin economy actually does to willingness-to-pay, what `PRO_UNLOCKS_PER_DAY = 4` really costs, whether the 72h paywall cooldown plus once-ever triggers means a large share of users literally never see the paywall twice.

## 2. The proposed new model, in full

A single coherent free/PRO/ad matrix covering: today's stories, PRO stories, past archive, future days, map layers, saved events, collections, streak restore, quizzes, referral. For each: free / rewarded-ad / PRO-only, and why.

## 3. A paywall and pricing-surface plan

When the paywall fires, from which surfaces, what the trigger strings should be, what the RevenueCat-dashboard paywall should say for each entry point (I configure that side myself — give me the copy and the reasoning). Include soft-gate/teaser patterns that outperform hard walls.

## 4. An implementation plan

File-by-file, ordered, with the migration path for existing users' coins, unlocks, and the gamification sync blob. Flag anything that risks breaking the live RevenueCat flow or AdMob account health. Call out every place that needs new strings in all 5 languages.

## 5. An analytics plan

Which events to add/rename/remove so I can actually measure conversion before and after, plus the specific PostHog funnels and the metrics I should watch (free→trial→paid, ARPDAU split ads vs IAP, rewarded show rate, save-gate hit rate, paywall view→purchase per trigger).

## 6. Risks and what you would A/B test

Including the revenue I am giving up by cutting ads, and how long it should take the subscription lift to cover it.

---

# Constraints

- TypeScript **strict**. No test runner — verify with `npx tsc --noEmit`.
- Every new user-facing string needs `en / ro / fr / de / es`. Check both `context/LanguageContext.tsx` and the component-local `L`/`T` tables.
- Do not touch the RevenueCat purchase wiring, the entitlement id `"Daily History Pro"`, or `config/revenuecat.ts`.
- Do not add interstitials.
- Do not add a separate expo-router tab layout — the tab switcher lives inside `app/(main)/index.tsx`.
- All API calls go through the shared axios instance in `api.ts`.
- Keep the single-instance rewarded ad manager; do not reintroduce per-component `RewardedAd.load()`.
- The app is live. Anything that changes what an existing paying or ad-watching user already owns must have a migration story.

Ask me questions where a decision is genuinely mine to make (price points, how aggressive the save gate is, which layers are the crown jewels). Otherwise, make the call and justify it.
