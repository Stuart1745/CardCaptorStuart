// Card prices for decks, by the exact printing each deck holds. Client-side.
//
// Each deck card stores the Scryfall ID of its printing (`printing`; older entries carry it in
// their image URL) and whether the copy is foil. Scryfall's /cards/collection takes 75 IDs per
// request and returns TCGplayer market prices, updated once a day. Prices are kept in the
// visitor's browser for 12 hours so the Deck Hub doesn't re-ask on every visit.

import type { DeckCardEntry } from "@/lib/decks";

type Ident = { id: string } | { set: string; collector_number: string } | { name: string };
interface ScryfallPriced {
  id: string; name: string; set: string; collector_number: string;
  prices?: { usd?: string | null; usd_foil?: string | null; usd_etched?: string | null };
  card_faces?: { name: string }[];
}
/** [non-foil, foil, etched] in dollars */
type Row = [number | null, number | null, number | null];

const CACHE_KEY = "ccs-card-prices-v1";
const TTL_MS = 12 * 60 * 60 * 1000;

const ID_IN_IMAGE = /\/front\/[0-9a-f]\/[0-9a-f]\/([0-9a-f-]{36})\.jpg/;
const PRINT_IN_URI = /scryfall\.com\/card\/([^/]+)\/([^/]+)\//;

/** How to look a card up: its exact printing when known, by name only as a last resort. */
export function cardIdent(card: Pick<DeckCardEntry, "name" | "printing" | "image" | "scryfallUri">): Ident {
  const id = card.printing ?? card.image?.match(ID_IN_IMAGE)?.[1];
  if (id) return { id };
  const p = card.scryfallUri?.match(PRINT_IN_URI);
  if (p) return { set: p[1], collector_number: decodeURIComponent(p[2]) };
  return { name: card.name };
}
const identKey = (i: Ident) => ("id" in i ? `id:${i.id}` : "set" in i ? `p:${i.set}/${i.collector_number}` : `n:${i.name.toLowerCase()}`);

function readCache(): Record<string, Row> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const c = raw ? (JSON.parse(raw) as { at: number; rows: Record<string, Row> }) : null;
    return c && Date.now() - c.at < TTL_MS ? c.rows : {};
  } catch { return {}; }
}
function writeCache(rows: Record<string, Row>) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const prev = raw ? (JSON.parse(raw) as { at: number }) : null;
    // Keep the original timestamp so the whole cache expires together
    const at = prev && Date.now() - prev.at < TTL_MS ? prev.at : Date.now();
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at, rows }));
  } catch { /* private mode or full storage: prices just aren't remembered */ }
}

const num = (s?: string | null) => (s ? parseFloat(s) : null);

/** Scryfall's /cards/collection allows about two requests a second; faster bursts are refused. */
const GAP_MS = 550;
let lastCall = 0;
const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

/** One /cards/collection call, spaced from the last one and retried after a refusal. */
async function collectionCall(identifiers: Ident[]): Promise<ScryfallPriced[]> {
  for (let attempt = 0; ; attempt++) {
    const wait = lastCall + GAP_MS - Date.now();
    if (wait > 0) await pause(wait);
    lastCall = Date.now();
    try {
      const res = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers }),
      });
      if (res.ok) return ((await res.json()) as { data: ScryfallPriced[] }).data;
      if (res.status !== 429 && res.status < 500) throw new Error(`Scryfall answered ${res.status}`);
    } catch (e) {
      // A rate-limit refusal arrives without CORS headers, so the browser reports a network error
      if (attempt >= 3) throw e;
    }
    if (attempt >= 3) throw new Error("Scryfall kept refusing");
    await pause(3000 * (attempt + 1));
  }
}

/**
 * Price rows for many cards at once (deduplicated), keyed by identKey. If Scryfall stops
 * answering partway, it returns what it has (kept in the cache) with complete: false.
 */
