// config/urls.ts
// Central configuration for third-party / external URLs used across the app.
// Keep all hardcoded http(s) URLs here so they can be updated in one place.

import { Platform } from 'react-native';

// ── Website / app store ──
export const WEBSITE_URL = 'https://dailyhistory.app';

// Legal — required in-app for App Store (Guideline 3.1.2) + Google Play.
// Hosted on Notion. Make sure each page is published "to web" before submitting.
export const PRIVACY_POLICY_URL =
  'https://eight-canidae-58f.notion.site/Privacy-Policy-36a136050c2080f7963eee6e73c39990';
export const TERMS_URL =
  'https://eight-canidae-58f.notion.site/Terms-of-use-373136050c2080df9c15cdcb4862c2e9';
export const ACCOUNT_DELETION_URL =
  'https://eight-canidae-58f.notion.site/Account-Data-Deletion-Policy-373136050c2080b19521fd0af1a5f617';

// TODO: replace id0000000000 with the real App Store ID once the listing exists.
export const APP_STORE_URL = 'https://apps.apple.com/app/id0000000000';
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.rexinus.dailyhistorymobile';

export const getStoreUrl = (): string =>
  Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;

// ── Avatars ──
const AVATAR_API_BASE = 'https://ui-avatars.com/api/';
export const buildAvatarUrl = (
  name: string,
  opts: { size?: number; bold?: boolean; background?: string; color?: string } = {},
): string => {
  const size = opts.size ?? 128;
  const bg = opts.background ?? 'ffd700';
  const color = opts.color ?? '000';
  const bold = opts.bold ?? true;
  return (
    `${AVATAR_API_BASE}?name=${encodeURIComponent(name)}` +
    `&background=${bg}&color=${color}&size=${size}${bold ? '&bold=true' : ''}`
  );
};

// ── Picsum fallback images ──
const PICSUM_BASE = 'https://picsum.photos/seed';
const PICSUM_DIMS = '800/600';

export const buildPicsumUrl = (seed: string): string =>
  `${PICSUM_BASE}/${seed}/${PICSUM_DIMS}`;

export const isPicsumUrl = (url: string | undefined | null): boolean =>
  !!url && url.includes('picsum.photos');

// ── Wikipedia / Wikimedia ──
export const WIKIPEDIA_API_URL = 'https://en.wikipedia.org/w/api.php';
export const WIKIMEDIA_COMMONS_API_URL = 'https://commons.wikimedia.org/w/api.php';

// ── Lottie animations ──
export const STREAK_LOTTIE_URI =
  'https://lottie.host/605591b9-00ac-4d2e-8fb8-fa339587ef8c/UuLbWlRAAw.lottie';

// ── Welcome screen images (Cloudinary) ──
export const WELCOME_IMAGES = [
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668729/pexels-pixabay-53442_bwyr2e.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668729/pexels-meperdinaviagem-2038361_q2nf23.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668730/pexels-pixabay-159862_q0olii.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668730/pexels-aquintanar-4448698_po20ba.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668731/pexels-alexazabache-3290068_vkui5d.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668731/pexels-robshumski-6102271_zylp73.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668732/pexels-clickerhappy-615344_wps3tw.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668733/pexels-andrea-albanese-130507-397431_vghzpi.jpg',
  'https://res.cloudinary.com/dimwqrltb/image/upload/v1771668733/pexels-alexazabache-3185480_epcnhb.jpg',
] as const;
