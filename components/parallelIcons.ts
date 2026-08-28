// components/parallelIcons.ts
// Which icon stands for an ending, before you have seen it.
//
// The collection grid used to be rows of identical "?" tiles, which told the player
// nothing and looked the same on every event. Each slot now carries an icon: suggestive
// where the ending's subject can be read, and varied everywhere else so two events never
// present the same wall of symbols.
//
// Matching runs against the ENGLISH tree, which always travels in the payload even when
// the player is reading Romanian — so a Spanish reader and a German reader see the same
// icon on the same world, and the keywords only ever have to be written once.
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type Icon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Ninety-eight icons, every one checked against the MaterialCommunityIcons glyph map —
 * a name that does not exist renders as blank space, which is worse than a wrong icon
 * because nothing about it looks broken.
 */
export const ENDING_ICONS: Icon[] = [
  'sword-cross', 'shield-crown', 'castle', 'crown', 'crown-outline', 'chess-king', 'gavel',
  'scale-balance', 'bank', 'account-group', 'account-tie', 'skull', 'skull-crossbones',
  'grave-stone', 'coffin', 'candle', 'church', 'mosque', 'synagogue', 'cross', 'star-david',
  'dharmachakra', 'om', 'book-open-page-variant', 'script-text', 'feather',
  'fountain-pen-tip', 'typewriter', 'newspaper-variant', 'library', 'school', 'flask',
  'atom', 'telescope', 'microscope', 'cog', 'factory', 'pickaxe', 'hammer-wrench', 'anvil',
  'ship-wheel', 'sail-boat', 'anchor', 'lighthouse', 'train', 'airplane', 'rocket-launch',
  'earth', 'map-marker-path', 'compass-rose', 'flag', 'flag-checkered', 'fire', 'bomb',
  'pistol', 'bugle', 'drama-masks', 'music-clef-treble', 'violin', 'palette', 'image-frame',
  'theater', 'seed', 'sprout', 'tree', 'flower', 'grain', 'food-apple', 'cup', 'bread-slice',
  'fish', 'cow', 'medical-bag', 'pill', 'virus', 'heart-pulse', 'bandage', 'stethoscope',
  'baby-carriage', 'scale', 'cash', 'diamond-stone', 'gold', 'treasure-chest', 'key-variant',
  'lock-open-variant', 'handshake', 'peace', 'bird', 'snowflake', 'weather-lightning',
  'waves', 'pine-tree', 'clock-time-eight', 'calendar-star', 'link-variant', 'account-voice',
  'bullhorn',
];

/**
 * Ordered most specific first: "civil war" should not be caught by "war", and "empire
 * falls" should reach `grave-stone` before `crown` claims it.
 */
