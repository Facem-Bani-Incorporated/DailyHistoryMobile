// config/avatars.ts
//
// Selectable profile avatars. Uses DiceBear (https://dicebear.com) — a
// well-known avatar library served over HTTPS, so no bundled image assets or
// native deps are needed. Each seed is a distinct character in one style.
const STYLE = 'adventurer';
const SIZE = 160;

const SEEDS = [
  'Aurora', 'Atlas', 'Nova', 'Leo', 'Mia', 'Kai', 'Ruby', 'Milo',
  'Luna', 'Finn', 'Sasha', 'Ivy', 'Max', 'Zoe', 'Remy',
];

export interface AvatarOption {
  id: string;
  url: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = SEEDS.map((seed) => ({
  id: seed,
  url: `https://api.dicebear.com/9.x/${STYLE}/png?seed=${encodeURIComponent(seed)}&size=${SIZE}`,
}));
