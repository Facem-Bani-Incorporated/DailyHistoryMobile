// utils/year.ts
//
// One place to turn an event into the year a screen prints.
//
// `eventDate` arrives from the backend as a Java LocalDate, so its year is padded
// to four digits ("0251-09-07") and signed for BC ("-0044-03-15"). Sliced straight
// out of that string the third century reads "0251" and the Ides of March read
// "-0044". Every screen used to do the slicing itself, so every screen shipped the
// padding — and the ones that parsed with `new Date()` or `/^(\d{3,4})/` dropped BC
// events entirely.

const BC_LABEL: Record<string, string> = {
  en: 'BC', ro: 'î.Hr.', fr: 'av. J.-C.', de: 'v. Chr.', es: 'a.C.',
};
const AD_LABEL: Record<string, string> = {
  en: 'AD', ro: 'd.Hr.', fr: 'apr. J.-C.', de: 'n. Chr.', es: 'd.C.',
};

/**
 * The year an event happened, negative for BC, `null` when there is none.
 * Accepts an ISO date (padded or signed), a `Date`, or a bare year field.
 */
export function extractYear(event: any): number | null {
  if (!event) return null;

  // An explicit `year` wins when it is a real number: it is already signed and
  // unpadded. 0 means "not set" everywhere in this codebase, never 1 BC.
  const y = event.year;
  if (typeof y === 'number' && Number.isFinite(y) && y !== 0) return Math.trunc(y);
  if (typeof y === 'string' && /^-?\d{1,6}$/.test(y.trim())) {
    const n = parseInt(y.trim(), 10);
    if (n !== 0) return n;
  }

  const raw = event.eventDate ?? event.event_date ?? event.date ?? event.year;
  if (raw instanceof Date) return raw.getFullYear();

  return parseYear(raw);
}

/** Same, for a raw value already pulled off an event (an ISO string, a year). */
export function parseYear(raw: any): number | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const m = s.match(/^(-?)(\d{1,6})(?:-\d{1,2}(?:-\d{1,2})?)?(?:[T ].*)?$/);
  if (!m) return null;
  const n = parseInt(m[2], 10) * (m[1] === '-' ? -1 : 1);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

/**
 * A year ready to print: "251", never "0251"; "44 î.Hr." for BC.
 * `era: 'ad'` also labels positive years ("251 AD") for the screens that pair a
 * birth with a death and need both sides marked.
 */
export function formatYear(
  year: number | null | undefined,
  lang: string = 'en',
  opts: { era?: 'bc' | 'ad' } = {},
): string {
  if (year === null || year === undefined || !Number.isFinite(year) || year === 0) return '';
  // Math.abs drops the sign and String drops the zero padding with it.
  const n = String(Math.abs(Math.trunc(year)));
  if (year < 0) return `${n} ${BC_LABEL[lang] ?? BC_LABEL.en}`;
  return (opts.era ?? 'bc') === 'ad' ? `${n} ${AD_LABEL[lang] ?? AD_LABEL.en}` : n;
}

/** The year of an event, ready to print. Empty string when the event has none. */
export function formatEventYear(
  event: any,
  lang: string = 'en',
  opts: { era?: 'bc' | 'ad' } = {},
): string {
  return formatYear(extractYear(event), lang, opts);
}
