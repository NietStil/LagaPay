// Dutch formatting helpers for dates, money and munten.
//
// Hand-rolled on purpose: Intl / toLocaleDateString support on Hermes is inconsistent.
// All date output uses the device's local time.

const MAANDEN_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const MAANDEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];
const DAGEN = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
const DAGEN_KORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

/** U+2212 MINUS SIGN, used for negative amounts ("− 4"). */
export const MIN_TEKEN = '−';

const ISO_PATROON =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i;

/**
 * Parses an API date string into a Date without relying on the engine's Date parser.
 * Accepts `2026-07-18`, `2026-07-18 14:00:00`, `2026-07-18T14:00:00+02:00`, `...Z`, `...+0200`.
 * Date-only and offset-less strings are read as local time.
 */
export function parseDatum(waarde: string | Date): Date {
  if (waarde instanceof Date) return waarde;
  const m = ISO_PATROON.exec(waarde.trim());
  if (!m) return new Date(waarde);

  const [, j, mnd, d, u = '0', min = '0', s = '0', frac = '0', zone] = m;
  const ms = Number(frac.slice(0, 3).padEnd(3, '0'));
  const delen = [Number(j), Number(mnd) - 1, Number(d), Number(u), Number(min), Number(s), ms] as const;

  if (!zone) return new Date(...delen);

  let utc = Date.UTC(...delen);
  if (zone.toUpperCase() !== 'Z') {
    const teken = zone[0] === '-' ? -1 : 1;
    const cijfers = zone.slice(1).replace(':', '');
    const offsetMinuten = Number(cijfers.slice(0, 2)) * 60 + Number(cijfers.slice(2, 4));
    utc -= teken * offsetMinuten * 60_000;
  }
  return new Date(utc);
}

function tweeCijfers(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function zelfdeDag(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "9 mei" */
export function formatDatum(iso: string): string {
  const d = parseDatum(iso);
  return `${d.getDate()} ${MAANDEN_KORT[d.getMonth()]}`;
}

/** "18 jul – 19 jul"; a single day (or missing eind) gives "9 mei". */
export function formatDatumBereik(start: string, eind?: string | null): string {
  const s = parseDatum(start);
  if (!eind) return formatDatum(start);
  const e = parseDatum(eind);
  if (zelfdeDag(s, e)) return formatDatum(start);
  return `${formatDatum(start)} – ${formatDatum(eind)}`;
}

/** Compact range for ticket cards: "18 – 19 jul" (same month), "30 jul – 2 aug", single day "25 jul". */
export function formatDatumBereikKort(start: string, eind?: string | null): string {
  const s = parseDatum(start);
  if (!eind) return formatDatum(start);
  const e = parseDatum(eind);
  if (zelfdeDag(s, e)) return formatDatum(start);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${s.getDate()} – ${formatDatum(eind)}`;
  }
  return `${formatDatum(start)} – ${formatDatum(eind)}`;
}

/** "21:42" */
export function formatTijd(iso: string): string {
  const d = parseDatum(iso);
  return `${tweeCijfers(d.getHours())}:${tweeCijfers(d.getMinutes())}`;
}

/** "zo 23:40" */
export function formatDagTijd(iso: string): string {
  const d = parseDatum(iso);
  return `${DAGEN_KORT[d.getDay()]} ${formatTijd(iso)}`;
}

/** Day heading for timelines: "Zaterdag 18 juli". */
export function formatDagKop(iso: string): string {
  const d = parseDatum(iso);
  return `${DAGEN[d.getDay()]} ${d.getDate()} ${MAANDEN[d.getMonth()]}`;
}

/** Local calendar day key for grouping: "2026-07-18". */
export function dagSleutel(iso: string): string {
  const d = parseDatum(iso);
  return `${d.getFullYear()}-${tweeCijfers(d.getMonth() + 1)}-${tweeCijfers(d.getDate())}`;
}

/**
 * Groups items (newest first, as the API returns them) per local day, keeping their order.
 * The result can be passed straight to `<Timeline sections={...} />`.
 */
export function groepeerPerDag<T extends { datum: string }>(
  items: T[],
): { key: string; title: string; items: T[] }[] {
  const groepen: { key: string; title: string; items: T[] }[] = [];
  for (const item of items) {
    const key = dagSleutel(item.datum);
    const laatste = groepen[groepen.length - 1];
    if (laatste && laatste.key === key) {
      laatste.items.push(item);
    } else {
      groepen.push({ key, title: formatDagKop(item.datum), items: [item] });
    }
  }
  return groepen;
}

/** "€ 7,50", "€ 1.250,00". Accepts the API's decimal strings ("7.50") or numbers. */
export function formatEuro(bedrag: string | number): string {
  const n = typeof bedrag === 'number' ? bedrag : Number(bedrag);
  if (!Number.isFinite(n)) return '€ –';
  const centen = Math.round(Math.abs(n) * 100);
  const euros = Math.floor(centen / 100);
  const rest = centen % 100;
  const eurosTekst = String(euros).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const tekst = `€ ${eurosTekst},${tweeCijfers(rest)}`;
  return n < 0 && centen > 0 ? `${MIN_TEKEN} ${tekst}` : tekst;
}

/** "24 munten", "1 munt", "0 munten". */
export function formatMunten(aantal: number): string {
  return `${aantal} ${Math.abs(aantal) === 1 ? 'munt' : 'munten'}`;
}

/** Signed transactie amount: "+ 20", "− 4", "0". */
export function formatBedrag(bedrag: number): string {
  if (bedrag > 0) return `+ ${bedrag}`;
  if (bedrag < 0) return `${MIN_TEKEN} ${Math.abs(bedrag)}`;
  return '0';
}

/** Masked kaart / bankkaart number: "···· 4F2A". */
export function maskUid(laatste4: string): string {
  return `···· ${laatste4}`;
}