async function fetchRows(idents: Ident[], onProgress?: (done: number, total: number) => void): Promise<{ rows: Record<string, Row>; complete: boolean }> {
  const rows = readCache();
  const missing = [...new Map(idents.map(i => [identKey(i), i])).values()].filter(i => !(identKey(i) in rows));
  onProgress?.(0, missing.length);
  let complete = true;
  for (let i = 0; i < missing.length; i += 75) {
    const chunk = missing.slice(i, i + 75);
    let found: ScryfallPriced[];
    try {
      found = await collectionCall(chunk);
    } catch {
      complete = false;
      break;
    }
    // Store each card under the key it was asked for (by printing or name), plus its ID
    const asked = new Set(chunk.map(identKey));
    for (const c of found) {
      const row: Row = [num(c.prices?.usd), num(c.prices?.usd_foil), num(c.prices?.usd_etched)];
      rows[`id:${c.id}`] = row;
      const printing = `p:${c.set}/${c.collector_number}`;
      if (asked.has(printing)) rows[printing] = row;
      for (const n of [c.name, ...(c.card_faces ?? []).map(f => f.name)]) {
        if (asked.has(`n:${n.toLowerCase()}`)) rows[`n:${n.toLowerCase()}`] ??= row;
      }
    }
    // Cards Scryfall couldn't find get an empty row, so they aren't asked for again
    for (const m of chunk) rows[identKey(m)] ??= [null, null, null];
    onProgress?.(Math.min(i + 75, missing.length), missing.length);
    if ((i / 75) % 10 === 9) writeCache(rows); // a long run survives leaving the page
  }
  if (missing.length) writeCache(rows);
  return { rows, complete };
}

/** The price of one copy: the foil price for a foil copy, falling back to whatever finish exists. */
function pick(row: Row | undefined, foil: boolean): number | null {
  if (!row) return null;
  const [usd, usdFoil, etched] = row;
  return foil ? usdFoil ?? etched ?? usd : usd ?? usdFoil ?? etched;
}

export interface DeckValue {
  /** Market value of the commander(s) and main deck */
  total: number;
  /** Price of one copy of each card, by `${board}|${name}`; null = no price */
  each: Map<string, number | null>;
  /** Cards with no price (counted as $0) */
  unpriced: number;
}

export const valueKey = (c: Pick<DeckCardEntry, "board" | "name">) => `${c.board}|${c.name}`;

/** Values for several decks with one shared, deduplicated lookup. */
export async function deckValues(decks: { id: string; cards?: DeckCardEntry[] }[]): Promise<Record<string, DeckValue>> {
  const all = decks.flatMap(d => d.cards ?? []);
  const { rows } = await fetchRows(all.map(cardIdent));
  const out: Record<string, DeckValue> = {};
  for (const d of decks) {
    const each = new Map<string, number | null>();
    let total = 0, unpriced = 0;
    for (const c of d.cards ?? []) {
      const price = pick(rows[identKey(cardIdent(c))], !!c.foil);
      each.set(valueKey(c), price);
      if (c.board === "sideboard") continue;
      if (price == null) unpriced += c.qty;
      else total += price * c.qty;
    }
    out[d.id] = { total, each, unpriced };
  }
  return out;
}

/**
 * Today's price for each printing (Scryfall ID) and finish, keyed `${id}|${finish}`.
 * Used by the collection, which can run to thousands of printings: onProgress reports
 * how many Scryfall lookups are done.
 */
export async function pricePrintings(
  items: { id: string; finish?: "foil" | "etched" }[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ prices: Map<string, number | null>; complete: boolean }> {
  const { rows, complete } = await fetchRows(items.map(i => ({ id: i.id })), onProgress);
  const out = new Map<string, number | null>();
  for (const i of items) {
    const row = rows[`id:${i.id}`];
    const price = !row ? null : i.finish === "etched" ? row[2] ?? row[1] ?? row[0] : pick(row, i.finish === "foil");
    out.set(`${i.id}|${i.finish ?? ""}`, price);
  }
  return { prices: out, complete };
}

export const formatPrice = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
