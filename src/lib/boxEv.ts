// Expected value of a booster pack: what its cards are worth on average at today's TCGplayer
// market prices. Server-only.
//
// Pack contents come from MTGJSON's booster data (https://mtgjson.com/api/v5/<SET>.json.gz),
// which lists every pack layout a product can print, how often each one prints, and the
// weighted sheet each slot draws from (rare/mythic, wildcard, foil, special guests, showcase...).
// For each card, that gives the expected number of copies per pack:
//   sum over layouts (layout weight / all layouts) x copies of the sheet in it x (card weight / sheet weight)
// Multiply by the card's market price (foil price for foil sheets) and add it all up.
// The headline counts only cards worth BULK_FLOOR or more: TCGplayer's market price for a common
// is about $0.20, but nobody pays that for bulk, and counting it would nearly double the figure.
// It is an average over a huge number of packs. A real box swings well above or below it.

import { gunzipSync } from "node:zlib";
import { TCGCSV_TTL_MS, tcgPrices, tcgProducts } from "@/lib/tcgcsv";

const MTGJSON = "https://mtgjson.com/api/v5";
const UA = "CardcaptorStuart/1.0 (+https://ccs.stuartrampy.me)";
/** Cards under this price rarely sell on their own, so the headline value leaves them out. */
export const BULK_FLOOR = 1;

interface MjCard { uuid: string; name: string; number: string; rarity: string; identifiers: { tcgplayerProductId?: string } }
interface MjSheet { cards: Record<string, number>; foil?: boolean; totalWeight: number }
interface MjBooster { boosters: { contents: Record<string, number>; weight: number }[]; boostersTotalWeight: number; sheets: Record<string, MjSheet>; sourceSetCodes?: string[] }
interface MjSet { code: string; name: string; tcgplayerGroupId?: number; cards: MjCard[]; booster?: Record<string, MjBooster> }

interface CardRef { name: string; rarity: string; productId?: number }
/** What a set file contributes: its own cards, its TCGplayer group, and its pack layouts. */
interface SetData { code: string; groupId?: number; cards: Map<string, CardRef>; booster: Record<string, MjBooster> }

const setCache = new Map<string, { at: number; value: Promise<SetData> }>();

