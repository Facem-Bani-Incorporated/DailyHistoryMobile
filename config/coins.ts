// config/coins.ts
// Central tuning for the coin economy + referral pass. Keep all magic numbers here.

// ── Costs (coins spent to unlock) ──
export const COIN_COST_EVENT = 1;      // unlock one PRO event
export const COIN_COST_MAP_LAYER = 1;  // unlock one PRO map layer
export const COIN_COST_DAY = 1;        // unlock a locked future-day card

// ── Earning ──
export const COINS_PER_REWARDED_AD = 1; // one coin per watched rewarded clip
export const XP_PER_COIN = 1000;        // one coin for every 1000 total XP earned

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

export type CoinPopupTrigger = 'quiz' | 'map' | 'daily_quiz' | 'events' | 'no_coins';
