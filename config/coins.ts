// config/coins.ts
// Central tuning for the coin economy + referral pass. Keep all magic numbers here.

// ── Coin / gold visual tokens ──
// Single source of truth for the coin accent so every coin surface (header pill,
// CoinRewardModal, UnlockStoryModal, Discover unlock chips, LockedTomorrowCard)
// reads the same gold. COIN_GOLD is tuned for dark backgrounds; COIN_GOLD_DEEP is
// the readable variant on light backgrounds. Pick with `isDark ? COIN_GOLD : COIN_GOLD_DEEP`.
export const COIN_GOLD = '#E8B84D';
export const COIN_GOLD_DEEP = '#C77E08';

// ── Costs (coins spent) ──
// A PRO story costs 2 so it is worth two rewarded clips rather than one: the
// clip is the highest-value ad unit in the app by an order of magnitude, and
// the user chooses to watch it.
export const COIN_COST_EVENT = 2;           // unlock one PRO event
export const COIN_COST_MAP_LAYER = 1;       // unlock one PRO map layer
export const COIN_COST_DAY = 1;             // unlock a locked day (future or archive)
export const COIN_COST_STREAK_RESTORE = 3;  // bring a broken streak back

// ── Earning ──
export const COINS_PER_REWARDED_AD = 1; // one coin per watched rewarded clip
export const XP_PER_COIN = 1000;        // one coin for every 1000 total XP earned
export const COINS_PERFECT_QUIZ = 1;    // flawless quiz run
export const COINS_WEEKLY_RECAP = 2;    // opening the Monday recap

/**
 * Rewarded clips that earn a coin per day. Past this the marginal value of an
 * impression drops (and with it eCPM), so extra views are refused rather than
 * served cheaply.
 */
export const REWARDED_DAILY_CAP = 4;

/**
 * Streak milestones and their coin bonus. Increasing rewards make the later
 * days of a streak worth protecting — which is the point of the streak.
 */
export const STREAK_MILESTONES: Record<number, number> = {
  3: 1,
  7: 2,
  14: 3,
  30: 5,
};

/** Where a coin came from / went. Sent to analytics with every movement. */
export type CoinSource =
  | 'xp_threshold'
  | 'rewarded_ad'
  | 'streak_milestone'
  | 'perfect_quiz'
  | 'weekly_recap'
  | 'referral';

export type CoinSink =
  | 'pro_story'
  | 'map_layer'
  | 'day_unlock'
  | 'streak_restore';

// ── Coin pop-up ("watch a clip for a coin") ──
// Cooldown so the opportunistic pop-up (after quiz / leaving map / daily quiz /
// opening >6 events) never spams the user.
export const COIN_POPUP_COOLDOWN_MS = 25 * 60 * 1000; // 25 min
// Open this many events in a day to arm the "opened many events" trigger.
export const EVENTS_OPEN_TRIGGER = 6;

// ── Referral ("invite a friend for a free day of PRO") ──
// A referral pass unlocks everything (OR'd into isPro). Each accepted invite
// grants one day; days stack.
export const REFERRAL_PASS_MS = 24 * 60 * 60 * 1000; // 24h per accepted invite

// Both sides of a new friendship get this, once per friend. The inviter is
// credited when the invite is accepted; the accepter, when they accept.
export const REFERRAL_COINS = 5;

export type CoinPopupTrigger = 'quiz' | 'map' | 'daily_quiz' | 'events' | 'no_coins';