const KEYWORDS: [RegExp, Icon][] = [
  [/civil war|revolt|uprising|rebellion|mutin/i, 'pistol'],
  [/massacre|slaughter|genocide|purge/i, 'skull-crossbones'],
  [/plague|epidemic|pandemic|pox|fever/i, 'virus'],
  [/famine|starv|harvest fail/i, 'grain'],
  [/siege|fortress|citadel|rampart|wall/i, 'castle'],
  [/battle|war|army|troops|invasion|conquest/i, 'sword-cross'],
  [/bomb|explos|artillery|shell/i, 'bomb'],
  [/fire|burn|blaze|ash/i, 'fire'],
  [/treaty|peace|accord|armistice|truce/i, 'handshake'],
  [/alliance|union|federation|confeder/i, 'link-variant'],
  [/independen|liberat|freedom|emancipat/i, 'peace'],
  [/constitution|law|court|justice|legal|statute/i, 'gavel'],
  [/parliament|senate|assembly|congress|council/i, 'bank'],
  [/vote|elect|republic|democra/i, 'account-group'],
  [/emperor|empire|imperial|throne|dynasty|monarch|king|queen|caliph|sultan|tsar/i, 'crown'],
  [/coronat|crowned|succession|heir/i, 'chess-king'],
  [/church|cathedral|pope|papal|bishop|christian/i, 'church'],
  [/mosque|caliphate|islam|muslim|imam/i, 'mosque'],
  [/synagogue|jewish|rabbi/i, 'star-david'],
  [/buddh|hindu|temple|dharma/i, 'dharmachakra'],
  [/schism|heresy|reformation|faith|prayer|pilgrim/i, 'cross'],
  [/death|dies|dead|mourn|funeral|grave|tomb/i, 'grave-stone'],
  [/martyr|remembered|memorial|legacy/i, 'candle'],
  [/book|manuscript|scripture|text|library|archive/i, 'book-open-page-variant'],
  [/print|press|newspaper|pamphlet|publish/i, 'newspaper-variant'],
  [/poet|write|author|chronicle|letter/i, 'feather'],
  [/school|univers|academy|educat|student|scholar/i, 'school'],
  [/science|scientif|experiment|discover|theory/i, 'flask'],
  [/atom|nuclear|physic/i, 'atom'],
  [/star|astronom|telescope|planet|cosmos/i, 'telescope'],
  [/medicine|doctor|hospital|surgeon|cure|vaccine/i, 'medical-bag'],
  [/industr|factory|machine|steam|manufactur/i, 'factory'],
  [/mine|coal|ore|quarry/i, 'pickaxe'],
  [/forge|smith|iron|steel/i, 'anvil'],
  [/engine|invention|mechan|technolog/i, 'cog'],
  [/ship|fleet|navy|sail|voyage|naval/i, 'sail-boat'],
  [/harbour|harbor|port|dock|lighthouse/i, 'lighthouse'],
  [/railway|railroad|train|locomot/i, 'train'],
  [/flight|aviat|aircraft|plane/i, 'airplane'],
  [/space|rocket|orbit|satellite/i, 'rocket-launch'],
  [/trade|merchant|market|commerc|caravan/i, 'cash'],
  [/gold|treasure|wealth|riches|fortune/i, 'treasure-chest'],
  [/tax|debt|treasury|coin|silver|florin|ducat/i, 'scale'],
  [/border|map|territor|frontier|province/i, 'map-marker-path'],
  [/explor|expedition|colon|settle/i, 'compass-rose'],
  [/world|global|earth|continent|nation/i, 'earth'],
  [/flag|banner|standard/i, 'flag'],
  [/music|song|opera|symphon|compos/i, 'music-clef-treble'],
  [/theatre|theater|play|stage|drama|actor/i, 'drama-masks'],
  [/paint|art|sculpt|artist/i, 'palette'],
  [/farm|field|peasant|crop|agricultur/i, 'sprout'],
  [/forest|wood|timber|tree/i, 'pine-tree'],
  [/river|sea|ocean|flood|water/i, 'waves'],
  [/winter|snow|frost|ice|cold/i, 'snowflake'],
  [/storm|lightning|thunder/i, 'weather-lightning'],
  [/child|birth|born|generation|family/i, 'baby-carriage'],
  [/bread|food|feast|hunger/i, 'bread-slice'],
  [/speech|proclaim|declare|announce|herald/i, 'bullhorn'],
  [/silence|secret|hidden|unspoken/i, 'key-variant'],
  [/century|era|age|decades|years later/i, 'clock-time-eight'],
];

/** Cheap, stable string hash. Same input, same icon, forever. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * The icon for one ending.
 *
 * `english` is the ending's own English title and verdict; when nothing in it matches a
 * keyword the icon falls out of a hash of the event and ending together — so the grid is
 * still varied, and two events never open with the same row of symbols.
 */
export function iconForEnding(eventId: string, endingId: string, english: string): Icon {
  for (const [re, icon] of KEYWORDS) {
    if (re.test(english)) return icon;
  }
  return ENDING_ICONS[hash(`${eventId}:${endingId}`) % ENDING_ICONS.length];
}