function loadSet(code: string): Promise<SetData> {
  const hit = setCache.get(code);
  if (hit && Date.now() - hit.at < TCGCSV_TTL_MS) return hit.value;
  const value = (async () => {
    const res = await fetch(`${MTGJSON}/${encodeURIComponent(code)}.json.gz`, {
      headers: { "User-Agent": UA },
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });
    if (res.status === 404) throw new NotFound(`MTGJSON has no set ${code}`);
    if (!res.ok) throw new Error(`mtgjson.com answered ${res.status}`);
    const data = (JSON.parse(gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf-8")) as { data: MjSet }).data;
    const cards = new Map<string, CardRef>();
    for (const c of data.cards) {
      const id = Number(c.identifiers.tcgplayerProductId);
      cards.set(c.uuid, { name: c.name, rarity: c.rarity, ...(id ? { productId: id } : {}) });
    }
    // Keep only the pack layouts; the rest of the file (rulings, translations...) is dropped here.
    return { code: data.code, groupId: data.tcgplayerGroupId, cards, booster: data.booster ?? {} };
  })();
  setCache.set(code, { at: Date.now(), value });
  value.catch(() => setCache.delete(code));
  return value;
}

export class NotFound extends Error {}

/** MTGJSON booster names to try for a box type, best first. */
export function boosterKindsFor(type: string): string[] {
  const t = type.toLowerCase();
  if (/cube|jumpstart|beginner/.test(t)) return [];
  if (t.includes("collector")) return ["collector"];
  if (t.includes("set booster")) return ["set"];
  if (t.includes("draft")) return ["draft", "play"];
  return ["play", "draft"];
}

export interface EvCard {
  name: string;
  rarity: string;
  foil: boolean;
  price: number;
  /** Expected copies in one pack */
  perPack: number;
  url?: string;
  imageUrl?: string;
}

export interface BoxEv {
  set: string;
  booster: string;
  /** Expected market value of one pack, counting cards worth bulkFloor or more */
  perPack: number;
  /** The same with every card at its market price, bulk included */
  allCardsPerPack: number;
  bulkFloor: number;
  /** perPack by rarity, foils on their own line */
  byRarity: { label: string; perPack: number }[];
  /** The cards that add the most value, highest first */
  top: EvCard[];
  /** Share of a pack's cards that had a price (cards with none count as $0) */
  coverage: number;
  layouts: number;
  source: string;
  fetchedAt: string;
}

const RARITY_LABEL: Record<string, string> = { mythic: "Mythic", rare: "Rare", uncommon: "Uncommon", common: "Common" };

export async function boxEv(setCode: string, type: string): Promise<BoxEv> {
  const kinds = boosterKindsFor(type);
  if (!kinds.length) throw new NotFound(`A ${type} is not opened, so it has no expected value`);
  const main = await loadSet(setCode);
  const kind = kinds.find(k => main.booster[k]);
  if (!kind) throw new NotFound(`MTGJSON has no ${kinds[0]} booster layout for ${setCode}`);
  const cfg = main.booster[kind];

  // Bonus sheets (Special Guests, Through the Ages, Mystical Archive...) live in other set files.
  const others = await Promise.all((cfg.sourceSetCodes ?? []).filter(c => c !== main.code).map(loadSet));
  const lookup = (uuid: string) => main.cards.get(uuid) ?? others.find(s => s.cards.has(uuid))?.cards.get(uuid);

  // Expected copies per pack of each card, split by foil and non-foil
  const expected = new Map<string, { uuid: string; foil: boolean; n: number }>();
  for (const b of cfg.boosters) {
    const layoutShare = b.weight / cfg.boostersTotalWeight;
    for (const [sheetName, copies] of Object.entries(b.contents)) {
      const sheet = cfg.sheets[sheetName];
      if (!sheet) continue;
      for (const [uuid, w] of Object.entries(sheet.cards)) {
        const key = `${uuid}|${sheet.foil ? 1 : 0}`;
        const e = expected.get(key) ?? { uuid, foil: !!sheet.foil, n: 0 };
        e.n += layoutShare * copies * (w / sheet.totalWeight);
        expected.set(key, e);
      }
    }
  }

  const groups = [...new Set([main, ...others].map(s => s.groupId).filter((g): g is number => !!g))].map(String);
  const [priceSets, productSets] = await Promise.all([Promise.all(groups.map(tcgPrices)), Promise.all(groups.map(tcgProducts))]);
  const priceOf = (productId: number, foil: boolean) => {
    for (const p of priceSets) {
      const v = foil ? p.foil.get(productId) ?? p.normal.get(productId) : p.normal.get(productId) ?? p.foil.get(productId);
      if (v != null) return v;
    }
    return undefined;
  };
  const products = new Map(productSets.flat().map(p => [p.productId, p]));

  let all = 0, sellable = 0, cardsAll = 0, cardsPriced = 0;
  const byRarity = new Map<string, number>();
  const contrib = new Map<string, EvCard & { value: number }>();
  for (const e of expected.values()) {
    cardsAll += e.n;
    const ref = lookup(e.uuid);
    const price = ref?.productId ? priceOf(ref.productId, e.foil) : undefined;
    if (!ref || price == null) continue;
    cardsPriced += e.n;
    const value = e.n * price;
    all += value;
    if (price < BULK_FLOOR) continue;
    sellable += value;
    const bucket = e.foil ? "Foils" : RARITY_LABEL[ref.rarity] ?? "Bonus & special";
    byRarity.set(bucket, (byRarity.get(bucket) ?? 0) + value);
    // One entry per printing: the same product can sit on several sheets
    const key = `${ref.productId}|${e.foil ? 1 : 0}`;
    const prev = contrib.get(key);
    if (prev) { prev.perPack += e.n; prev.value += value; continue; }
    const product = products.get(ref.productId!);
    contrib.set(key, {
      name: product?.name ?? ref.name, rarity: ref.rarity, foil: e.foil, price, perPack: e.n, value,
      ...(product?.url ? { url: product.url } : {}), ...(product?.imageUrl ? { imageUrl: product.imageUrl } : {}),
    });
  }

  const order = ["Mythic", "Rare", "Bonus & special", "Uncommon", "Common", "Foils"];
  return {
    set: main.code,
    booster: kind,
    perPack: sellable,
    allCardsPerPack: all,
    bulkFloor: BULK_FLOOR,
    byRarity: [...byRarity].map(([label, v]) => ({ label, perPack: v })).sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label)),
    top: [...contrib.values()].sort((a, b) => b.value - a.value).slice(0, 12).map(({ name, rarity, foil, price, perPack, url, imageUrl }) => ({ name, rarity, foil, price, perPack, url, imageUrl })),
    coverage: cardsAll ? cardsPriced / cardsAll : 0,
    layouts: cfg.boosters.length,
    source: "Pack layouts: MTGJSON. Prices: TCGplayer market (via tcgcsv.com).",
    fetchedAt: new Date().toISOString(),
  };
}
