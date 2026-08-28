// config/wheel.ts
// The daily wheel's prize table — the single source of truth for what can be won,
// how often, and what the odds screen displays.
//
// ── Why the PRO prizes are real ──────────────────────────────────────────────
// Showing a prize that cannot be won is an unfair commercial practice under EU
// Directive 2005/29/EC Annex I §31 (creating the false impression a consumer can win
// a prize that does not exist), and both stores require published odds for this kind
// of mechanic — Apple 3.2.2(vi), Google Play's deceptive-behaviour policy. A 0%
// segment cannot be disclosed honestly, so every segment here is winnable.
//
// It is also the better business. A user who spends a few hours inside PRO and then
// loses it converts far better than one who only ever saw a paywall — that is what
// `pass_expiring` exists to catch.
//
// ── Hours, not days, and rarely ──────────────────────────────────────────────
// PRO is capped at 24 hours and sits at 1.8% across all five segments combined, so a
// daily spinner meets one roughly every eight weeks. That is deliberately a jackpot
// rather than an expectation: at ~3 minutes of PRO per spin the whole mechanic costs
// about an hour of PRO a day across the entire user base.
//
// The trade to watch: at 1.8% the PRO segments stop being a reason to spin and become
// a surprise when they land. If the wheel's pull fades, this is the number to raise —
// and `wheel_spun` reports the kind, so the effect is measurable either way.
//
// ── Why the ad wheel cannot grant PRO ────────────────────────────────────────
// Ads buy breadth and convenience; the subscription buys depth and permanence. A clip
// that hands out PRO time rebuilds exactly the substitution problem the coin economy
// had. So the FREE wheel is the one that can grant PRO, and the ad wheel doubles the
// ad-tier rewards only. That also keeps the free spin the more valuable of the two,
// which is right: it is the one that brings people back tomorrow.

export type WheelPrizeKind =
  | 'xp'
  | 'streak_shield'
  | 'future_days'
  | 'map_layer'
  | 'pro_hours';

export interface WheelPrize {
  id: string;
  kind: WheelPrizeKind;
  /** XP amount, PRO *hours*, or 1 for the on/off prizes. */
  value: number;
  /** Out of WEIGHT_TOTAL. Kept as integers so the odds screen never shows rounding drift. */
  weight: number;
  /** Segment fill. Deliberately a narrow, aged palette — brass, ink, oxblood — so the
   *  wheel reads as an instrument rather than a slot machine. */
  color: string;
  /** True for the segments that get the gold rim and the celebration. */
  rare?: boolean;
}

export const WEIGHT_TOTAL = 10000;

/**
 * Order matters: this is the physical order of the segments around the wheel, and the
 * rare prizes are deliberately spaced apart rather than clustered, so the pointer
 * passing a jackpot on the way to a small win is a frequent, visible near-miss.
 */
export const WHEEL_PRIZES: WheelPrize[] = [
  { id: 'xp_50',     kind: 'xp',            value: 50,  weight: 3150, color: '#2A3A38' },
  { id: 'pro_1h',    kind: 'pro_hours',     value: 1,   weight: 100,  color: '#0C6560', rare: true },
  { id: 'xp_150',    kind: 'xp',            value: 150, weight: 2350, color: '#33403C' },
  { id: 'map_layer', kind: 'map_layer',     value: 1,   weight: 1200, color: '#3D3524' },
  { id: 'pro_3h',    kind: 'pro_hours',     value: 3,   weight: 50,   color: '#0A544F', rare: true },
  { id: 'shield',    kind: 'streak_shield', value: 1,   weight: 1700, color: '#3A2E2A' },
  { id: 'future',    kind: 'future_days',   value: 1,   weight: 1420, color: '#2E3A44' },
  { id: 'pro_6h',    kind: 'pro_hours',     value: 6,   weight: 20,   color: '#08433F', rare: true },
  { id: 'pro_12h',   kind: 'pro_hours',     value: 12,  weight: 7,    color: '#6B4A0E', rare: true },
  { id: 'pro_24h',   kind: 'pro_hours',     value: 24,  weight: 3,    color: '#8A5A0C', rare: true },
];

/**
 * The doubling wheel, offered after a rewarded clip. Ad-tier rewards only — never PRO.
 * Fewer, fatter segments: it is a bonus round, not a second decision.
 */
export const AD_WHEEL_PRIZES: WheelPrize[] = [
  { id: 'ad_xp_100',  kind: 'xp',          value: 100, weight: 3200, color: '#2A3A38' },
  { id: 'ad_xp_300',  kind: 'xp',          value: 300, weight: 2400, color: '#33403C' },
  { id: 'ad_map',     kind: 'map_layer',   value: 1,   weight: 1800, color: '#3D3524' },
  { id: 'ad_future',  kind: 'future_days', value: 1,   weight: 1600, color: '#2E3A44' },
  { id: 'ad_xp_1000', kind: 'xp',          value: 1000, weight: 1000, color: '#6B4A0E', rare: true },
];

/** One free spin per calendar day. The ad wheel unlocks only after that spin is used. */
export const SPINS_PER_DAY = 1;

/**
 * Pick a prize. Walks the cumulative weights, so a segment's chance is exactly its
 * weight ÷ WEIGHT_TOTAL — the number the odds screen prints.
 *
 * Client-side is fine at this scale. Past a few hundred daily users this belongs on the
 * server: the table ships inside the JS bundle and is readable by anyone who looks.
 */
export function drawPrize(prizes: WheelPrize[] = WHEEL_PRIZES): WheelPrize {
  const total = prizes.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * total;
  for (const prize of prizes) {
    roll -= prize.weight;
    if (roll <= 0) return prize;
  }
  return prizes[0];
}

/** Percentage for the odds screen. Generated from the table so the two can never drift. */
export function oddsPercent(prize: WheelPrize, prizes: WheelPrize[] = WHEEL_PRIZES): string {
  const total = prizes.reduce((sum, p) => sum + p.weight, 0);
  const pct = (prize.weight / total) * 100;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  if (pct >= 0.1) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(3)}%`;
}
