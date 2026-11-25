import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/market-price?set=FDN&type=Play%20Booster%20Box
 *
 * Current TCGplayer market price for one sealed box, read from tcgcsv.com: a free public mirror
 * of TCGplayer's catalog and prices, refreshed once a day around 20:00 UTC. TCGplayer no longer
 * issues API keys, so this is the no-key route. Each server instance keeps a set's products and
 * prices for 12 hours and the response carries a CDN cache header, so tcgcsv sees roughly one
 * request per set per half day.
 */

const TCGCSV = "https://tcgcsv.com/tcgplayer/1"; // category 1 = Magic: The Gathering
const UA = "CardcaptorStuart/1.0 (+https://ccs.stuartrampy.me)";
const TTL_MS = 12 * 60 * 60 * 1000;

interface Group { groupId: number; name: string; abbreviation: string | null; isSupplemental?: boolean }
interface Product { productId: number; name: string; url?: string }
interface Price { productId: number; marketPrice: number | null; subTypeName: string | null }

export interface MarketPrice {
  set: string;
  productId: number;
  productName: string;
  marketPrice: number;
  url: string;
  source: "TCGplayer (via tcgcsv.com)";
  fetchedAt: string;
}

let groupsCache: { at: number; groups: Group[] } | null = null;
const setCache = new Map<string, { at: number; products: Product[]; prices: Map<number, number> }>();

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`tcgcsv answered ${res.status}`);
  return (await res.json()) as T;
}

async function groups(): Promise<Group[]> {
  if (groupsCache && Date.now() - groupsCache.at < TTL_MS) return groupsCache.groups;
  const data = await getJson<{ results: Group[] }>(`${TCGCSV}/groups`);
  groupsCache = { at: Date.now(), groups: data.results };
  return data.results;
}

async function setData(groupId: number) {
  const key = String(groupId);
  const hit = setCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit;
  const [products, prices] = await Promise.all([
    getJson<{ results: Product[] }>(`${TCGCSV}/${groupId}/products`),
    getJson<{ results: Price[] }>(`${TCGCSV}/${groupId}/prices`),
  ]);
  const priceMap = new Map<number, number>();
  for (const p of prices.results) {
    if (p.marketPrice != null && (p.subTypeName == null || p.subTypeName === "Normal")) priceMap.set(p.productId, p.marketPrice);
  }
  // Keep only sealed boxes and displays; a set's products also include every single card.
  const sealed = products.results.filter(p => /\b(display|box)\b/i.test(p.name));
  const entry = { at: Date.now(), products: sealed, prices: priceMap };
  setCache.set(key, entry);
  return entry;
}

/** Which TCGplayer product kinds stand for a box type, best first. */
function kindsFor(type: string): string[] {
  const t = type.toLowerCase();
  if (t.includes("collector")) return ["Collector Booster"];
  if (t.includes("set booster")) return ["Set Booster"];
  if (t.includes("jumpstart")) return ["Jumpstart Booster"];
  if (t.includes("beginner")) return ["Beginner"];
  if (t.includes("draft booster")) return ["Draft Booster", "Play Booster"];
  return ["Play Booster", "Draft Booster"];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req: NextRequest) {
  const set = (req.nextUrl.searchParams.get("set") ?? "").split(",")[0].trim().toUpperCase();
  const type = (req.nextUrl.searchParams.get("type") ?? "Play Booster Box").slice(0, 40);
  if (!/^[A-Z0-9]{2,6}$/.test(set)) {
    return NextResponse.json({ error: "Give a set code, like ?set=FDN" }, { status: 400 });
  }
  try {
    const candidates = (await groups()).filter(g => (g.abbreviation ?? "").toUpperCase() === set);
    const group = candidates.find(g => !g.isSupplemental) ?? candidates[0];
    if (!group) return NextResponse.json({ error: `TCGplayer has no set ${set}` }, { status: 404 });
    const { products, prices } = await setData(group.groupId);
    for (const kind of kindsFor(type)) {
      const re = new RegExp(`${escapeRe(kind)} (Display|Box)\\b`, "i");
      const product = products.find(p => re.test(p.name) && !/case|bundle|master|sample/i.test(p.name) && prices.has(p.productId));
      if (product) {
        const body: MarketPrice = {
          set,
          productId: product.productId,
          productName: product.name,
          marketPrice: prices.get(product.productId)!,
          url: product.url ?? `https://www.tcgplayer.com/product/${product.productId}`,
          source: "TCGplayer (via tcgcsv.com)",
          fetchedAt: new Date().toISOString(),
        };
        return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400" } });
      }
    }
    return NextResponse.json({ error: `No market price for a ${type} of ${set}` }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: `Price lookup failed: ${(e as Error).message}` }, { status: 502 });
  }
}
