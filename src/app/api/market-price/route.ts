import { NextRequest, NextResponse } from "next/server";
import { tcgGroupFor, tcgPrices, tcgProducts } from "@/lib/tcgcsv";

/**
 * GET /api/market-price?set=FDN&type=Play%20Booster%20Box
 *
 * Current TCGplayer market price for one sealed box, read from tcgcsv.com (see lib/tcgcsv.ts).
 * The response carries a CDN cache header, so tcgcsv sees roughly one request per set per half day.
 */

export interface MarketPrice {
  set: string;
  productId: number;
  productName: string;
  marketPrice: number;
  url: string;
  source: "TCGplayer (via tcgcsv.com)";
  fetchedAt: string;
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
    const group = await tcgGroupFor(set);
    if (!group) return NextResponse.json({ error: `TCGplayer has no set ${set}` }, { status: 404 });
    const [allProducts, prices] = await Promise.all([tcgProducts(String(group.groupId)), tcgPrices(String(group.groupId))]);
    // Only sealed boxes and displays; a set's products also include every single card.
    const products = allProducts.filter(p => /\b(display|box)\b/i.test(p.name));
    for (const kind of kindsFor(type)) {
      const re = new RegExp(`${escapeRe(kind)} (Display|Box)\\b`, "i");
      const product = products.find(p => re.test(p.name) && !/case|bundle|master|sample/i.test(p.name) && prices.normal.has(p.productId));
      if (product) {
        const body: MarketPrice = {
          set,
          productId: product.productId,
          productName: product.name,
          marketPrice: prices.normal.get(product.productId)!,
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
